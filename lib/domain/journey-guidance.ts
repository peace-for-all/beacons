import { z } from "zod";

import {
  corridorAuthorityPolicyIds,
  corridorRequirementCategories,
  corridorRequirementDefinitions,
  type CorridorRequirementManifest,
} from "./corridor-requirement-manifest";
import {
  ageRangeSchema,
  evidenceAutomationReportsSchema,
  identifierSchema,
  isoInstantSchema,
  localDateSchema,
  originSchema,
  semanticallyBoundLocalizedTextSchema,
  type ContentCatalog,
} from "./schemas";

export const guidanceActionStateSchema = z.enum([
  "do_this",
  "confirm_first",
  "not_established",
  "blocked",
]);

export const guidanceAuthorityClassSchema = z.enum([
  "legal_rule",
  "itinerary",
  "housing",
  "health",
  "emergency_contact",
  "communication",
  "cost",
  "stay_timeline",
  "household",
  "offline",
  "general_preparedness",
]);

export const generalPreparednessPolicyId = "policy.guidance.general_preparedness.v1";

const authorityClassByPolicyId = {
  "policy.guidance.legal_rule.v1": "legal_rule",
  "policy.guidance.itinerary.v1": "itinerary",
  "policy.guidance.housing.v1": "housing",
  "policy.guidance.health.v1": "health",
  "policy.guidance.emergency_contact.v1": "emergency_contact",
  "policy.guidance.communication.v1": "communication",
  "policy.guidance.cost.v1": "cost",
  "policy.guidance.stay_timeline.v1": "stay_timeline",
  "policy.guidance.household.v1": "household",
  "policy.guidance.offline.v1": "offline",
  [generalPreparednessPolicyId]: "general_preparedness",
} as const;

export const savedArtifactValiditySchema = z.enum(["current", "recheck", "withdrawn"]);

export const journeyStageSchema = z.enum([
  "before_departure",
  "departure",
  "arrival",
  "first_72_hours",
  "stay",
  "safe_exit",
  "offline",
]);

export const sourceRoleSchema = z.enum([
  "origin_rule",
  "origin_consular_guidance",
  "destination_law",
  "destination_official_guidance",
  "bilateral_rule",
  "transit_rule",
  "carrier_rule",
  "dated_operational_observation",
  "general_preparedness",
]);

const sourceAuthoritySchema = z.enum([
  "foreign_ministry",
  "immigration_authority",
  "official_visa_portal",
  "embassy_or_consulate",
  "official_legal_text",
  "prosecutorial_authority",
  "transport_operator",
  "cost_observation",
  "other",
]);

const sourcePrecedenceSchema = z.enum([
  "controlling_law",
  "official_rule",
  "official_guidance",
  "operational_official",
  "secondary",
]);

export const operationalRecordKindSchema = z.enum([
  "departure_observation",
  "first_72_hour_arrangement",
  "operational_contact",
  "health_guidance",
  "housing_guidance",
  "communication_path",
  "cost_observation",
  "stay_timeline_input",
  "plan_snapshot",
]);

export const guidanceAuthorityPolicySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    version: z.number().int().positive(),
    authorityClass: guidanceAuthorityClassSchema,
    permittedSourceRoles: z.array(sourceRoleSchema).min(1),
    permittedSourceAuthorities: z.array(sourceAuthoritySchema).min(1),
    permittedSourcePrecedence: z.array(sourcePrecedenceSchema).min(1),
    permittedRecordKinds: z.array(operationalRecordKindSchema),
    officialPrimaryRequired: z.boolean(),
    minimumIndependentLineages: z.number().int().nonnegative(),
    operationalObservationsAllowed: z.boolean(),
    mayEmitDoThis: z.boolean(),
    maximumAgeHours: z.number().int().positive(),
    conflictBehavior: z.literal("block"),
    expiryBehavior: z.literal("recheck"),
    restrictiveChangeBehavior: z.literal("block_and_review"),
    relaxationBehavior: z.literal("new_revision_and_complete_proof"),
    recheckTriggers: z.array(z.enum([
      "claim_revision_changed",
      "source_changed",
      "source_unavailable",
      "applicability_changed",
      "jurisdiction_changed",
      "observation_expired",
      "dependency_changed",
    ])).min(1),
    proofPacket: z
      .object({
        evidenceLinksRequired: z.boolean(),
        proofPacketIdsRequired: z.boolean(),
        jurisdictionBindingRequired: z.literal(true),
        travellerApplicabilityRequired: z.literal(true),
        structuredCaveatsRequired: z.literal(true),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    for (const [field, values] of [
      ["permittedSourceRoles", policy.permittedSourceRoles],
      ["permittedSourceAuthorities", policy.permittedSourceAuthorities],
      ["permittedSourcePrecedence", policy.permittedSourcePrecedence],
      ["permittedRecordKinds", policy.permittedRecordKinds],
      ["recheckTriggers", policy.recheckTriggers],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} values must be unique` });
      }
    }
  });

const travellerApplicabilitySchema = z
  .object({
    nationality: z.literal("RU"),
    passportType: z.literal("ordinary"),
    travellerKinds: z.array(z.enum(["adult", "child"])).min(1),
    childAgeRange: ageRangeSchema.optional(),
    minimumAdults: z.number().int().min(1).max(2),
    maximumAdults: z.number().int().min(1).max(2),
    childCount: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((scope, context) => {
    if (scope.minimumAdults > scope.maximumAdults) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["minimumAdults"], message: "Minimum adults cannot exceed maximum adults" });
    }
    if (scope.travellerKinds.includes("child") !== Boolean(scope.childAgeRange)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["childAgeRange"], message: "Child scope and child age range must appear together" });
    }
  });

const jurisdictionBindingSchema = z
  .object({
    ruleJurisdiction: identifierSchema,
    travellerNationality: z.literal("RU"),
    originJurisdiction: z.literal("jurisdiction.russia"),
    destinationJurisdiction: identifierSchema,
    transit: z.discriminatedUnion("state", [
      z.object({ state: z.literal("not_established") }).strict(),
      z.object({ state: z.literal("none") }).strict(),
      z.object({ state: z.literal("established"), jurisdictions: z.array(identifierSchema).min(1) }).strict(),
    ]),
    bilateralParties: z.array(identifierSchema).default([]),
  })
  .strict();

const guidanceTimingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("not_established") }).strict(),
  z.object({ kind: z.literal("before_departure"), minimumHoursBefore: z.number().int().nonnegative().optional(), maximumHoursBefore: z.number().int().positive().optional() }).strict(),
  z.object({ kind: z.literal("after_arrival"), withinHours: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal("on_local_date"), date: localDateSchema, legalTimezone: z.string().trim().min(1) }).strict(),
  z.object({ kind: z.literal("departure_window"), earliestOn: localDateSchema, latestOn: localDateSchema }).strict(),
]).superRefine((timing, context) => {
  if (timing.kind === "departure_window" && timing.earliestOn > timing.latestOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["latestOn"], message: "Departure window cannot end before it starts" });
  }
});

const evidenceLinkSchema = z
  .object({
    claimId: identifierSchema,
    claimRevision: z.number().int().positive(),
    sourceId: identifierSchema,
    sourceRole: sourceRoleSchema,
    proofPacketIds: z.array(identifierSchema),
    observedAt: isoInstantSchema,
    validUntilExclusive: isoInstantSchema,
    carrierId: identifierSchema.optional(),
    segmentId: identifierSchema.optional(),
  })
  .strict();

const guidanceCopySchema = z
  .object({
    title: semanticallyBoundLocalizedTextSchema,
    summary: semanticallyBoundLocalizedTextSchema,
    caveats: z.array(z.object({
      kind: z.enum(["eligibility", "timing", "money", "safety", "uncertainty"]),
      effect: z.enum(["limits_scope", "requires_confirmation", "blocks_action"]),
      text: semanticallyBoundLocalizedTextSchema,
    }).strict()).min(1),
  })
  .strict();

export const guidanceItemDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    revision: z.number().int().positive(),
    publicationState: z.enum(["active", "withdrawn"]),
    corridorId: identifierSchema,
    routeId: identifierSchema,
    origin: originSchema.optional(),
    requirementId: identifierSchema,
    category: z.enum(corridorRequirementCategories),
    criticality: z.enum(["required", "optional"]),
    journeyStage: journeyStageSchema,
    urgency: z.enum(["now", "before_booking", "before_departure", "on_arrival", "within_72_hours", "before_stay_expiry", "reference"]),
    authorityPolicyId: identifierSchema,
    authorityPolicyVersion: z.number().int().positive(),
    authorityClass: guidanceAuthorityClassSchema,
    travellerApplicability: travellerApplicabilitySchema,
    jurisdictions: jurisdictionBindingSchema,
    timing: guidanceTimingSchema,
    dependencies: z.array(identifierSchema),
    evidenceLinks: z.array(evidenceLinkSchema),
    operationalRecordIds: z.array(identifierSchema),
    fallback: semanticallyBoundLocalizedTextSchema,
    copy: guidanceCopySchema,
  })
  .strict()
  .superRefine((item, context) => {
    for (const [field, values] of [
      ["dependencies", item.dependencies],
      ["evidenceLinks", item.evidenceLinks.map((link) => `${link.claimId}|${link.sourceId}`)],
      ["operationalRecordIds", item.operationalRecordIds],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} values must be unique` });
      }
    }
  });

