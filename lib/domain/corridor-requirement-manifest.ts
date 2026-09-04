import { z } from "zod";

import {
  evidenceAutomationReportsSchema,
  identifierSchema,
  originSchema,
  type ContentCatalog,
} from "@/lib/domain/schemas";

export const corridorRequirementCategories = [
  "legal",
  "departure",
  "first_72_hours",
  "stay_exit",
  "safety",
  "money",
  "household",
  "offline",
] as const;

const corridorRequirementDefinitionBase = [
  { id: "legal.origin_departure_requirements", category: "legal", scope: "origin_variant" },
  { id: "legal.nationality_and_passport_scope", category: "legal", scope: "shared" },
  { id: "legal.passport_presence_and_validity", category: "legal", scope: "shared" },
  { id: "legal.minor_documents", category: "legal", scope: "shared" },
  { id: "legal.entry_authorization_or_exemption", category: "legal", scope: "shared" },
  { id: "legal.transit_and_entry_point_constraints", category: "legal", scope: "origin_variant" },
  { id: "legal.border_supporting_requirements", category: "legal", scope: "shared" },
  { id: "legal.stay_counting_and_registration", category: "legal", scope: "shared" },
  { id: "legal.source_provenance_and_validity", category: "legal", scope: "shared" },
  { id: "departure.itineraries_and_fallback", category: "departure", scope: "origin_variant" },
  { id: "departure.points_modes_transfers_duration", category: "departure", scope: "origin_variant" },
  { id: "departure.transit_and_carrier_constraints", category: "departure", scope: "origin_variant" },
  { id: "departure.baggage_and_accessibility", category: "departure", scope: "origin_variant" },
  { id: "departure.fare_observation", category: "departure", scope: "origin_variant" },
  { id: "departure.operating_state", category: "departure", scope: "origin_variant" },
  { id: "first72.accommodation_and_registration", category: "first_72_hours", scope: "shared" },
  { id: "first72.arrival_transfer", category: "first_72_hours", scope: "shared" },
  { id: "first72.communication_and_payment", category: "first_72_hours", scope: "shared" },
  { id: "first72.food_medicine_and_healthcare", category: "first_72_hours", scope: "shared" },
  { id: "first72.child_and_pet_needs", category: "first_72_hours", scope: "shared" },
  { id: "first72.trusted_contact_check_in", category: "first_72_hours", scope: "shared" },
  { id: "first72.failure_paths", category: "first_72_hours", scope: "shared" },
  { id: "stay.deadlines", category: "stay_exit", scope: "shared" },
  { id: "stay.unauthorized_activities", category: "stay_exit", scope: "shared" },
  { id: "stay.longer_term_paths", category: "stay_exit", scope: "shared" },
  { id: "stay.safe_exit_route", category: "stay_exit", scope: "shared" },
  { id: "stay.reminder_margin", category: "stay_exit", scope: "shared" },
  { id: "safety.emergency_numbers", category: "safety", scope: "shared" },
  { id: "safety.consular_and_lost_document", category: "safety", scope: "shared" },
  { id: "safety.medical_and_insurance_contacts", category: "safety", scope: "shared" },
  { id: "safety.failure_paths", category: "safety", scope: "shared" },
  { id: "safety.local_laws_and_hazards", category: "safety", scope: "shared" },
  { id: "safety.contact_metadata_and_offline_copy", category: "safety", scope: "shared" },
  { id: "money.cost_components", category: "money", scope: "origin_variant" },
  { id: "money.first_72_hour_range", category: "money", scope: "origin_variant" },
  { id: "money.first_30_day_range", category: "money", scope: "origin_variant" },
  { id: "money.assumptions_and_exchange", category: "money", scope: "origin_variant" },
  { id: "money.payment_access", category: "money", scope: "origin_variant" },
  { id: "money.emergency_and_return_reserve", category: "money", scope: "origin_variant" },
  { id: "household.alpha_envelope", category: "household", scope: "shared" },
  { id: "household.per_traveller_readiness", category: "household", scope: "shared" },
  { id: "household.child_specific_requirements", category: "household", scope: "shared" },
  { id: "household.pet_feasibility", category: "household", scope: "shared" },
  { id: "offline.emergency_packet", category: "offline", scope: "shared" },
  { id: "offline.plan_and_evidence_snapshot", category: "offline", scope: "shared" },
  { id: "offline.expiry_and_recheck_behavior", category: "offline", scope: "shared" },
] as const satisfies readonly {
  id: string;
  category: (typeof corridorRequirementCategories)[number];
  scope: "shared" | "origin_variant";
}[];

