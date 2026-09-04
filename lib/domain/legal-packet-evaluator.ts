import { z } from "zod";

import {
  corridorRequirementDefinitions,
  type CorridorRequirementManifest,
} from "./corridor-requirement-manifest";
import { evaluateLegalTime, legalTimeInputSchema, type LegalTimeEvaluation } from "./legal-time";
import {
  evidenceAutomationRunSchema,
  humanHouseholdProfileSchema,
  localDateSchema,
  originSchema,
  type ContentCatalog,
  type HumanHouseholdProfile,
} from "./schemas";

export const minorDepartureContextSchema = z
  .object({
    travelsWithLegalRepresentative: z.enum(["yes", "no", "unknown"]),
    representativeRole: z.enum([
      "parent",
      "adoptive_parent",
      "guardian",
      "custodian",
      "not_applicable",
      "unknown",
    ]),
    guardianOrCustodianAuthorityEvidence: z.enum(["present", "missing", "not_applicable", "unknown"]),
    departureObjectionStatus: z.enum(["confirmed_absent", "filed", "not_checked", "unknown"]),
    notarizedConsent: z.enum(["present", "missing", "unknown"]),
    relationshipEvidence: z.enum(["present", "missing", "not_applicable", "unknown"]),
  })
  .strict()
  .superRefine((minor, context) => {
    if (minor.travelsWithLegalRepresentative === "no") {
      if (minor.representativeRole !== "not_applicable") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["representativeRole"],
          message: "An unaccompanied child cannot declare an accompanying representative role",
        });
      }
      if (minor.guardianOrCustodianAuthorityEvidence !== "not_applicable") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianOrCustodianAuthorityEvidence"],
          message: "Representative authority evidence is not applicable without an accompanying representative",
        });
      }
    }
    if (minor.travelsWithLegalRepresentative === "unknown") {
      if (minor.representativeRole !== "unknown" || minor.guardianOrCustodianAuthorityEvidence !== "unknown") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["representativeRole"],
          message: "Unknown accompaniment requires unknown representative inputs",
        });
      }
    }
    if (minor.travelsWithLegalRepresentative === "yes") {
      if (minor.representativeRole === "not_applicable") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["representativeRole"],
          message: "Representative role cannot be not applicable when a legal representative accompanies the child",
        });
      }
      const authorityEvidenceApplies = ["guardian", "custodian"].includes(minor.representativeRole);
      if (authorityEvidenceApplies && minor.guardianOrCustodianAuthorityEvidence === "not_applicable") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianOrCustodianAuthorityEvidence"],
          message: "A guardian or custodian must declare authority evidence",
        });
      }
      if (minor.representativeRole === "unknown" && minor.guardianOrCustodianAuthorityEvidence !== "unknown") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianOrCustodianAuthorityEvidence"],
          message: "Unknown representative role requires unknown authority evidence",
        });
      }
      if (
        !authorityEvidenceApplies &&
        minor.representativeRole !== "unknown" &&
        minor.guardianOrCustodianAuthorityEvidence !== "not_applicable"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianOrCustodianAuthorityEvidence"],
          message: "Guardian or custodian authority evidence applies only to those roles",
        });
      }
    }
  });

const travellerCaseStateSchema = z.object({
  travellerId: z.string().regex(/^(adult|child)-[1-9][0-9]*$/),
  state: z.enum(["confirmed", "missing", "unknown"]),
}).strict();

const uniqueTravellerStatesSchema = z.array(travellerCaseStateSchema).superRefine((items, context) => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.travellerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "travellerId"],
        message: `Duplicate traveller case state: ${item.travellerId}`,
      });
    }
    seen.add(item.travellerId);
  });
});