export const stayTimelineRuleSchema = z
  .object({
    schemaVersion: z.literal(2),
    allowedDays: z.number().int().positive(),
    windowDays: z.number().int().positive().optional(),
    entryDay: z.enum(["included", "excluded"]),
    exitDay: z.enum(["included", "excluded"]),
    windowAnchor: z.enum(["entry", "each_day_of_stay", "calendar_period"]),
    dayCounting: z.enum(["calendar_days", "working_days"]),
    nonWorkingDayAdjustment: z.enum(["none", "next_working_day", "previous_working_day", "not_established"]),
    legalTimezone: z.string().trim().min(1),
    exceptions: z.array(z.object({
      id: identifierSchema,
      effect: z.enum(["extends", "shortens", "changes_counting", "not_established"]),
      description: semanticallyBoundLocalizedTextSchema,
    }).strict()),
    registration: z.object({
      trigger: z.enum(["arrival", "accommodation_check_in", "address_change", "not_established"]),
      withinHours: z.number().int().positive().optional(),
      responsibleParty: z.enum(["accommodation_provider_or_host", "traveller", "shared", "not_established"]),
    }).strict(),
  })
  .strict()
  .refine((rule) => rule.windowDays === undefined || rule.allowedDays <= rule.windowDays, {
    message: "Allowed days cannot exceed the rolling window",
  });

const departureSegmentSchema = z.object({
  carrierId: identifierSchema,
  segmentId: identifierSchema,
  departurePoint: z.string().trim().min(1),
  arrivalPoint: z.string().trim().min(1),
  departsAt: isoInstantSchema,
  arrivesAt: isoInstantSchema,
}).strict().refine((segment) => segment.departsAt < segment.arrivesAt, {
  message: "A departure segment must arrive after it departs",
});

const departureObservationSchema = z.object({
  kind: z.literal("departure_observation"),
  planningWindow: z.object({ earliestOn: localDateSchema, latestOn: localDateSchema }).strict(),
  observedDepartureOn: localDateSchema,
  itineraryRole: z.enum(["primary", "fallback"]),
  observationScope: z.enum(["scheduled_itinerary", "scheduled_segments_candidate"]),
  departurePoint: z.string().trim().min(1),
  arrivalPoint: z.string().trim().min(1),
  serbianEntryPoint: z.string().trim().min(1),
  modes: z.array(z.enum(["air", "rail", "bus", "car", "ferry", "walk"])).min(1),
  transferPoints: z.array(z.string().trim().min(1)),
  bookingStructure: z.enum(["single_ticket_confirmed", "single_ticket_to_confirm", "self_transfer", "not_established"]),
  segments: z.array(departureSegmentSchema).min(1),
  durationMinutes: z.number().int().positive(),
  operatingState: z.enum(["scheduled", "observed_operating", "known_not_operating", "not_found"]),
}).strict().superRefine((observation, context) => {
  if (observation.planningWindow.earliestOn > observation.planningWindow.latestOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["planningWindow"], message: "Departure window cannot end before it starts" });
  }
  if (observation.observedDepartureOn < observation.planningWindow.earliestOn || observation.observedDepartureOn > observation.planningWindow.latestOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["observedDepartureOn"], message: "Observed departure must fall inside the planning window" });
  }
  const first = observation.segments[0];
  const last = observation.segments.at(-1)!;
  if (first.departurePoint !== observation.departurePoint || last.arrivalPoint !== observation.arrivalPoint) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["segments"], message: "Segments must connect the recorded departure and arrival points" });
  }
  for (let index = 1; index < observation.segments.length; index += 1) {
    const previous = observation.segments[index - 1];
    const current = observation.segments[index];
    if (previous.arrivalPoint !== current.departurePoint || previous.arrivesAt > current.departsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["segments", index], message: "Departure segments must form a chronological connected itinerary" });
    }
  }
  const expectedTransfers = observation.segments.slice(0, -1).map((segment) => segment.arrivalPoint);
  if (expectedTransfers.join("|") !== observation.transferPoints.join("|")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["transferPoints"], message: "Transfer points must match the segment connections" });
  }
  const elapsedMinutes = (Date.parse(last.arrivesAt) - Date.parse(first.departsAt)) / 60_000;
  if (elapsedMinutes !== observation.durationMinutes) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["durationMinutes"], message: "Duration must equal the elapsed itinerary time" });
  }
});