export const corridorAuthorityPolicyIds = [
  "policy.guidance.legal_rule.v1",
  "policy.guidance.itinerary.v1",
  "policy.guidance.housing.v1",
  "policy.guidance.health.v1",
  "policy.guidance.emergency_contact.v1",
  "policy.guidance.communication.v1",
  "policy.guidance.cost.v1",
  "policy.guidance.stay_timeline.v1",
  "policy.guidance.household.v1",
  "policy.guidance.offline.v1",
] as const;

function authorityPolicyId(requirementId: string) {
  if (requirementId.startsWith("legal.")) return "policy.guidance.legal_rule.v1";
  if (requirementId === "departure.fare_observation") return "policy.guidance.cost.v1";
  if (requirementId.startsWith("departure.")) return "policy.guidance.itinerary.v1";
  if (requirementId === "first72.accommodation_and_registration") return "policy.guidance.housing.v1";
  if (requirementId === "first72.arrival_transfer") return "policy.guidance.itinerary.v1";
  if (["first72.communication_and_payment", "first72.trusted_contact_check_in"].includes(requirementId)) return "policy.guidance.communication.v1";
  if (requirementId === "first72.food_medicine_and_healthcare") return "policy.guidance.health.v1";
  if (requirementId === "first72.child_and_pet_needs") return "policy.guidance.household.v1";
  if (requirementId === "first72.failure_paths") return "policy.guidance.emergency_contact.v1";
  if (requirementId.startsWith("stay.")) return "policy.guidance.stay_timeline.v1";
  if (requirementId === "safety.local_laws_and_hazards") return "policy.guidance.legal_rule.v1";
  if (requirementId.startsWith("safety.")) return "policy.guidance.emergency_contact.v1";
  if (requirementId.startsWith("money.")) return "policy.guidance.cost.v1";
  if (requirementId.startsWith("household.")) return "policy.guidance.household.v1";
  return "policy.guidance.offline.v1";
}

const acceptedClaimKindsByRequirement: Record<string, readonly string[]> = {
  "legal.origin_departure_requirements": ["origin_departure_rule"],
  "legal.nationality_and_passport_scope": ["nationality_eligibility", "passport_type_eligibility"],
  "legal.passport_presence_and_validity": ["requirement"],
  "legal.minor_documents": ["requirement", "traveller_applicability"],
  "legal.entry_authorization_or_exemption": ["route_availability", "requirement"],
  "legal.transit_and_entry_point_constraints": ["entry_restriction", "airport_transit_rule"],
  "legal.border_supporting_requirements": ["requirement", "fee_rule"],
  "legal.stay_counting_and_registration": ["stay_rule", "arrival_registration"],
  "legal.source_provenance_and_validity": ["nationality_eligibility", "passport_type_eligibility", "route_availability", "stay_rule", "requirement", "traveller_applicability", "arrival_registration", "application_timing", "entry_restriction", "airport_transit_rule", "per_traveller_application", "qualifying_purpose", "fee_rule", "origin_departure_rule"],
  "first72.accommodation_and_registration": ["arrival_registration", "requirement"],
  "stay.deadlines": ["stay_rule", "arrival_registration", "application_timing"],
  "household.alpha_envelope": ["traveller_applicability"],
  "household.per_traveller_readiness": ["traveller_applicability", "requirement", "nationality_eligibility", "passport_type_eligibility", "route_availability"],
  "household.child_specific_requirements": ["traveller_applicability", "requirement"],
};