export const legalJourneyAssessmentInputSchema = z
  .object({
    origin: originSchema,
    plannedDepartureOn: localDateSchema.optional(),
    entryPoint: z.string().trim().min(1).optional(),
    transit: z.discriminatedUnion("state", [
      z.object({ state: z.literal("direct") }).strict(),
      z.object({ state: z.literal("unknown") }).strict(),
      z.object({
          state: z.literal("with_transit"),
          jurisdictions: z.array(z.string().trim().min(1)).min(1),
          transferMode: z.enum(["airside", "landside_or_self_transfer", "unknown"]),
          singleTicket: z.enum(["yes", "no", "unknown"]),
          baggageCheckedThrough: z.enum(["yes", "no", "not_applicable", "unknown"]),
          transitEntryPermission: z.enum(["present", "missing", "not_applicable", "unknown"]),
        }).strict(),
    ]).superRefine((transit, context) => {
        if (transit.state === "with_transit") {
          const requiresEntryPermission = transit.transferMode === "landside_or_self_transfer"
            || transit.singleTicket === "no"
            || transit.baggageCheckedThrough === "no";
          if (requiresEntryPermission && transit.transitEntryPermission === "not_applicable") {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["transitEntryPermission"],
              message: "A landside or self-transfer itinerary cannot mark transit entry permission as not applicable",
            });
          }
          if (
            transit.transferMode === "airside" &&
            transit.singleTicket === "yes" &&
            ["yes", "not_applicable"].includes(transit.baggageCheckedThrough) &&
            transit.transitEntryPermission !== "not_applicable"
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["transitEntryPermission"],
              message: "A confirmed airside itinerary must mark transit entry permission as not applicable",
            });
          }
        }
      }),
    minors: z.tuple([minorDepartureContextSchema, minorDepartureContextSchema]),
    funds: z.object({
      allocation: z.enum(["individual", "household_pool", "unknown"]),
      travellerCoverage: uniqueTravellerStatesSchema,
    }).strict().optional(),
    registrationCoverage: uniqueTravellerStatesSchema.optional(),
    legalTime: legalTimeInputSchema.optional(),
  })
  .strict();

type TravellerAssessment = {
  travellerId: string;
  kind: "adult" | "child";
  state: "ready" | "missing_documents" | "not_evaluated" | "blocked";
  reasonCodes: string[];
};

export type LegalPacketEvaluation = {
  state: "current" | "incomplete" | "blocked";
  reasonCodes: string[];
  slots: Array<{
    requirementId: string;
    origin?: string;
    state: "current" | "incomplete" | "blocked";
    reasonCodes: string[];
  }>;
  household: {
    state: "ready" | "missing_documents" | "not_evaluated" | "blocked";
    travellers: TravellerAssessment[];
  };
  legalTime: LegalTimeEvaluation | null;
  caseChecks: {
    transit: CaseCheck;
    entryPoint: CaseCheck;
    funds: CaseCheck;
    registration: CaseCheck;
  };
  corridorReadinessCeiling: "plan_with_verification";
};

type CaseCheck = {
  state: "current" | "incomplete" | "blocked";
  reasonCodes: string[];
};

function currentDecisionMap(run: z.infer<typeof evidenceAutomationRunSchema>) {
  return new Map(run.decisions.map((decision) => [decision.claimId, decision]));
}

function expectedTravellerIds(household?: HumanHouseholdProfile) {
  if (!household) return [];
  return [
    ...household.adults.map((_, index) => `adult-${index + 1}`),
    ...household.children.map((_, index) => `child-${index + 1}`),
  ];
}

function evaluateCoverage(
  expectedIds: string[],
  declarations: Array<{ travellerId: string; state: "confirmed" | "missing" | "unknown" }> | undefined,
  reasonPrefix: "funds" | "registration",
): CaseCheck {
  if (expectedIds.length === 0) {
    return { state: "incomplete", reasonCodes: [`${reasonPrefix}_household_not_supplied`] };
  }
  if (!declarations) {
    return { state: "incomplete", reasonCodes: [`${reasonPrefix}_coverage_not_supplied`] };
  }
  const expected = new Set(expectedIds);
  const actual = new Map(declarations.map((item) => [item.travellerId, item.state]));
  const reasons: string[] = [];
  for (const travellerId of actual.keys()) {
    if (!expected.has(travellerId)) reasons.push(`${reasonPrefix}_unexpected_traveller:${travellerId}`);
  }
  for (const travellerId of expectedIds) {
    const state = actual.get(travellerId);
    if (state === undefined) reasons.push(`${reasonPrefix}_traveller_not_declared:${travellerId}`);
    if (state === "missing") reasons.push(`${reasonPrefix}_missing:${travellerId}`);
    if (state === "unknown") reasons.push(`${reasonPrefix}_unknown:${travellerId}`);
  }
  const blocked = reasons.some((reason) =>
    reason.startsWith(`${reasonPrefix}_missing:`) || reason.startsWith(`${reasonPrefix}_unexpected_traveller:`)
  );
  return {
    state: blocked ? "blocked" : reasons.length ? "incomplete" : "current",
    reasonCodes: reasons.length ? reasons : [`${reasonPrefix}_coverage_confirmed_per_traveller`],
  };
}