export const first72ArrangementKindSchema = z.enum([
  "accommodation",
  "arrival_transfer",
  "communication",
  "food",
  "medicine",
  "payment",
  "urgent_healthcare",
  "child_needs",
  "pet_needs",
  "trusted_contact",
  "failure_path",
]);

export const operationalContactKindSchema = z.enum([
  "police",
  "ambulance",
  "fire",
  "general_emergency",
  "consular",
  "medical",
  "insurance",
  "domestic_violence",
  "child_safeguarding",
]);

const first72ArrangementPayloadSchema = z.object({
  kind: z.literal("first_72_hour_arrangement"),
  arrangementKind: first72ArrangementKindSchema,
  confirmationState: z.enum(["confirmed", "pending"]),
  travellerScope: z.enum(["all_travellers", "adults", "children", "optional_pet"]),
  provider: z.string().trim().min(1).optional(),
  summary: semanticallyBoundLocalizedTextSchema,
  fallback: semanticallyBoundLocalizedTextSchema,
  relatedContactRecordIds: z.array(identifierSchema).default([]),
}).strict().superRefine((arrangement, context) => {
  if (
    arrangement.confirmationState === "confirmed" &&
    ["accommodation", "arrival_transfer"].includes(arrangement.arrangementKind) &&
    !arrangement.provider
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "A confirmed accommodation or transfer needs a named provider" });
  }
  if (new Set(arrangement.relatedContactRecordIds).size !== arrangement.relatedContactRecordIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["relatedContactRecordIds"], message: "Related contact record IDs must be unique" });
  }
});

const operationalContactPayloadSchema = z.object({
  kind: z.literal("operational_contact"),
  contactKind: operationalContactKindSchema,
  label: semanticallyBoundLocalizedTextSchema,
  dial: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("e164"), value: z.string().regex(/^\+[1-9]\d{6,14}$/) }).strict(),
    z.object({ kind: z.literal("local_short_code"), value: z.string().regex(/^\d{3,6}$/) }).strict(),
  ]).optional(),
  address: semanticallyBoundLocalizedTextSchema.optional(),
  usage: semanticallyBoundLocalizedTextSchema,
  coverage: z.enum(["serbia_national", "belgrade", "russian_nationals_in_serbia", "provider_specific"]),
  availability: z.enum(["always", "published_hours", "not_established"]),
  languageSupport: z.array(z.enum(["serbian", "english", "russian", "not_established"])).min(1),
  clickToCall: z.boolean(),
  copyable: z.boolean(),
  offlineAvailable: z.boolean(),
}).strict().superRefine((contact, context) => {
  if (!contact.dial && !contact.address) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["dial"], message: "An operational contact needs a dial string or address" });
  }
  if (contact.clickToCall && !contact.dial) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["clickToCall"], message: "Click to call requires a dial string" });
  }
  if (new Set(contact.languageSupport).size !== contact.languageSupport.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["languageSupport"], message: "Contact languages must be unique" });
  }
});

const operationalPayloadSchema = z.union([
  departureObservationSchema,
  first72ArrangementPayloadSchema,
  operationalContactPayloadSchema,
  z.object({ kind: z.literal("health_guidance"), topic: z.enum(["medicine", "urgent_care", "insurance_access", "child_health"]), detail: semanticallyBoundLocalizedTextSchema }).strict(),
  z.object({ kind: z.literal("housing_guidance"), topic: z.enum(["initial_accommodation", "registration_capability", "deposit", "fraud_check", "fallback"]), detail: semanticallyBoundLocalizedTextSchema }).strict(),
  z.object({ kind: z.literal("communication_path"), channel: z.enum(["mobile_data", "voice", "messaging", "trusted_contact", "offline_copy"]), availability: z.enum(["confirmed", "pending", "not_collected"]), detail: semanticallyBoundLocalizedTextSchema }).strict(),
  z.object({ kind: z.literal("cost_observation"), component: z.enum(["travel", "entry", "accommodation", "deposit", "food", "local_transport", "communications", "insurance", "registration", "emergency_reserve", "return_reserve", "other"]), currency: z.string().regex(/^[A-Z]{3}$/), lowMinor: z.number().int().nonnegative(), highMinor: z.number().int().nonnegative(), observedFor: z.enum(["per_traveller", "household", "per_night", "first_72_hours", "first_30_days"]), exchangeRateDate: localDateSchema.optional(), exclusions: z.array(semanticallyBoundLocalizedTextSchema) }).strict().refine((cost) => cost.lowMinor <= cost.highMinor, { message: "Cost low value cannot exceed high value" }),
  z.object({ kind: z.literal("stay_timeline_input"), arrivalDate: localDateSchema.optional(), priorStayDates: z.array(localDateSchema), rule: stayTimelineRuleSchema }).strict(),
  z.object({
    kind: z.literal("plan_snapshot"),
    snapshotVersion: z.number().int().positive(),
    createdAt: isoInstantSchema,
    catalogReleaseId: identifierSchema,
    manifestVersion: z.number().int().positive(),
    policyVersions: z.array(z.object({ policyId: identifierSchema, version: z.number().int().positive() }).strict()),
    routeClaimRevisions: z.array(z.object({ claimId: identifierSchema, revision: z.number().int().positive() }).strict()),
    guidanceItemRevisions: z.array(z.object({ itemId: identifierSchema, revision: z.number().int().positive() }).strict()),
    operationalRecordRevisions: z.array(z.object({ recordId: identifierSchema, revision: z.number().int().positive() }).strict()),
    proofPacketIds: z.array(identifierSchema),
    privateFieldsIncluded: z.literal(false),
  }).strict(),
]);

