import type { CorridorRequirementManifest } from "./corridor-requirement-manifest";
import type { OperationalRecord } from "./journey-guidance";

export const first72RequirementIds = [
  "first72.accommodation_and_registration",
  "first72.arrival_transfer",
  "first72.communication_and_payment",
  "first72.food_medicine_and_healthcare",
  "first72.child_and_pet_needs",
  "first72.trusted_contact_check_in",
  "first72.failure_paths",
] as const;

export type First72RequirementId = (typeof first72RequirementIds)[number];
export type First72CoverageState = "blocked" | "not_established" | "partial" | "current";

export type First72RequirementResult = {
  requirementId: First72RequirementId;
  coverageState: First72CoverageState;
  reasons: string[];
  observedRecordIds: string[];
  absenceRecordIds: string[];
  expectedSubjects: string[];
};

export type First72PacketResult = {
  corridorId: string;
  coverageState: First72CoverageState;
  actionReady: boolean;
  actionBlockers: string[];
  nextUnresolvedRequirementId: First72RequirementId | null;
  requirements: First72RequirementResult[];
};

function expectationSubject(expected: Extract<OperationalRecord, { recordState: "not_collected" }>["expectedPayloads"][number]) {
  if (expected.kind === "first_72_hour_arrangement") return [expected.arrangementKind, expected.scenario].filter(Boolean).join(":");
  if (expected.kind === "operational_contact") return expected.contactKind;
  if (expected.kind === "health_guidance" || expected.kind === "housing_guidance") return expected.topic;
  if (expected.kind === "communication_path") return expected.channel;
  if (expected.kind === "cost_observation") return expected.component;
  if (expected.kind === "departure_observation") return expected.itineraryRole;
  return expected.kind;
}

export function evaluateFirst72Packet({
  manifest,
  operationalRecords,
  asOf,
}: {
  manifest: CorridorRequirementManifest;
  operationalRecords: OperationalRecord[];
  asOf: string;
}): First72PacketResult {
  const recordById = new Map(operationalRecords.map((record) => [record.id, record]));
  const requirements = first72RequirementIds.map((requirementId): First72RequirementResult => {
    const slot = manifest.requirements.find((entry) => entry.requirementId === requirementId && !entry.origin);
    if (!slot) {
      return {
        requirementId,
        coverageState: "not_established",
        reasons: ["manifest_slot_missing"],
        observedRecordIds: [],
        absenceRecordIds: [],
        expectedSubjects: [],
      };
    }

    const linkedRecords = slot.operationalRecordIds.flatMap((id) => {
      const record = recordById.get(id);
      return record ? [record] : [];
    });
    const absenceRecords = slot.absenceRecordIds.flatMap((id) => {
      const record = recordById.get(id);
      return record?.recordState === "not_collected" ? [record] : [];
    });
    const expiredRecords = linkedRecords.filter(
      (record) => "validUntilExclusive" in record && record.validUntilExclusive <= asOf,
    );
    const nonObservedRecords = linkedRecords.filter(
      (record) => record.recordState !== "observed",
    );
    const pendingRecords = linkedRecords.filter((record) =>
      record.recordState === "observed" && (
        (record.payload.kind === "first_72_hour_arrangement" && record.payload.confirmationState !== "confirmed") ||
        (record.payload.kind === "communication_path" && record.payload.availability !== "confirmed")
      ),
    );
    const reasons: string[] = [];

    if (slot.status === "contradictory") reasons.push("manifest_slot_contradictory");
    if (slot.status === "missing") reasons.push("manifest_slot_missing");
    if (slot.status === "incomplete") reasons.push("manifest_slot_incomplete");
    if (slot.status === "not_applicable") reasons.push("manifest_slot_not_applicable");
    if (linkedRecords.length === 0) reasons.push("operational_evidence_missing");
    if (absenceRecords.length > 0) reasons.push("expected_records_not_collected");
    if (expiredRecords.length > 0) reasons.push("operational_evidence_expired");
    if (nonObservedRecords.length > 0) reasons.push("operational_evidence_not_observed");
    if (pendingRecords.length > 0) reasons.push("operational_arrangement_pending");

    const coverageState: First72CoverageState = slot.status === "contradictory"
      ? "blocked"
      : slot.status === "missing" || slot.status === "not_applicable"
        ? "not_established"
        : slot.status === "current" && linkedRecords.length > 0 && absenceRecords.length === 0 && expiredRecords.length === 0 && nonObservedRecords.length === 0 && pendingRecords.length === 0
          ? "current"
          : "partial";

    return {
      requirementId,
      coverageState,
      reasons: [...new Set(reasons)],
      observedRecordIds: linkedRecords.filter((record) => record.recordState === "observed").map((record) => record.id),
      absenceRecordIds: absenceRecords.map((record) => record.id),
      expectedSubjects: absenceRecords.flatMap((record) => record.expectedPayloads.map(expectationSubject)),
    };
  });

  const coverageState: First72CoverageState = requirements.some((entry) => entry.coverageState === "blocked")
    ? "blocked"
    : requirements.some((entry) => entry.coverageState === "not_established")
      ? "not_established"
      : requirements.some((entry) => entry.coverageState === "partial")
        ? "partial"
        : "current";
  const actionBlockers = [
    ...(coverageState !== "current" ? ["first_72_hour_packet_not_current"] : []),
    ...(manifest.researchTargetOnly ? ["corridor_is_research_only"] : []),
    ...(!manifest.activationAuthority ? ["corridor_has_no_activation_authority"] : []),
  ];

  return {
    corridorId: manifest.id,
    coverageState,
    actionReady: coverageState === "current" && !manifest.researchTargetOnly && manifest.activationAuthority,
    actionBlockers,
    nextUnresolvedRequirementId: requirements.find((entry) => entry.coverageState !== "current")?.requirementId ?? null,
    requirements,
  };
}