function evaluateTravellerPassports(
  household: HumanHouseholdProfile,
  plannedDepartureOn: string | undefined,
  minors: z.infer<typeof minorDepartureContextSchema>[],
): TravellerAssessment[] {
  const travellers = [
    ...household.adults.map((adult, index) => ({
      id: `adult-${index + 1}`,
      kind: "adult" as const,
      passport: adult.ordinaryPassport,
    })),
    ...household.children.map((child, index) => ({
      id: `child-${index + 1}`,
      kind: "child" as const,
      passport: child.ordinaryPassport,
      minor: minors[index],
    })),
  ];

  return travellers.map((traveller) => {
    const missing: string[] = [];
    const unknown: string[] = [];
    const blocked: string[] = [];
    if (traveller.passport.state === "missing") missing.push("ordinary_passport_missing");
    if (traveller.passport.state === "unknown") unknown.push("ordinary_passport_unknown");
    if (
      traveller.passport.state === "present" &&
      plannedDepartureOn &&
      traveller.passport.expiresOn < plannedDepartureOn
    ) {
      missing.push("passport_expires_before_planned_departure");
    }
    if (traveller.kind === "child") {
      const minor = traveller.minor!;
      if (minor.departureObjectionStatus === "filed") blocked.push("minor_departure_objection_filed");
      if (minor.departureObjectionStatus === "not_checked") unknown.push("minor_departure_objection_not_checked");
      if (minor.departureObjectionStatus === "unknown") unknown.push("minor_departure_objection_unknown");
      if (minor.travelsWithLegalRepresentative === "unknown") unknown.push("minor_accompaniment_unknown");
      if (minor.travelsWithLegalRepresentative === "yes") {
        if (minor.representativeRole === "unknown") unknown.push("minor_representative_role_unknown");
        if (minor.guardianOrCustodianAuthorityEvidence === "missing") {
          unknown.push("guardian_or_custodian_authority_not_established");
        }
        if (minor.guardianOrCustodianAuthorityEvidence === "unknown") {
          unknown.push("guardian_or_custodian_authority_evidence_unknown");
        }
      }
      if (minor.travelsWithLegalRepresentative === "no") {
        if (minor.notarizedConsent === "missing") missing.push("minor_notarized_consent_missing");
        if (minor.notarizedConsent === "unknown") unknown.push("minor_notarized_consent_unknown");
      }
      if (minor.relationshipEvidence === "missing") unknown.push("relationship_evidence_requirement_unresolved");
      if (minor.relationshipEvidence === "unknown") unknown.push("relationship_evidence_unknown");
    }
    const state = blocked.length
      ? "blocked" as const
      : missing.length
        ? "missing_documents" as const
        : unknown.length
          ? "not_evaluated" as const
          : "ready" as const;
    return { travellerId: traveller.id, kind: traveller.kind, state, reasonCodes: [...blocked, ...missing, ...unknown] };
  });
}