const operationalPayloadExpectationSchema = z.union([
  z.object({ kind: z.literal("departure_observation"), itineraryRole: z.enum(["primary", "fallback"]) }).strict(),
  z.object({
    kind: z.literal("first_72_hour_arrangement"),
    arrangementKind: first72ArrangementKindSchema,
    scenario: z.enum(["primary", "fallback", "entry_failure", "transport_failure", "payment_failure", "accommodation_failure"]).optional(),
  }).strict(),
  z.object({ kind: z.literal("operational_contact"), contactKind: operationalContactKindSchema }).strict(),
  z.object({ kind: z.literal("health_guidance"), topic: z.enum(["medicine", "urgent_care", "insurance_access", "child_health"]) }).strict(),
  z.object({ kind: z.literal("housing_guidance"), topic: z.enum(["initial_accommodation", "registration_capability", "deposit", "fraud_check", "fallback"]) }).strict(),
  z.object({ kind: z.literal("communication_path"), channel: z.enum(["mobile_data", "voice", "messaging", "trusted_contact", "offline_copy"]) }).strict(),
  z.object({ kind: z.literal("cost_observation"), component: z.enum(["travel", "entry", "accommodation", "deposit", "food", "local_transport", "communications", "insurance", "registration", "emergency_reserve", "return_reserve", "other"]) }).strict(),
  z.object({ kind: z.literal("stay_timeline_input") }).strict(),
  z.object({ kind: z.literal("plan_snapshot") }).strict(),
]);

const operationalRecordBase = {
    schemaVersion: z.literal(1),
    id: identifierSchema,
    revision: z.number().int().positive(),
    corridorId: identifierSchema,
    routeId: identifierSchema,
    origin: originSchema.optional(),
    requirementId: identifierSchema,
    recordKind: operationalRecordKindSchema,
    jurisdictions: jurisdictionBindingSchema,
  };

const operationalSourceBindingSchema = z.object({
  sourceRole: sourceRoleSchema,
  sourceId: identifierSchema,
  carrierId: identifierSchema.optional(),
  segmentIds: z.array(identifierSchema).default([]),
}).strict();

export const operationalRecordSchema = z.union([
  z.object({
    ...operationalRecordBase,
    recordState: z.literal("not_collected"),
    expectedPayloads: z.array(operationalPayloadExpectationSchema).min(1),
    absenceReason: semanticallyBoundLocalizedTextSchema,
  }).strict().superRefine((record, context) => {
    if (record.expectedPayloads.some((expected) => record.recordKind !== expected.kind)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedPayloads"], message: "Record kind and every expected payload kind must agree" });
    }
    if (new Set(record.expectedPayloads.map((expected) => JSON.stringify(expected))).size !== record.expectedPayloads.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedPayloads"], message: "Expected payloads must be unique" });
    }
  }),
  z.object({
    ...operationalRecordBase,
    recordState: z.enum(["observed", "not_found", "known_not_operating"]),
    sourceBindings: z.array(operationalSourceBindingSchema).min(1),
    observationId: identifierSchema,
    evidenceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    structuredValuesVerified: z.literal(true),
    observedAt: isoInstantSchema,
    validUntilExclusive: isoInstantSchema,
    payload: operationalPayloadSchema,
  }).strict().superRefine((record, context) => {
    if (record.recordKind !== record.payload.kind) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["payload", "kind"], message: "Record kind and payload kind must agree" });
    }
    const bindingKeys = record.sourceBindings.map((binding) => `${binding.sourceRole}|${binding.sourceId}`);
    if (new Set(bindingKeys).size !== bindingKeys.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceBindings"], message: "Operational source bindings must be unique" });
    }
  }),
]);

export const journeyGuidanceCollectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: z.literal("journey-guidance-v1"),
    catalogReleaseId: identifierSchema,
    authorityPolicies: z.array(guidanceAuthorityPolicySchema),
    guidanceItems: z.array(guidanceItemDefinitionSchema),
    operationalRecords: z.array(operationalRecordSchema),
  })
  .strict();

export type JourneyGuidanceCollection = z.infer<typeof journeyGuidanceCollectionSchema>;
export type GuidanceItemDefinition = z.infer<typeof guidanceItemDefinitionSchema>;
export type OperationalRecord = z.infer<typeof operationalRecordSchema>;
export type GuidanceActionState = z.infer<typeof guidanceActionStateSchema>;
export type StayTimelineRule = z.infer<typeof stayTimelineRuleSchema>;

export type GuidanceItem = GuidanceItemDefinition & {
  actionState: GuidanceActionState;
  stateReasons: string[];
};

export function guidanceSemanticProjection(item: GuidanceItem) {
  return {
    actionState: item.actionState,
    stateReasons: item.stateReasons,
    category: item.category,
    criticality: item.criticality,
    urgency: item.urgency,
    authorityClass: item.authorityClass,
    authorityPolicyId: item.authorityPolicyId,
    authorityPolicyVersion: item.authorityPolicyVersion,
    travellerApplicability: item.travellerApplicability,
    jurisdictions: item.jurisdictions,
    timing: item.timing,
    caveats: item.copy.caveats.map(({ kind, effect }) => ({ kind, effect })),
  };
}

export function renderGuidanceItem(item: GuidanceItem, lang: "en" | "ru") {
  return {
    title: item.copy.title[lang],
    summary: item.copy.summary[lang],
    caveats: item.copy.caveats.map((caveat) => caveat.text[lang]),
    fallback: item.fallback[lang],
    semantics: guidanceSemanticProjection(item),
  };
}

export const savedGuidanceSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: identifierSchema,
  createdAt: isoInstantSchema,
  catalogReleaseId: identifierSchema,
  manifestId: identifierSchema,
  manifestVersion: z.number().int().positive(),
  routeId: identifierSchema,
  policyId: identifierSchema,
  policyVersion: z.number().int().positive(),
  itemId: identifierSchema,
  itemRevision: z.number().int().positive(),
  actionState: guidanceActionStateSchema,
  evidenceValidUntilExclusive: isoInstantSchema.optional(),
  claimRevisions: z.array(z.object({ claimId: identifierSchema, revision: z.number().int().positive() }).strict()),
  operationalRecordRevisions: z.array(z.object({ recordId: identifierSchema, revision: z.number().int().positive() }).strict()),
  proofPacketIds: z.array(identifierSchema),
  scopeFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  privateFieldsIncluded: z.literal(false),
}).strict();

type EvidenceReports = z.infer<typeof evidenceAutomationReportsSchema>;

const requirementKey = (requirementId: string, origin?: string) => `${requirementId}|${origin ?? "shared"}`;

const jurisdictionIds = new Map([
  ["Russia", "jurisdiction.russia"],
  ["Serbia", "jurisdiction.serbia"],
  ["India", "jurisdiction.india"],
  ["Türkiye", "jurisdiction.turkiye"],
  ["Armenia", "jurisdiction.armenia"],
  ["Kazakhstan", "jurisdiction.kazakhstan"],
  ["Georgia", "jurisdiction.georgia"],
  ["United Arab Emirates", "jurisdiction.united_arab_emirates"],
]);

