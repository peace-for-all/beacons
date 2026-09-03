import { createHash } from "node:crypto";
import type {
  DocumentRoute,
  EvidenceAutomationRun,
  EvidenceClaim,
  EvidenceCondition,
} from "./schemas";

const HOUR_MS = 60 * 60 * 1000;

export const DEFAULT_FRESHNESS_POLICY = {
  currentThroughHours: 8 * 24,
  dueThroughHours: 14 * 24,
} as const;

export type FreshnessReason =
  | "no_authoritative_automation_run"
  | "automation_decision_missing"
  | "automation_decision_duplicate"
  | "automation_release_mismatch"
  | "automation_report_invalid"
  | "automation_conflicting"
  | "automation_insufficient"
  | "automation_changed"
  | "automation_unavailable"
  | "automation_stale"
  | "automation_proof_missing"
  | "automation_proof_invalid"
  | "explicitly_expired"
  | "future_automation_run"
  | "automation_due";

export type ClaimEvidenceEvaluation = {
  condition: EvidenceCondition;
  blocking: boolean;
  reasonCodes: FreshnessReason[];
  checkedAgeHours?: number;
};

export type EvidencePublicationResult = {
  canPromote: boolean;
  canRemainPublished: boolean;
  aggregateCondition: EvidenceCondition;
  blockingClaimIds: string[];
  dueClaimIds: string[];
  claimResults: ReadonlyMap<string, ClaimEvidenceEvaluation>;
};