export function evaluateLegalPacket({
  manifest,
  catalog,
  automationRun,
  origin,
  household,
  journey,
}: {
  manifest: CorridorRequirementManifest;
  catalog: ContentCatalog;
  automationRun: z.infer<typeof evidenceAutomationRunSchema>;
  origin: z.infer<typeof originSchema>;
  household?: HumanHouseholdProfile;
  journey?: z.infer<typeof legalJourneyAssessmentInputSchema>;
}): LegalPacketEvaluation {
  evidenceAutomationRunSchema.parse(automationRun);
  if (household) humanHouseholdProfileSchema.parse(household);
  if (journey) legalJourneyAssessmentInputSchema.parse(journey);
  const decisions = currentDecisionMap(automationRun);
  const packets = new Map((automationRun.proofPackets ?? []).map((packet) => [packet.id, packet]));
  const sources = new Map(catalog.sources.map((source) => [source.id, source]));
  const claims = new Map(catalog.claims.map((claim) => [claim.id, claim]));

  const legalEntries = manifest.requirements.filter(
    (entry) => entry.requirementId.startsWith("legal.") &&
      (entry.origin === undefined || entry.origin === origin),
  );
  const expectedLegalDefinitions = corridorRequirementDefinitions.filter(
    (definition) => definition.category === "legal",
  );
  const missingSlots = expectedLegalDefinitions.filter((definition) =>
    !legalEntries.some((entry) =>
      entry.requirementId === definition.id &&
      (definition.scope === "shared" || entry.origin === origin),
    ),
  );
  const route = catalog.routes.find((candidate) => candidate.id === manifest.routeId);
  const snapshot = new Map(manifest.routeClaimRevisions.map((entry) => [entry.claimId, entry.revision]));
  const slots = legalEntries.map((entry) => {
    const reasons: string[] = [];
    if (entry.status === "contradictory") reasons.push("manifest_slot_contradictory");
    if (entry.status !== "current") reasons.push(`manifest_slot_${entry.status}`);
    const lineages = new Set<string>();
    for (const claimId of entry.claimIds) {
      const claim = claims.get(claimId);
      const decision = decisions.get(claimId);
      if (!claim || !decision || decision.state !== "current") reasons.push(`claim_not_current:${claimId}`);
      if (claim && snapshot.get(claimId) !== claim.revision) reasons.push(`claim_revision_drift:${claimId}`);
      if (!decision?.proofPacketIds?.length) reasons.push(`claim_proof_missing:${claimId}`);
      for (const packetId of decision?.proofPacketIds ?? []) {
        const packet = packets.get(packetId);
        const source = packet ? sources.get(packet.sourceId) : undefined;
        if (!packet || packet.claimId !== claimId || !source) reasons.push(`invalid_proof_packet:${packetId}`);
        if (source) {
          lineages.add(source.independenceGroupId);
          const expectedJurisdiction = entry.requirementId === "legal.origin_departure_requirements"
            ? "Russia"
            : entry.requirementId === "legal.transit_and_entry_point_constraints"
              ? null
              : "Serbia";
          if (expectedJurisdiction && source.jurisdiction !== expectedJurisdiction) {
            reasons.push(`proof_jurisdiction_mismatch:${packetId}`);
          }
        }
      }
    }
    if (entry.claimIds.length === 0) reasons.push("slot_has_no_claims");
    if (lineages.size < 2) reasons.push("legal_policy_requires_two_independent_lineages");
    const blocked = reasons.includes("manifest_slot_contradictory") || reasons.some((reason) =>
      reason.startsWith("invalid_proof_packet:") ||
      reason.startsWith("proof_jurisdiction_mismatch:") ||
      reason.startsWith("claim_revision_drift:") ||
      reason.startsWith("claim_not_current:"),
    );
    return {
      requirementId: entry.requirementId,
      origin: entry.origin,
      state: blocked ? "blocked" as const : reasons.length ? "incomplete" as const : "current" as const,
      reasonCodes: reasons,
    };
  });
  for (const definition of missingSlots) {
    slots.push({
      requirementId: definition.id,
      origin: definition.scope === "origin_variant" ? origin : undefined,
      state: "blocked",
      reasonCodes: ["required_legal_manifest_slot_missing"],
    });
  }
  if (!route || route.publicationState === "withdrawn") {
    slots.push({
      requirementId: "legal.route_state",
      origin: undefined,
      state: "blocked",
      reasonCodes: [route ? "route_withdrawn" : "route_missing"],
    });
  }
  if (
    automationRun.catalogReleaseId !== catalog.releaseId ||
    manifest.catalogReleaseId !== catalog.releaseId
  ) {
    slots.push({
      requirementId: "legal.release_binding",
      origin: undefined,
      state: "blocked",
      reasonCodes: ["catalog_release_mismatch"],
    });
  }

  if (journey && journey.origin !== origin) {
    slots.push({
      requirementId: "legal.origin_consistency",
      origin,
      state: "blocked",
      reasonCodes: ["journey_origin_mismatch"],
    });
  }
  if (journey?.transit.state === "unknown") {
    slots.push({
      requirementId: "legal.transit_runtime_check",
      origin,
      state: "incomplete",
      reasonCodes: ["transit_jurisdiction_unknown"],
    });
  }

  const transitEvidenceSlot = slots.find((slot) =>
    slot.requirementId === "legal.transit_and_entry_point_constraints" && slot.origin === origin
  );
  let transitCheck: CaseCheck;
  if (!journey) {
    transitCheck = { state: "incomplete", reasonCodes: ["journey_not_supplied"] };
  } else if (journey.transit.state === "direct") {
    transitCheck = { state: "current", reasonCodes: ["direct_itinerary_no_transit"] };
  } else if (journey.transit.state === "unknown") {
    transitCheck = { state: "incomplete", reasonCodes: ["transit_jurisdiction_unknown"] };
  } else {
    const reasons: string[] = [];
    if (journey.transit.transferMode === "unknown") reasons.push("transit_transfer_mode_unknown");
    if (journey.transit.singleTicket === "unknown") reasons.push("transit_single_ticket_unknown");
    if (journey.transit.baggageCheckedThrough === "unknown") reasons.push("transit_baggage_handling_unknown");
    const needsEntryPermission = journey.transit.transferMode === "landside_or_self_transfer"
      || journey.transit.singleTicket === "no"
      || journey.transit.baggageCheckedThrough === "no";
    if (needsEntryPermission && journey.transit.transitEntryPermission === "missing") {
      reasons.push("transit_entry_permission_missing");
    } else if (needsEntryPermission && journey.transit.transitEntryPermission === "unknown") {
      reasons.push("transit_entry_permission_unknown");
    }
    if (transitEvidenceSlot?.state !== "current") reasons.push("transit_rule_evidence_not_current");
    transitCheck = {
      state: reasons.includes("transit_entry_permission_missing")
        ? "blocked"
        : reasons.length
          ? "incomplete"
          : "current",
      reasonCodes: reasons.length ? reasons : ["transit_case_confirmed"],
    };
  }

  const transitManifestEntry = manifest.requirements.find((entry) =>
    entry.requirementId === "legal.transit_and_entry_point_constraints" && entry.origin === origin
  );
  const allowedEntryPoints = (transitManifestEntry?.claimIds ?? []).flatMap((claimId) => {
    const claim = claims.get(claimId);
    return claim?.fact.kind === "entry_restriction" ? claim.fact.entryPoints : [];
  });
  let entryPointCheck: CaseCheck;
  if (!journey?.entryPoint) {
    entryPointCheck = { state: "incomplete", reasonCodes: ["entry_point_not_supplied"] };
  } else if (transitEvidenceSlot?.state !== "current" || allowedEntryPoints.length === 0) {
    entryPointCheck = { state: "incomplete", reasonCodes: ["entry_point_evidence_not_current"] };
  } else if (!allowedEntryPoints.includes(journey.entryPoint)) {
    entryPointCheck = { state: "blocked", reasonCodes: ["entry_point_not_in_current_allowed_set"] };
  } else {
    entryPointCheck = { state: "current", reasonCodes: ["entry_point_confirmed"] };
  }

  const travellers = household && journey
    ? evaluateTravellerPassports(household, journey.plannedDepartureOn, journey.minors)
    : [];
  const householdState = travellers.some((traveller) => traveller.state === "blocked")
    ? "blocked" as const
    : travellers.some((traveller) => traveller.state === "missing_documents")
      ? "missing_documents" as const
      : travellers.length === 0 || travellers.some((traveller) => traveller.state === "not_evaluated")
        ? "not_evaluated" as const
        : "ready" as const;
  const legalTime = journey?.legalTime ? evaluateLegalTime(journey.legalTime) : null;
  const travellerIds = expectedTravellerIds(household);
  let fundsCheck = evaluateCoverage(travellerIds, journey?.funds?.travellerCoverage, "funds");
  if (journey?.funds?.allocation === "unknown") {
    fundsCheck = { state: "incomplete", reasonCodes: ["funds_allocation_unknown", ...fundsCheck.reasonCodes] };
  } else if (journey?.funds?.allocation === "household_pool") {
    fundsCheck = {
      state: fundsCheck.state === "blocked" ? "blocked" : "incomplete",
      reasonCodes: ["household_funds_allocation_rule_not_established", ...fundsCheck.reasonCodes],
    };
  }
  const registrationCheck = evaluateCoverage(
    travellerIds,
    journey?.registrationCoverage,
    "registration",
  );
  const caseChecks = {
    transit: transitCheck,
    entryPoint: entryPointCheck,
    funds: fundsCheck,
    registration: registrationCheck,
  };
  const reasonCodes: string[] = [];
  if (
    slots.some((slot) => slot.state === "blocked") ||
    householdState === "blocked" ||
    legalTime?.state === "blocked" ||
    Object.values(caseChecks).some((check) => check.state === "blocked")
  ) {
    reasonCodes.push("legal_packet_blocked");
  } else if (
    slots.some((slot) => slot.state !== "current") ||
    householdState !== "ready" ||
    legalTime?.state !== "calculated" ||
    Object.values(caseChecks).some((check) => check.state !== "current")
  ) {
    reasonCodes.push("legal_packet_incomplete");
  } else {
    reasonCodes.push("legal_packet_current");
  }
  return {
    state: reasonCodes[0] === "legal_packet_blocked" ? "blocked" : reasonCodes[0] === "legal_packet_current" ? "current" : "incomplete",
    reasonCodes,
    slots,
    household: { state: householdState, travellers },
    legalTime,
    caseChecks,
    corridorReadinessCeiling: "plan_with_verification",
  };
}