function jurisdictionId(value: string) {
  const id = jurisdictionIds.get(value);
  if (!id) throw new Error(`Unknown stable jurisdiction mapping for ${value}`);
  return id;
}

function findCurrentDecision(reports: EvidenceReports, catalogReleaseId: string, claimId: string) {
  return reports.runs
    .filter((run) => run.catalogReleaseId === catalogReleaseId && run.mode === "authoritative_automation" && run.eligibleForActions)
    .at(-1)?.decisions.find((decision) => decision.claimId === claimId);
}

export function evaluateGuidanceItem({
  item,
  policy,
  manifest,
  catalog,
  evidenceReports,
  asOf,
}: {
  item: GuidanceItemDefinition;
  policy: z.infer<typeof guidanceAuthorityPolicySchema>;
  manifest: CorridorRequirementManifest;
  catalog: ContentCatalog;
  evidenceReports: EvidenceReports;
  asOf: string;
}): GuidanceItem {
  const route = catalog.routes.find((candidate) => candidate.id === item.routeId);
  const slot = manifest.requirements.find((candidate) => requirementKey(candidate.requirementId, candidate.origin) === requirementKey(item.requirementId, item.origin));
  const reasons: string[] = [];
  let actionState: GuidanceActionState;

  if (item.publicationState === "withdrawn" || route?.publicationState === "withdrawn") {
    actionState = "blocked";
    reasons.push(item.publicationState === "withdrawn" ? "guidance_item_withdrawn" : "route_withdrawn");
  } else if (slot?.status === "contradictory") {
    actionState = "blocked";
    reasons.push("manifest_slot_contradictory");
  } else if (!slot || slot.status === "missing" || slot.status === "not_applicable") {
    actionState = "not_established";
    reasons.push(slot?.status === "not_applicable" ? "manifest_slot_not_applicable" : "manifest_slot_missing");
  } else {
    const expired = item.evidenceLinks.some((link) => link.validUntilExclusive <= asOf);
    const changed = item.evidenceLinks.some((link) => {
      const claim = catalog.claims.find((candidate) => candidate.id === link.claimId);
      const decision = findCurrentDecision(evidenceReports, catalog.releaseId, link.claimId);
      return claim?.revision !== link.claimRevision || decision?.state !== "current";
    });
    const lineages = new Set(item.evidenceLinks.flatMap((link) => {
      const source = catalog.sources.find((candidate) => candidate.id === link.sourceId);
      return source ? [source.independenceGroupId] : [];
    }));
    const proofIncomplete =
      (policy.proofPacket.evidenceLinksRequired && item.evidenceLinks.length === 0) ||
      (policy.proofPacket.proofPacketIdsRequired && item.evidenceLinks.some((link) => link.proofPacketIds.length === 0)) ||
      lineages.size < policy.minimumIndependentLineages ||
      (policy.officialPrimaryRequired && item.evidenceLinks.some((link) => catalog.sources.find((source) => source.id === link.sourceId)?.tier !== "primary"));
    if (expired || changed) reasons.push(expired ? "evidence_expired" : "evidence_not_current");
    if (proofIncomplete) reasons.push("authority_proof_incomplete");
    if (slot.status === "incomplete") reasons.push("manifest_slot_incomplete");
    if (!policy.mayEmitDoThis) reasons.push("policy_action_disabled");
    if (manifest.researchTargetOnly || !manifest.activationAuthority || route?.publicationState !== "published") {
      reasons.push("corridor_has_no_action_authority");
    }
    actionState = !expired && !changed && !proofIncomplete && slot.status === "current" && policy.mayEmitDoThis && !manifest.researchTargetOnly && manifest.activationAuthority && route?.publicationState === "published"
      ? "do_this"
      : "confirm_first";
    if (actionState === "do_this") reasons.push("authority_requirements_satisfied");
  }

  return { ...item, actionState, stateReasons: [...new Set(reasons)] };
}

export function evaluateSavedGuidanceSnapshot({
  snapshot,
  currentItem,
  currentManifest,
  currentPolicy,
  currentOperationalRecords,
  currentCatalogReleaseId,
  currentScopeFingerprint,
  asOf,
}: {
  snapshot: z.infer<typeof savedGuidanceSnapshotSchema>;
  currentItem: GuidanceItem;
  currentManifest: CorridorRequirementManifest;
  currentPolicy: z.infer<typeof guidanceAuthorityPolicySchema>;
  currentOperationalRecords: OperationalRecord[];
  currentCatalogReleaseId: string;
  currentScopeFingerprint: string;
  asOf: string;
}): { validity: z.infer<typeof savedArtifactValiditySchema>; reasons: string[] } {
  if (currentItem.publicationState === "withdrawn") return { validity: "withdrawn", reasons: ["guidance_item_withdrawn"] };
  const reasons: string[] = [];
  if (snapshot.catalogReleaseId !== currentCatalogReleaseId) reasons.push("catalog_release_changed");
  if (snapshot.manifestId !== currentManifest.id || snapshot.manifestVersion !== currentManifest.version) reasons.push("manifest_changed");
  if (snapshot.policyId !== currentPolicy.id || snapshot.policyVersion !== currentPolicy.version) reasons.push("authority_policy_changed");
  if (snapshot.itemId !== currentItem.id || snapshot.itemRevision !== currentItem.revision || snapshot.actionState !== currentItem.actionState) reasons.push("guidance_item_changed");
  if (snapshot.scopeFingerprint !== currentScopeFingerprint) reasons.push("guidance_scope_changed");
  if (snapshot.evidenceValidUntilExclusive && snapshot.evidenceValidUntilExclusive <= asOf) reasons.push("saved_evidence_expired");
  const claimRevisions = new Map(currentItem.evidenceLinks.map((link) => [link.claimId, link.claimRevision]));
  if (snapshot.claimRevisions.some((entry) => claimRevisions.get(entry.claimId) !== entry.revision)) reasons.push("claim_revision_changed");
  const recordRevisions = new Map(currentOperationalRecords.map((record) => [record.id, record.revision]));
  if (snapshot.operationalRecordRevisions.some((entry) => recordRevisions.get(entry.recordId) !== entry.revision)) reasons.push("operational_record_changed");
  const proofPacketIds = new Set(currentItem.evidenceLinks.flatMap((link) => link.proofPacketIds));
  if (snapshot.proofPacketIds.some((id) => !proofPacketIds.has(id))) reasons.push("proof_packet_changed");
  return { validity: reasons.length ? "recheck" : "current", reasons: [...new Set(reasons)] };
}