function legalSemanticCoverageIssue(
  requirementId: string,
  claimIds: string[],
  claims: Map<string, ContentCatalog["claims"][number]>,
  routeClaimIds: string[],
) {
  const boundClaims = claimIds.map((claimId) => claims.get(claimId)).filter(Boolean) as ContentCatalog["claims"];
  const kinds = new Set(boundClaims.map((claim) => claim.fact.kind));
  if (requirementId === "legal.origin_departure_requirements") {
    const rules = new Set(boundClaims.flatMap((claim) =>
      claim.fact.kind === "origin_departure_rule" ? [claim.fact.rule] : [],
    ));
    const required = [
      "valid_travel_document",
      "child_own_valid_travel_document",
      "child_with_legal_representative_if_no_objection",
      "unaccompanied_child_notarized_consent",
      "representative_objection_scope_and_withdrawal",
      "court_resolution_if_disputed",
    ];
    if (required.some((rule) => !rules.has(rule as never))) return "the complete Russian adult and child departure rule set";
  }
  if (
    requirementId === "legal.nationality_and_passport_scope" &&
    !(kinds.has("nationality_eligibility") && kinds.has("passport_type_eligibility"))
  ) return "nationality and ordinary-passport facts";
  if (requirementId === "legal.passport_presence_and_validity") {
    const requirements = boundClaims.flatMap((claim) => claim.fact.kind === "requirement" ? [claim.fact.requirement.kind] : []);
    if (!(requirements.includes("ordinary_passport_present") && requirements.includes("passport_validity"))) {
      return "passport-presence and passport-validity facts";
    }
  }
  if (requirementId === "legal.entry_authorization_or_exemption" && !kinds.has("route_availability")) {
    return "an entry-authorization or exemption fact";
  }
  if (
    requirementId === "legal.transit_and_entry_point_constraints" &&
    !(kinds.has("entry_restriction") && kinds.has("airport_transit_rule"))
  ) {
    return "explicit airport-transit and Serbian entry-point facts";
  }
  if (requirementId === "legal.border_supporting_requirements") {
    const documents = new Set(boundClaims.flatMap((claim) =>
      claim.fact.kind === "requirement" && claim.fact.requirement.kind === "declared_document"
        ? [claim.fact.requirement.documentKind]
        : [],
    ));
    const required = ["proof_of_funds", "insurance", "accommodation", "return_ticket"] as const;
    if (required.some((document) => !documents.has(document))) return "funds, insurance, accommodation, and exact return-ticket facts";
  }
  if (requirementId === "legal.stay_counting_and_registration") {
    const registrationParties = new Set(boundClaims.flatMap((claim) =>
      claim.fact.kind === "arrival_registration" ? [claim.fact.responsibleParty] : [],
    ));
    if (
      !kinds.has("stay_rule") ||
      !registrationParties.has("accommodation_provider_or_host") ||
      !registrationParties.has("traveller_when_self_arranged")
    ) return "stay-counting plus host and self-arranged registration facts";
  }
  if (
    requirementId === "legal.source_provenance_and_validity" &&
    (claimIds.length !== routeClaimIds.length || routeClaimIds.some((claimId) => !claimIds.includes(claimId)))
  ) return "the exact route claim snapshot";
  return null;
}

export const corridorRequirementDefinitions = corridorRequirementDefinitionBase.map(
  (definition) => ({
    ...definition,
    authorityPolicyId: authorityPolicyId(definition.id),
    acceptedClaimKinds: acceptedClaimKindsByRequirement[definition.id] ?? [],
    criticality:
      definition.id === "household.pet_feasibility"
        ? ("optional" as const)
        : ("required" as const),
  }),
);

const workstreamSchema = z.enum([
  "source",
  "schema",
  "extractor",
  "evaluator",
  "transport",
  "cost",
  "safety",
  "operations",
  "product",
]);

const remainingKindSchema = z.enum(["evidence_gap", "runtime_input"]);

const inventoryStatusSchema = z.enum([
  "current",
  "incomplete",
  "contradictory",
  "missing",
  "not_applicable",
]);