function parseInstant(value: string, label: string) {
  const parsed = new Date(value).valueOf();
  if (Number.isNaN(parsed)) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function textSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hasValidProofTrace(
  claim: EvidenceClaim,
  automationRun: EvidenceAutomationRun,
  decision: EvidenceAutomationRun["decisions"][number],
) {
  const expectedFactSha256 = fingerprint(claim.fact);
  const expectedApplicabilitySha256 = fingerprint(claim.applicability);
  if (
    decision.expectedFactSha256 !== expectedFactSha256 ||
    decision.expectedApplicabilitySha256 !== expectedApplicabilitySha256 ||
    !decision.proofPacketIds?.length ||
    new Set(decision.proofPacketIds).size !== decision.proofPacketIds.length
  ) return false;
  const packets = automationRun.proofPackets ?? [];
  return decision.proofPacketIds.every((packetId) => {
    const matches = packets.filter((packet) => packet.id === packetId);
    if (matches.length !== 1) return false;
    const packet = matches[0];
    const { packetSha256, ...withoutHash } = packet;
    return packet.claimId === claim.id &&
      packet.claimRevision === claim.revision &&
      packet.factSha256 === expectedFactSha256 &&
      packet.applicabilitySha256 === expectedApplicabilitySha256 &&
      decision.observationIds.includes(packet.observationId) &&
      packet.extracts.every((extract) => textSha256(extract.extract) === extract.extractSha256) &&
      fingerprint(withoutHash) === packetSha256;
  });
}

export function evaluateClaimEvidence(input: {
  claim: EvidenceClaim;
  automationRun?: EvidenceAutomationRun | null;
  catalogReleaseId?: string;
  asOf: string;
}): ClaimEvidenceEvaluation {
  const { claim, automationRun } = input;
  const asOfMs = parseInstant(input.asOf, "asOf instant");
  if (!automationRun || automationRun.schemaVersion !== 2 || automationRun.mode !== "authoritative_automation" || !automationRun.eligibleForActions) {
    return { condition: "unknown", blocking: true, reasonCodes: ["no_authoritative_automation_run"] };
  }
  const { reportSha256, ...runWithoutHash } = automationRun;
  if (fingerprint(runWithoutHash) !== reportSha256) {
    return { condition: "unknown", blocking: true, reasonCodes: ["automation_report_invalid"] };
  }
  if (input.catalogReleaseId && automationRun.catalogReleaseId !== input.catalogReleaseId) {
    return { condition: "unknown", blocking: true, reasonCodes: ["automation_release_mismatch"] };
  }
  const checkedAtMs = parseInstant(automationRun.assessedAt, "automation assessedAt instant");
  const checkedAgeHours = (asOfMs - checkedAtMs) / HOUR_MS;

  if (
    claim.effectiveUntilExclusive &&
    asOfMs >= parseInstant(claim.effectiveUntilExclusive, "effectiveUntilExclusive")
  ) {
    return {
      condition: "stale",
      blocking: true,
      reasonCodes: ["explicitly_expired"],
      checkedAgeHours,
    };
  }
  if (checkedAgeHours < 0) return { condition: "unknown", blocking: true, reasonCodes: ["future_automation_run"], checkedAgeHours };
  const decisions = automationRun.decisions.filter((decision) => decision.claimId === claim.id);
  if (decisions.length === 0) return { condition: "unknown", blocking: true, reasonCodes: ["automation_decision_missing"], checkedAgeHours };
  if (decisions.length > 1) return { condition: "unknown", blocking: true, reasonCodes: ["automation_decision_duplicate"], checkedAgeHours };
  const decision = decisions[0];
  if (decision.state === "contradictory") return { condition: "contradictory", blocking: true, reasonCodes: ["automation_conflicting"], checkedAgeHours };
  if (decision.state === "unavailable") return { condition: "unavailable", blocking: true, reasonCodes: ["automation_unavailable"], checkedAgeHours };
  if (decision.state === "changed") return { condition: "unknown", blocking: true, reasonCodes: ["automation_changed"], checkedAgeHours };
  if (decision.state === "stale") return { condition: "stale", blocking: true, reasonCodes: ["automation_stale"], checkedAgeHours };
  if (["uncovered", "candidate"].includes(decision.state)) return { condition: "unknown", blocking: true, reasonCodes: ["automation_insufficient"], checkedAgeHours };
  if (["current", "due"].includes(decision.state) && !hasValidProofTrace(claim, automationRun, decision)) {
    return { condition: "unknown", blocking: true, reasonCodes: ["automation_proof_invalid"], checkedAgeHours };
  }
  if (decision.state === "due") return { condition: "due", blocking: false, reasonCodes: ["automation_due"], checkedAgeHours };
  if (!decision.mayAutoPublish || !decision.proofPacketIds?.length) return { condition: "unknown", blocking: true, reasonCodes: ["automation_proof_missing"], checkedAgeHours };
  if (checkedAgeHours > DEFAULT_FRESHNESS_POLICY.dueThroughHours) {
    return { condition: "stale", blocking: true, reasonCodes: ["automation_stale"], checkedAgeHours };
  }
  if (checkedAgeHours > DEFAULT_FRESHNESS_POLICY.currentThroughHours) {
    return { condition: "due", blocking: false, reasonCodes: ["automation_due"], checkedAgeHours };
  }
  return { condition: "current", blocking: false, reasonCodes: [], checkedAgeHours };
}

const conditionPriority: Record<EvidenceCondition, number> = {
  current: 0,
  due: 1,
  unknown: 2,
  unavailable: 3,
  stale: 4,
  contradictory: 5,
};

export function evaluateRoutePublication(input: {
  route: DocumentRoute;
  claims: ReadonlyMap<string, EvidenceClaim>;
  automationRun?: EvidenceAutomationRun | null;
  catalogReleaseId?: string;
  asOf: string;
}): EvidencePublicationResult {
  const criticalClaims = input.route.claimIds
    .map((claimId) => input.claims.get(claimId))
    .filter(
      (claim): claim is EvidenceClaim =>
        claim !== undefined && claim.criticality === "gate",
    );
  const missingClaimIds = input.route.claimIds.filter(
    (claimId) => !input.claims.has(claimId),
  );
  const requiredFactKinds = [
    "nationality_eligibility",
    "passport_type_eligibility",
    "route_availability",
    "stay_rule",
    "traveller_applicability",
  ] as const;
  const missingFactKinds = requiredFactKinds.filter(
    (kind) => !criticalClaims.some((claim) => claim.fact.kind === kind),
  );
  const singularFactKinds = [
    "nationality_eligibility",
    "passport_type_eligibility",
    "route_availability",
    "stay_rule",
  ] as const;
  const duplicateFactKinds = singularFactKinds.filter(
    (kind) =>
      criticalClaims.filter((claim) => claim.fact.kind === kind).length > 1,
  );
  const requiredPassportRequirements = [
    "ordinary_passport_present",
    "passport_validity",
  ] as const;
  const missingPassportRequirements = requiredPassportRequirements.filter(
    (kind) =>
      !criticalClaims.some(
        (claim) =>
          claim.fact.kind === "requirement" && claim.fact.requirement.kind === kind,
      ),
  );
  const duplicatePassportRequirements = requiredPassportRequirements.filter(
    (kind) =>
      criticalClaims.filter(
        (claim) =>
          claim.fact.kind === "requirement" && claim.fact.requirement.kind === kind,
      ).length > 1,
  );
  const claimResults = new Map<string, ClaimEvidenceEvaluation>();

  for (const claim of criticalClaims) {
    claimResults.set(
      claim.id,
      evaluateClaimEvidence({
        claim,
        automationRun: input.automationRun,
        catalogReleaseId: input.catalogReleaseId,
        asOf: input.asOf,
      }),
    );
  }

  const blockingClaimIds = [
    ...missingClaimIds,
    ...missingFactKinds.map((kind) => `required:${kind}`),
    ...duplicateFactKinds.map((kind) => `duplicate:${kind}`),
    ...missingPassportRequirements.map((kind) => `required:${kind}`),
    ...duplicatePassportRequirements.map((kind) => `duplicate:${kind}`),
    ...[...claimResults.entries()]
      .filter(([, result]) => result.blocking)
      .map(([claimId]) => claimId),
  ];
  const dueClaimIds = [...claimResults.entries()]
    .filter(([, result]) => result.condition === "due")
    .map(([claimId]) => claimId);
  const conditions: EvidenceCondition[] = [
    ...claimResults.values(),
  ].map((result) => result.condition);
  if (
    missingClaimIds.length > 0 ||
    missingFactKinds.length > 0 ||
    duplicateFactKinds.length > 0 ||
    missingPassportRequirements.length > 0 ||
    duplicatePassportRequirements.length > 0 ||
    criticalClaims.length === 0
  ) {
    conditions.push("unknown");
  }
  const aggregateCondition = conditions.reduce<EvidenceCondition>(
    (worst, condition) =>
      conditionPriority[condition] > conditionPriority[worst]
        ? condition
        : worst,
    "current",
  );
  const hasCurrentCriticalSet =
    criticalClaims.length > 0 &&
    missingClaimIds.length === 0 &&
    missingFactKinds.length === 0 &&
    duplicateFactKinds.length === 0 &&
    missingPassportRequirements.length === 0 &&
    duplicatePassportRequirements.length === 0 &&
    blockingClaimIds.length === 0;

  return {
    canPromote: hasCurrentCriticalSet && dueClaimIds.length === 0,
    canRemainPublished: hasCurrentCriticalSet,
    aggregateCondition,
    blockingClaimIds,
    dueClaimIds,
    claimResults,
  };
}