export function evaluateGuidanceCollection({
  collection,
  manifest,
  catalog,
  evidenceReports,
  asOf,
}: {
  collection: JourneyGuidanceCollection;
  manifest: CorridorRequirementManifest;
  catalog: ContentCatalog;
  evidenceReports: EvidenceReports;
  asOf: string;
}) {
  const policyById = new Map(collection.authorityPolicies.map((policy) => [policy.id, policy]));
  const authored = new Map(collection.guidanceItems.map((item) => [item.id, item]));
  const evaluated = new Map<string, GuidanceItem>();
  const visiting = new Set<string>();
  const visit = (id: string): GuidanceItem => {
    const existing = evaluated.get(id);
    if (existing) return existing;
    if (visiting.has(id)) throw new Error(`Guidance dependency cycle includes ${id}`);
    const item = authored.get(id);
    if (!item) throw new Error(`Unknown guidance dependency ${id}`);
    const policy = policyById.get(item.authorityPolicyId);
    if (!policy) throw new Error(`Unknown guidance policy ${item.authorityPolicyId}`);
    visiting.add(id);
    const dependencies = item.dependencies.map(visit);
    visiting.delete(id);
    const result = evaluateGuidanceItem({ item, policy, manifest, catalog, evidenceReports, asOf });
    if (dependencies.some((dependency) => dependency.actionState !== "do_this")) {
      result.stateReasons = [...new Set([...result.stateReasons, "dependency_not_actionable"])];
      if (result.actionState === "do_this") result.actionState = "confirm_first";
    }
    evaluated.set(id, result);
    return result;
  };
  return collection.guidanceItems
    .filter((item) => item.corridorId === manifest.id && item.publicationState === "active")
    .map((item) => visit(item.id));
}

export function buildCorridorGuidanceView({ manifest, items, origin }: { manifest: CorridorRequirementManifest; items: GuidanceItem[]; origin: z.infer<typeof originSchema> }) {
  const itemBySlot = new Map(items.map((item) => [requirementKey(item.requirementId, item.origin), item]));
  return manifest.requirements
    .filter((entry) => entry.origin === undefined || entry.origin === origin)
    .map((entry) => ({
      requirementId: entry.requirementId,
      origin: entry.origin,
      inventoryStatus: entry.status,
      gap: entry.gap?.summary ?? null,
      guidance: itemBySlot.get(requirementKey(entry.requirementId, entry.origin)) ?? null,
    }));
}