export const corridorRequirementEntrySchema = z
  .object({
    requirementId: identifierSchema,
    origin: originSchema.optional(),
    status: inventoryStatusSchema,
    claimIds: z.array(identifierSchema).default([]),
    operationalRecordIds: z.array(identifierSchema).default([]),
    gap: z
      .object({
        summary: z.string().trim().min(1),
        workstreams: z.array(workstreamSchema).min(1),
        remainingKinds: z.array(remainingKindSchema).min(1).optional(),
      })
      .strict()
      .optional(),
    notApplicable: z
      .object({
        reason: z.string().trim().min(1),
        decisionId: identifierSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (new Set(entry.claimIds).size !== entry.claimIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["claimIds"], message: "Claim bindings must be unique" });
    }
    if (new Set(entry.operationalRecordIds).size !== entry.operationalRecordIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["operationalRecordIds"], message: "Operational record bindings must be unique" });
    }
    if (entry.gap && new Set(entry.gap.workstreams).size !== entry.gap.workstreams.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["gap", "workstreams"], message: "Gap workstreams must be unique" });
    }
    if (entry.gap?.remainingKinds && new Set(entry.gap.remainingKinds).size !== entry.gap.remainingKinds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["gap", "remainingKinds"], message: "Gap remaining kinds must be unique" });
    }
    const evidenceBindingCount = entry.claimIds.length + entry.operationalRecordIds.length;
    if (entry.status === "current" && (evidenceBindingCount === 0 || entry.gap || entry.notApplicable)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["status"], message: "A current slot needs evidence bindings and cannot retain a gap" });
    }
    if (["incomplete", "contradictory"].includes(entry.status) && (evidenceBindingCount === 0 || !entry.gap || entry.notApplicable)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["status"], message: "An incomplete or contradictory slot needs evidence bindings and gap work" });
    }
    if (entry.status === "missing" && (evidenceBindingCount !== 0 || !entry.gap || entry.notApplicable)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["status"], message: "A missing slot cannot bind evidence and must record gap work" });
    }
    if (entry.status === "not_applicable" && (evidenceBindingCount !== 0 || entry.gap || !entry.notApplicable)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["status"], message: "Not applicable needs a structured decision and no evidence or gap binding" });
    }
    if (entry.requirementId.startsWith("legal.") && entry.gap && !entry.gap.remainingKinds) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["gap", "remainingKinds"], message: "Every unresolved legal slot must distinguish evidence gaps from runtime inputs" });
    }
  });

export const corridorRequirementManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    version: z.number().int().positive(),
    requirementPolicyVersion: z.literal("corridor-alpha-v1"),
    catalogReleaseId: identifierSchema,
    authoritativeRunId: identifierSchema,
    routeId: identifierSchema,
    researchTargetOnly: z.literal(true),
    activationAuthority: z.literal(false),
    stage3Closure: z
      .object({
        status: z.literal("closed_research_scope"),
        closedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        actionReady: z.literal(false),
      })
      .strict(),
    decisionRecord: z.string().regex(/^specs\/[a-z0-9._/-]+\.md$/),
    household: z
      .object({
        nationality: z.literal("RU"),
        passportType: z.literal("ordinary"),
        minimumAdults: z.literal(1),
        maximumAdults: z.literal(2),
        childCount: z.literal(2),
        childAgeRange: z.object({ minInclusive: z.literal(6), maxInclusive: z.literal(17) }).strict(),
      })
      .strict(),
    origins: z.array(originSchema).length(2),
    routeClaimRevisions: z.array(z.object({ claimId: identifierSchema, revision: z.number().int().positive() }).strict()),
    requirements: z.array(corridorRequirementEntrySchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (new Set(manifest.origins).size !== 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["origins"], message: "The corridor needs distinct Moscow and Saint Petersburg variants" });
    }
    if (new Set(manifest.routeClaimRevisions.map((entry) => entry.claimId)).size !== manifest.routeClaimRevisions.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["routeClaimRevisions"], message: "Route claim revisions must be unique" });
    }
  });

export const corridorRequirementManifestCollectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    manifests: z.array(corridorRequirementManifestSchema).min(1),
  })
  .strict();

type ManifestCollection = z.infer<typeof corridorRequirementManifestCollectionSchema>;
type AutomationReports = z.infer<typeof evidenceAutomationReportsSchema>;

const requirementKey = (requirementId: string, origin?: string) =>
  `${requirementId}|${origin ?? "shared"}`;

export function summarizeCorridorManifest(manifest: z.infer<typeof corridorRequirementManifestSchema>) {
  const statuses = Object.fromEntries(
    inventoryStatusSchema.options.map((status) => [status, manifest.requirements.filter((entry) => entry.status === status).length]),
  ) as Record<z.infer<typeof inventoryStatusSchema>, number>;
  const criticalityById = new Map<string, "required" | "optional">(
    corridorRequirementDefinitions.map((definition) => [definition.id, definition.criticality]),
  );
  return {
    total: manifest.requirements.length,
    required: manifest.requirements.filter((entry) => criticalityById.get(entry.requirementId) === "required").length,
    optional: manifest.requirements.filter((entry) => criticalityById.get(entry.requirementId) === "optional").length,
    statuses,
  };
}

export function summarizeLegalStageClosure(manifest: z.infer<typeof corridorRequirementManifestSchema>) {
  const legal = manifest.requirements.filter((entry) => entry.requirementId.startsWith("legal."));
  const unresolved = legal.filter((entry) => entry.status !== "current" && entry.status !== "not_applicable");
  const unclassified = unresolved.filter((entry) => !entry.gap?.remainingKinds?.length);
  return {
    current: legal.filter((entry) => entry.status === "current").length,
    incomplete: legal.filter((entry) => entry.status === "incomplete").length,
    contradictory: legal.filter((entry) => entry.status === "contradictory").length,
    missing: legal.filter((entry) => entry.status === "missing").length,
    evidenceGapSlots: unresolved.filter((entry) => entry.gap?.remainingKinds?.includes("evidence_gap")).length,
    runtimeInputSlots: unresolved.filter((entry) => entry.gap?.remainingKinds?.includes("runtime_input")).length,
    unclassifiedSlots: unclassified.length,
    researchClosureReady: unclassified.length === 0 && !legal.some((entry) => ["missing", "contradictory"].includes(entry.status)),
    actionReady: legal.every((entry) => ["current", "not_applicable"].includes(entry.status)),
  };
}