export function validateJourneyGuidance({
  collection,
  catalog,
  evidenceReports,
  manifests,
  asOf,
}: {
  collection: JourneyGuidanceCollection;
  catalog: ContentCatalog;
  evidenceReports: EvidenceReports;
  manifests: CorridorRequirementManifest[];
  asOf: string;
}) {
  if (collection.catalogReleaseId !== catalog.releaseId) throw new Error(`Journey guidance targets ${collection.catalogReleaseId}, not current release ${catalog.releaseId}`);

  const policyById = new Map(collection.authorityPolicies.map((policy) => [policy.id, policy]));
  if (policyById.size !== collection.authorityPolicies.length) throw new Error("Journey authority policy IDs must be unique");
  const requiredPolicyIds = [...corridorAuthorityPolicyIds, generalPreparednessPolicyId];
  for (const policyId of requiredPolicyIds) {
    const policy = policyById.get(policyId);
    if (!policy || policy.authorityClass !== authorityClassByPolicyId[policyId as keyof typeof authorityClassByPolicyId]) throw new Error(`Missing or misclassified authority policy ${policyId}`);
  }
  if (collection.authorityPolicies.length !== requiredPolicyIds.length) throw new Error("Journey guidance must define exactly the versioned authority policy set");

  const itemById = new Map(collection.guidanceItems.map((item) => [item.id, item]));
  if (itemById.size !== collection.guidanceItems.length) throw new Error("Guidance item IDs must be unique");
  const recordById = new Map(collection.operationalRecords.map((record) => [record.id, record]));
  if (recordById.size !== collection.operationalRecords.length) throw new Error("Operational record IDs must be unique");
  const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
  const claimById = new Map(catalog.claims.map((claim) => [claim.id, claim]));
  const authoritativeRun = evidenceReports.runs
    .filter((run) => run.catalogReleaseId === catalog.releaseId && run.mode === "authoritative_automation" && run.eligibleForActions)
    .at(-1);
  if (!authoritativeRun) throw new Error(`Journey guidance has no current authoritative run for ${catalog.releaseId}`);
  const decisionByClaimId = new Map(authoritativeRun.decisions.map((decision) => [decision.claimId, decision]));
  const proofById = new Map((authoritativeRun.proofPackets ?? []).map((packet) => [packet.id, packet]));
  const claimRequirementBindings = new Map<string, Set<string>>();
  const boundAbsenceRecordIds = new Set<string>();

  for (const manifest of manifests) {
    for (const entry of manifest.requirements) {
      const definition = corridorRequirementDefinitions.find((candidate) => candidate.id === entry.requirementId)!;
      const policy = policyById.get(definition.authorityPolicyId)!;
      for (const recordId of entry.operationalRecordIds) {
        const record = recordById.get(recordId);
        if (!record || record.corridorId !== manifest.id || record.origin !== entry.origin) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} has an invalid operational record binding`);
        }
        if (!policy.permittedRecordKinds.includes(record.recordKind)) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} binds record kind ${record.recordKind} outside policy ${policy.id}`);
        }
        if (entry.status === "current" && (record.recordState === "not_collected" || ("validUntilExclusive" in record && record.validUntilExclusive <= asOf))) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} cannot be current with absent or expired operational evidence`);
        }
      }
      for (const recordId of entry.absenceRecordIds) {
        const record = recordById.get(recordId);
        if (
          !record ||
          record.recordState !== "not_collected" ||
          record.corridorId !== manifest.id ||
          record.requirementId !== entry.requirementId ||
          record.origin !== entry.origin
        ) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} has an invalid explicit absence record binding`);
        }
        if (!policy.permittedRecordKinds.includes(record.recordKind)) {
          throw new Error(`Corridor slot ${requirementKey(entry.requirementId, entry.origin)} binds absence kind ${record.recordKind} outside policy ${policy.id}`);
        }
        if (boundAbsenceRecordIds.has(recordId)) {
          throw new Error(`Explicit absence record ${recordId} is bound more than once`);
        }
        boundAbsenceRecordIds.add(recordId);
      }
    }
  }

  for (const item of collection.guidanceItems) {
    const manifest = manifests.find((candidate) => candidate.id === item.corridorId);
    if (!manifest || manifest.routeId !== item.routeId) throw new Error(`Guidance item ${item.id} does not bind a current corridor and route`);
    const route = catalog.routes.find((candidate) => candidate.id === item.routeId);
    const place = catalog.places.find((candidate) => candidate.routeIds.includes(item.routeId));
    if (!route || !place) throw new Error(`Guidance item ${item.id} references an unknown route or place`);
    const definition = corridorRequirementDefinitions.find((candidate) => candidate.id === item.requirementId);
    if (!definition) throw new Error(`Guidance item ${item.id} references unknown requirement ${item.requirementId}`);
    if (definition.category !== item.category || definition.criticality !== item.criticality || definition.authorityPolicyId !== item.authorityPolicyId || authorityClassByPolicyId[definition.authorityPolicyId as keyof typeof authorityClassByPolicyId] !== item.authorityClass) {
      throw new Error(`Guidance item ${item.id} changes its manifest category, criticality, or authority policy`);
    }
    if ((definition.scope === "origin_variant") !== Boolean(item.origin)) throw new Error(`Guidance item ${item.id} has the wrong origin scope`);
    if (item.origin && !manifest.origins.includes(item.origin)) throw new Error(`Guidance item ${item.id} references an origin outside its corridor`);
    if (item.jurisdictions.destinationJurisdiction !== jurisdictionId(place.country.en)) throw new Error(`Guidance item ${item.id} has the wrong destination jurisdiction`);
    if (item.travellerApplicability.minimumAdults !== manifest.household.minimumAdults || item.travellerApplicability.maximumAdults !== manifest.household.maximumAdults || item.travellerApplicability.childCount !== manifest.household.childCount) {
      throw new Error(`Guidance item ${item.id} broadens or narrows the corridor household envelope`);
    }
    if (item.travellerApplicability.travellerKinds.join("|") !== "adult|child" || item.travellerApplicability.childAgeRange?.minInclusive !== manifest.household.childAgeRange.minInclusive || item.travellerApplicability.childAgeRange?.maxInclusive !== manifest.household.childAgeRange.maxInclusive) {
      throw new Error(`Guidance item ${item.id} changes traveller applicability`);
    }

    const policy = policyById.get(item.authorityPolicyId)!;
    if (item.authorityPolicyVersion !== policy.version) throw new Error(`Guidance item ${item.id} pins the wrong authority policy version`);
    for (const dependency of item.dependencies) if (!itemById.has(dependency)) throw new Error(`Guidance item ${item.id} has unknown dependency ${dependency}`);
    for (const recordId of item.operationalRecordIds) {
      const record = recordById.get(recordId);
      if (!record || record.corridorId !== item.corridorId || record.requirementId !== item.requirementId || record.origin !== item.origin) throw new Error(`Guidance item ${item.id} has an invalid operational record binding`);
      if (!policy.permittedRecordKinds.includes(record.recordKind)) throw new Error(`Guidance item ${item.id} binds record kind ${record.recordKind} outside policy ${policy.id}`);
    }
    for (const link of item.evidenceLinks) {
      const source = sourceById.get(link.sourceId);
      const claim = claimById.get(link.claimId);
      if (!source || !claim) throw new Error(`Guidance item ${item.id} has an unknown source or claim binding`);
      if (claim.subjectId !== item.routeId || claim.revision !== link.claimRevision) throw new Error(`Guidance item ${item.id} has a stale or cross-subject claim binding`);
      if (!definition.acceptedClaimKinds.includes(claim.fact.kind)) throw new Error(`Guidance item ${item.id} binds claim kind ${claim.fact.kind} outside its requirement`);
      if (claim.applicability.nationalities[0] !== item.travellerApplicability.nationality || claim.applicability.passportTypes[0] !== item.travellerApplicability.passportType || claim.applicability.travellerKinds.join("|") !== item.travellerApplicability.travellerKinds.join("|") || claim.applicability.childAgeRange?.minInclusive !== item.travellerApplicability.childAgeRange?.minInclusive || claim.applicability.childAgeRange?.maxInclusive !== item.travellerApplicability.childAgeRange?.maxInclusive) {
        throw new Error(`Guidance item ${item.id} broadens or changes claim applicability`);
      }
      const requirements = claimRequirementBindings.get(claim.id) ?? new Set<string>();
      requirements.add(item.requirementId);
      claimRequirementBindings.set(claim.id, requirements);
      if (![...claim.supportingSourceIds, ...claim.contradictingSourceIds].includes(source.id)) throw new Error(`Guidance item ${item.id} binds a source outside claim ${claim.id}`);
      if (!policy.permittedSourceRoles.includes(link.sourceRole) || !policy.permittedSourceAuthorities.includes(source.authority) || !policy.permittedSourcePrecedence.includes(source.precedence)) {
        throw new Error(`Guidance item ${item.id} binds source ${source.id} outside policy ${policy.id}`);
      }
      const decision = decisionByClaimId.get(link.claimId);
      if (!decision) throw new Error(`Guidance item ${item.id} has no authoritative decision for ${link.claimId}`);
      for (const packetId of link.proofPacketIds) {
        const packet = proofById.get(packetId);
        if (!packet || packet.claimId !== link.claimId || packet.claimRevision !== link.claimRevision || packet.sourceId !== link.sourceId || packet.observedAt !== link.observedAt || !decision.proofPacketIds?.includes(packetId)) {
          throw new Error(`Guidance item ${item.id} has an invalid proof packet binding ${packetId}`);
        }
      }
      if (["destination_law", "destination_official_guidance"].includes(link.sourceRole) && jurisdictionId(source.jurisdiction) !== item.jurisdictions.destinationJurisdiction) {
        throw new Error(`Guidance item ${item.id} has a cross-jurisdiction destination source binding`);
      }
      if (["destination_law", "destination_official_guidance"].includes(link.sourceRole) && item.jurisdictions.ruleJurisdiction !== item.jurisdictions.destinationJurisdiction) throw new Error(`Guidance item ${item.id} changes destination rule jurisdiction`);
      if (["origin_rule", "origin_consular_guidance"].includes(link.sourceRole) && jurisdictionId(source.jurisdiction) !== item.jurisdictions.originJurisdiction) {
        throw new Error(`Guidance item ${item.id} has a cross-jurisdiction origin source binding`);
      }
      if (["origin_rule", "origin_consular_guidance"].includes(link.sourceRole) && item.jurisdictions.ruleJurisdiction !== item.jurisdictions.originJurisdiction) throw new Error(`Guidance item ${item.id} changes origin rule jurisdiction`);
      if (link.sourceRole === "transit_rule" && (item.jurisdictions.transit.state !== "established" || !item.jurisdictions.transit.jurisdictions.includes(jurisdictionId(source.jurisdiction)))) {
        throw new Error(`Guidance item ${item.id} has a cross-jurisdiction transit source binding`);
      }
      if (link.sourceRole === "bilateral_rule" && ![item.jurisdictions.originJurisdiction, item.jurisdictions.destinationJurisdiction].every((party) => item.jurisdictions.bilateralParties.includes(party))) {
        throw new Error(`Guidance item ${item.id} has an incomplete bilateral jurisdiction binding`);
      }
      if (link.sourceRole === "carrier_rule" && (!link.carrierId || !link.segmentId)) throw new Error(`Guidance item ${item.id} has an incomplete carrier binding`);
      if (link.sourceRole === "carrier_rule" && source.authority !== "transport_operator") throw new Error(`Guidance item ${item.id} has a non-carrier source in a carrier binding`);
      if (link.validUntilExclusive <= link.observedAt) throw new Error(`Guidance item ${item.id} has a non-positive evidence validity interval`);
      if (link.observedAt > asOf) throw new Error(`Guidance item ${item.id} has a future evidence observation`);
      if (Date.parse(link.validUntilExclusive) - Date.parse(link.observedAt) > policy.maximumAgeHours * 60 * 60 * 1000) throw new Error(`Guidance item ${item.id} exceeds policy freshness`);
    }
    const evaluated = evaluateGuidanceItem({ item, policy, manifest, catalog, evidenceReports, asOf });
    if (evaluated.stateReasons.length === 0) throw new Error(`Guidance item ${item.id} does not explain its action state`);
  }

  for (const [claimId, requirementIds] of claimRequirementBindings) {
    if (requirementIds.size > 1 && !requirementIds.has("legal.source_provenance_and_validity")) throw new Error(`Claim ${claimId} is reused across unrelated guidance requirements`);
  }

  for (const record of collection.operationalRecords) {
    const manifest = manifests.find((candidate) => candidate.id === record.corridorId);
    if (!manifest || manifest.routeId !== record.routeId) throw new Error(`Operational record ${record.id} has an invalid corridor or route`);
    const definition = corridorRequirementDefinitions.find((candidate) => candidate.id === record.requirementId);
    if (!definition || (definition.scope === "origin_variant") !== Boolean(record.origin) || (record.origin && !manifest.origins.includes(record.origin))) throw new Error(`Operational record ${record.id} has the wrong requirement or origin scope`);
    const recordPolicy = policyById.get(definition.authorityPolicyId);
    if (!recordPolicy?.permittedRecordKinds.includes(record.recordKind)) throw new Error(`Operational record ${record.id} has a record kind outside its requirement policy`);
    if (record.recordState === "not_collected" && !boundAbsenceRecordIds.has(record.id)) {
      throw new Error(`Explicit absence record ${record.id} is not bound to its manifest slot`);
    }
    if (record.recordState !== "not_collected") {
      const payloadSegmentIds = new Set(record.payload.kind === "departure_observation" ? record.payload.segments.map((segment) => segment.segmentId) : []);
      for (const binding of record.sourceBindings) {
        const source = sourceById.get(binding.sourceId);
        if (!source) throw new Error(`Operational record ${record.id} has an invalid source`);
        if (!recordPolicy.permittedSourceRoles.includes(binding.sourceRole) || !recordPolicy.permittedSourceAuthorities.includes(source.authority) || !recordPolicy.permittedSourcePrecedence.includes(source.precedence)) throw new Error(`Operational record ${record.id} has a source outside its requirement policy`);
        if (binding.sourceRole === "dated_operational_observation" && !recordPolicy.operationalObservationsAllowed) throw new Error(`Operational record ${record.id} cannot use operational observation authority`);
        if (["destination_law", "destination_official_guidance"].includes(binding.sourceRole) && (jurisdictionId(source.jurisdiction) !== record.jurisdictions.destinationJurisdiction || record.jurisdictions.ruleJurisdiction !== record.jurisdictions.destinationJurisdiction)) throw new Error(`Operational record ${record.id} has a cross-jurisdiction destination binding`);
        if (["origin_rule", "origin_consular_guidance"].includes(binding.sourceRole) && (jurisdictionId(source.jurisdiction) !== record.jurisdictions.originJurisdiction || record.jurisdictions.ruleJurisdiction !== record.jurisdictions.originJurisdiction)) throw new Error(`Operational record ${record.id} has a cross-jurisdiction origin binding`);
        if (binding.sourceRole === "transit_rule" && (record.jurisdictions.transit.state !== "established" || !record.jurisdictions.transit.jurisdictions.includes(jurisdictionId(source.jurisdiction)))) throw new Error(`Operational record ${record.id} has a cross-jurisdiction transit binding`);
        if (binding.sourceRole === "carrier_rule" && (source.authority !== "transport_operator" || record.payload.kind !== "departure_observation" || !binding.carrierId || binding.segmentIds.length === 0)) throw new Error(`Operational record ${record.id} has an incomplete carrier binding`);
        if (binding.segmentIds.some((segmentId) => !payloadSegmentIds.has(segmentId))) throw new Error(`Operational record ${record.id} binds a source to an unknown segment`);
      }
      if (record.validUntilExclusive <= record.observedAt) throw new Error(`Operational record ${record.id} has a non-positive validity interval`);
      if (record.observedAt > asOf) throw new Error(`Operational record ${record.id} has a future observation`);
      if (Date.parse(record.validUntilExclusive) - Date.parse(record.observedAt) > recordPolicy.maximumAgeHours * 60 * 60 * 1000) throw new Error(`Operational record ${record.id} exceeds policy freshness`);
      if (record.payload.kind === "first_72_hour_arrangement") {
        for (const contactRecordId of record.payload.relatedContactRecordIds) {
          const contact = recordById.get(contactRecordId);
          if (!contact || contact.recordState !== "observed" || contact.payload.kind !== "operational_contact" || contact.corridorId !== record.corridorId || contact.validUntilExclusive <= asOf) {
            throw new Error(`First-72-hour arrangement ${record.id} has an invalid related contact`);
          }
        }
      }
    }
    const recordPlace = catalog.places.find((place) => place.routeIds.includes(record.routeId));
    if (!recordPlace || record.jurisdictions.destinationJurisdiction !== jurisdictionId(recordPlace.country.en)) throw new Error(`Operational record ${record.id} has the wrong destination jurisdiction`);
  }

  for (const manifest of manifests) evaluateGuidanceCollection({ collection, manifest, catalog, evidenceReports, asOf });
}