export function validateCorridorRequirementManifests({
  collection,
  catalog,
  evidenceReports,
}: {
  collection: ManifestCollection;
  catalog: ContentCatalog;
  evidenceReports: AutomationReports;
}) {
  const manifestIds = new Set<string>();
  const routeIds = new Set<string>();

  collection.manifests.forEach((manifest) => {
    if (manifestIds.has(manifest.id)) throw new Error(`Duplicate corridor manifest ID: ${manifest.id}`);
    if (routeIds.has(manifest.routeId)) throw new Error(`A route can have only one active corridor manifest: ${manifest.routeId}`);
    manifestIds.add(manifest.id);
    routeIds.add(manifest.routeId);

    if (manifest.catalogReleaseId !== catalog.releaseId) {
      throw new Error(`Corridor manifest ${manifest.id} targets ${manifest.catalogReleaseId}, not current release ${catalog.releaseId}`);
    }
    const route = catalog.routes.find((candidate) => candidate.id === manifest.routeId);
    if (!route) throw new Error(`Corridor manifest ${manifest.id} references unknown route ${manifest.routeId}`);
    if (route.publicationState !== "candidate") {
      throw new Error(`Research-target corridor ${manifest.id} must remain a candidate`);
    }
    const eligibleRuns = evidenceReports.runs.filter(
      (run) => run.catalogReleaseId === catalog.releaseId && run.mode === "authoritative_automation" && run.eligibleForActions,
    );
    const authoritativeRun = eligibleRuns.at(-1);
    if (!authoritativeRun || authoritativeRun.id !== manifest.authoritativeRunId) {
      throw new Error(`Corridor manifest ${manifest.id} must pin the latest authoritative run for ${catalog.releaseId}`);
    }
    const decisions = new Map(authoritativeRun.decisions.map((decision) => [decision.claimId, decision]));
    const claims = new Map(catalog.claims.map((claim) => [claim.id, claim]));

    const expectedSnapshot = route.claimIds.map((claimId) => {
      const claim = claims.get(claimId);
      if (!claim) throw new Error(`Route ${route.id} references unknown claim ${claimId}`);
      return `${claimId}@${claim.revision}`;
    }).sort();
    const actualSnapshot = manifest.routeClaimRevisions.map((entry) => `${entry.claimId}@${entry.revision}`).sort();
    if (expectedSnapshot.join("|") !== actualSnapshot.join("|")) {
      throw new Error(`Corridor manifest ${manifest.id} must snapshot every current route claim revision exactly once`);
    }

    const expectedRequirements = corridorRequirementDefinitions.flatMap((definition) =>
      definition.scope === "shared"
        ? [requirementKey(definition.id)]
        : manifest.origins.map((origin) => requirementKey(definition.id, origin)),
    ).sort();
    const actualRequirements = manifest.requirements.map((entry) => requirementKey(entry.requirementId, entry.origin)).sort();
    if (new Set(actualRequirements).size !== actualRequirements.length) {
      throw new Error(`Corridor manifest ${manifest.id} has duplicate requirement slots`);
    }
    if (expectedRequirements.join("|") !== actualRequirements.join("|")) {
      throw new Error(`Corridor manifest ${manifest.id} must contain the complete versioned requirement set`);
    }

    for (const entry of manifest.requirements) {
      for (const claimId of entry.claimIds) {
        if (!route.claimIds.includes(claimId)) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} binds claim ${claimId} outside route ${route.id}`);
        }
        const definition = corridorRequirementDefinitions.find((candidate) => candidate.id === entry.requirementId)!;
        const claim = claims.get(claimId)!;
        if (!definition.acceptedClaimKinds.includes(claim.fact.kind)) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} cannot bind claim kind ${claim.fact.kind}`);
        }
        if (
          entry.origin &&
          claim.applicability.applicationOrigins &&
          !claim.applicability.applicationOrigins.includes(entry.origin)
        ) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} binds claim ${claimId} outside its origin applicability`);
        }
      }
      const states = entry.claimIds.map((claimId) => decisions.get(claimId)?.state);
      if (states.some((state) => !state)) {
        throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} lacks an authoritative decision for a bound claim`);
      }
      if (entry.status === "current" && states.some((state) => state !== "current")) {
        throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} cannot be current while bound evidence is not current`);
      }
      if (entry.status === "current" && entry.requirementId.startsWith("legal.")) {
        const missingSemantics = legalSemanticCoverageIssue(entry.requirementId, entry.claimIds, claims, route.claimIds);
        if (missingSemantics) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} cannot be current without ${missingSemantics}`);
        }
        if (entry.requirementId === "legal.origin_departure_requirements") {
          const proofPackets = new Map((authoritativeRun.proofPackets ?? []).map((packet) => [packet.id, packet]));
          const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
          const lineages = new Set(entry.claimIds.flatMap((claimId) =>
            (decisions.get(claimId)?.proofPacketIds ?? []).flatMap((packetId) => {
              const packet = proofPackets.get(packetId);
              const source = packet ? sourceById.get(packet.sourceId) : undefined;
              return source?.jurisdiction === "Russia" ? [source.independenceGroupId] : [];
            }),
          ));
          if (lineages.size < 2) {
            throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} cannot be current without two independent Russian lineages`);
          }
        }
      }
      if (entry.status === "contradictory" && !states.includes("contradictory")) {
        throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} must bind an authoritative contradiction`);
      }
    }
    const stageClosure = summarizeLegalStageClosure(manifest);
    if (!stageClosure.researchClosureReady) {
      throw new Error(`Stage 3 research closure for ${manifest.id} requires every legal residual to be classified and no legal slot to be missing or contradictory`);
    }
    if (stageClosure.actionReady !== manifest.stage3Closure.actionReady) {
      throw new Error(`Stage 3 closure for ${manifest.id} must report action readiness honestly`);
    }
  });
}

export type CorridorRequirementManifest = z.infer<typeof corridorRequirementManifestSchema>;
