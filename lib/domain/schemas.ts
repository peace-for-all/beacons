import { z } from "zod";

const identifierPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export const identifierSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(identifierPattern, "Use stable lowercase identifiers");

export const isoInstantSchema = z.string().datetime({ offset: true });

export const localDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}, "Expected a real calendar date in YYYY-MM-DD form");

export const localizedTextSchema = z
  .object({
    en: z.string().trim().min(1),
    ru: z.string().trim().min(1),
  })
  .strict();

export const evidenceConditionSchema = z.enum([
  "current",
  "due",
  "stale",
  "contradictory",
  "unavailable",
  "unknown",
]);

export const routeAvailabilitySchema = z.enum([
  "verified_eligible",
  "application_route_available",
  "explicitly_ineligible",
  "not_established",
]);

export const householdReadinessSchema = z.enum([
  "ready",
  "missing_documents",
  "not_evaluated",
]);

export const originSchema = z.enum(["moscow", "saint_petersburg"]);
export const travellerKindSchema = z.enum(["adult", "child"]);

export const sourcePrecedenceSchema = z.enum([
  "controlling_law",
  "official_rule",
  "official_guidance",
  "operational_official",
  "secondary",
]);
const hostnameSchema = z.string().trim().toLowerCase().regex(
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
  "Expected a hostname without scheme, credentials, port, or path",
);

export const sourceRecordSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: identifierSchema,
    tier: z.enum(["primary", "secondary"]),
    authority: z.enum([
      "foreign_ministry",
      "immigration_authority",
      "official_visa_portal",
      "embassy_or_consulate",
      "official_legal_text",
      "transport_operator",
      "cost_observation",
      "other",
    ]),
    publisher: z.string().trim().min(1),
    publisherEntityId: identifierSchema,
    publicationChainId: identifierSchema,
    originEntityId: identifierSchema,
    independenceGroupId: identifierSchema,
    derivesFromSourceIds: z.array(identifierSchema).default([]),
    precedence: sourcePrecedenceSchema,
    jurisdiction: z.string().trim().min(1),
    originalTitle: z.string().trim().min(1),
    sourceLanguage: z.string().trim().min(2).max(16),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "Sources must use HTTPS"),
    retrievedAt: isoInstantSchema,
    availability: z.enum(["reachable", "unavailable"]),
    expectedContentType: z.enum(["html", "pdf", "json"]),
    allowedRedirectHosts: z.array(hostnameSchema).default([]),
    contentFingerprint: z.string().trim().min(8).optional(),
    archivedSnapshotRef: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((source, context) => {
    if ((source.tier === "secondary") !== (source.precedence === "secondary")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["precedence"],
        message: "Secondary tier and secondary precedence must agree",
      });
    }
    if (new Set(source.derivesFromSourceIds).size !== source.derivesFromSourceIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["derivesFromSourceIds"],
        message: "Source derivation references must be unique",
      });
    }
    if (new Set(source.allowedRedirectHosts).size !== source.allowedRedirectHosts.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedRedirectHosts"],
        message: "Allowed redirect hosts must be unique",
      });
    }
  });

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const fragmentCheckConfigSchema = z
  .object({
    id: identifierSchema,
    sourceId: identifierSchema,
    claimIds: z.array(identifierSchema).min(1),
    // Table legends can be meaningful short tokens (for example, a passport
    // column key). Semantic review still decides whether a compact locator is
    // sufficient for a claim contract.
    requiredText: z.array(z.string().trim().min(3)).min(1),
    maximumSpanCharacters: z.number().int().positive().max(20_000),
  })
  .strict();

export const monitoringConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: identifierSchema,
    fetcherVersion: identifierSchema,
    normalizerVersion: identifierSchema,
    timeoutMs: z.number().int().min(1_000).max(60_000),
    maximumResponseBytes: z.number().int().min(1_024).max(25 * 1024 * 1024),
    maximumRedirects: z.number().int().min(0).max(10),
    fragmentChecks: z.array(fragmentCheckConfigSchema),
  })
  .strict()
  .superRefine((config, context) => {
    const ids = new Set<string>();
    config.fragmentChecks.forEach((check, index) => {
      if (ids.has(check.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fragmentChecks", index, "id"],
          message: `Duplicate fragment check ID: ${check.id}`,
        });
      }
      ids.add(check.id);
    });
  });

export const fragmentObservationSchema = z
  .object({
    id: identifierSchema,
    claimIds: z.array(identifierSchema).min(1),
    status: z.enum(["matched_unattested", "exact_match", "missing", "ambiguous", "not_evaluated"]),
    contextSha256: sha256Schema.optional(),
    contextCharacters: z.number().int().nonnegative().optional(),
    evidence: z.array(z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      extract: z.string().min(1).max(900),
      extractSha256: sha256Schema,
    }).strict()).optional(),
    reasonCode: identifierSchema,
  })
  .strict()
  .superRefine((fragment, context) => {
    if (["matched_unattested", "exact_match"].includes(fragment.status) && !fragment.contextSha256) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contextSha256"],
        message: "A matched fragment needs a context fingerprint",
      });
    }
  });

export const sourceObservationSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    id: identifierSchema,
    sourceId: identifierSchema,
    observedAt: isoInstantSchema,
    requestedUrl: z.string().url(),
    finalUrl: z.string().url(),
    redirectChain: z.array(z.object({
      url: z.string().url(),
      status: z.number().int().min(100).max(599),
      location: z.string().min(1).optional(),
    }).strict()),
    status: z.enum(["reachable", "unavailable", "blocked", "parse_failed"]),
    httpStatus: z.number().int().min(100).max(599).nullable(),
    contentType: z.string().nullable(),
    bytes: z.number().int().nonnegative().nullable(),
    rawSha256: sha256Schema.nullable(),
    normalizedSha256: sha256Schema.nullable(),
    normalization: identifierSchema.nullable(),
    fetcherVersion: identifierSchema,
    etag: z.string().nullable(),
    lastModified: z.string().nullable(),
    reasonCode: z.string().trim().min(1).max(240),
    fragmentChecks: z.array(fragmentObservationSchema),
  })
  .strict()
  .superRefine((observation, context) => {
    if (observation.status === "reachable" && (
      observation.bytes === null ||
      observation.rawSha256 === null ||
      observation.normalizedSha256 === null ||
      observation.normalization === null
    )) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "A reachable observation needs body and normalization fingerprints",
      });
    }
  });

const monitorCountSchema = z.number().int().nonnegative();

export const monitoringRunSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    id: identifierSchema,
    mode: z.enum(["monitor_only", "evidence_acquisition"]),
    complete: z.boolean(),
    eligibleForFreshnessRenewal: z.literal(false),
    catalogReleaseId: identifierSchema,
    policyVersion: identifierSchema,
    fetcherVersion: identifierSchema,
    normalizerVersion: identifierSchema,
    startedAt: isoInstantSchema,
    completedAt: isoInstantSchema,
    observedAt: isoInstantSchema,
    summary: z.object({
      reachable: monitorCountSchema,
      unavailable: monitorCountSchema,
      blocked: monitorCountSchema,
      parse_failed: monitorCountSchema,
      fragments: z.object({
        matched_unattested: monitorCountSchema,
        exact_match: monitorCountSchema.default(0),
        missing: monitorCountSchema,
        ambiguous: monitorCountSchema,
        not_evaluated: monitorCountSchema,
      }).strict(),
    }).strict(),
    observations: z.array(sourceObservationSchema),
  })
  .strict()
  .superRefine((run, context) => {
    const observedCount = run.summary.reachable + run.summary.unavailable + run.summary.blocked + run.summary.parse_failed;
    if (observedCount !== run.observations.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["summary"],
        message: "Observation summary must equal the observation count",
      });
    }
    const sourceIds = new Set<string>();
    const observationIds = new Set<string>();
    run.observations.forEach((observation, index) => {
      if (sourceIds.has(observation.sourceId) || observationIds.has(observation.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["observations", index],
          message: "A monitoring run needs exactly one uniquely identified observation per source",
        });
      }
      sourceIds.add(observation.sourceId);
      observationIds.add(observation.id);
    });
    const fragmentCount = Object.values(run.summary.fragments).reduce((sum, count) => sum + count, 0);
    const actualFragmentCount = run.observations.reduce((sum, observation) => sum + observation.fragmentChecks.length, 0);
    if (fragmentCount !== actualFragmentCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["summary", "fragments"],
        message: "Fragment summary must equal the fragment observation count",
      });
    }
  });

export const monitoringReportsSchema = z.object({
  schemaVersion: z.literal(1),
  runs: z.array(monitoringRunSchema),
}).strict();

const evidenceAutomationStateSchema = z.enum([
  "current",
  "due",
  "candidate",
  "uncovered",
  "unavailable",
  "changed",
  "contradictory",
  "stale",
]);

export const evidenceContractSchema = z.object({
  schemaVersion: z.literal(2),
  id: identifierSchema,
  version: z.number().int().positive(),
  claimId: identifierSchema,
  claimRevision: z.number().int().positive(),
  basis: z.literal("pinned_semantic_baseline"),
  expectedFactSha256: sha256Schema,
  expectedApplicabilitySha256: sha256Schema,
  requiredFragments: z.array(z.object({
    sourceId: identifierSchema,
    fragmentId: identifierSchema,
    expectedContextSha256: sha256Schema,
  }).strict()).min(1),
  minimumIndependentGroups: z.number().int().positive(),
  policyVersion: identifierSchema,
  activatedAt: isoInstantSchema,
  baselineProvenance: z.object({
    kind: z.enum(["deterministic_pipeline", "model_pipeline"]),
    producerId: identifierSchema,
    producerVersion: identifierSchema,
    producedAt: isoInstantSchema,
    monitoringRunId: identifierSchema,
  }).strict(),
}).strict();

export const evidenceContractsSchema = z.object({
  schemaVersion: z.literal(2),
  policyVersion: identifierSchema,
  currentForDays: z.number().int().positive(),
  staleAfterDays: z.number().int().positive(),
  contracts: z.array(evidenceContractSchema),
}).strict().superRefine((value, context) => {
  if (value.currentForDays >= value.staleAfterDays) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["staleAfterDays"], message: "Stale threshold must be later than current threshold" });
  }
  const ids = new Set<string>();
  const claims = new Set<string>();
  value.contracts.forEach((contract, index) => {
    if (ids.has(contract.id) || claims.has(contract.claimId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["contracts", index], message: "Contract IDs and claim mappings must be unique" });
    }
    if (contract.policyVersion !== value.policyVersion) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["contracts", index, "policyVersion"], message: "Contract policy version must match its collection" });
    }
    ids.add(contract.id);
    claims.add(contract.claimId);
  });
});

export const evidenceDecisionSchema = z.object({
  id: identifierSchema,
  claimId: identifierSchema,
  contractId: identifierSchema.nullable(),
  contractVersion: z.number().int().positive().nullable(),
  basis: z.literal("pinned_semantic_baseline").nullable(),
  state: evidenceAutomationStateSchema,
  publicAction: z.enum(["no_change", "queue_exception"]),
  handler: z.enum(["scheduled_monitor", "contract_authoring", "source_discovery", "source_recovery", "policy_resolution", "semantic_reextraction", "precedence_resolution"]),
  observationIds: z.array(identifierSchema),
  independentGroups: z.array(identifierSchema),
  expectedFactSha256: sha256Schema,
  expectedApplicabilitySha256: sha256Schema,
  mayAutoPublish: z.boolean(),
  mayRenewFreshness: z.boolean(),
  proofPacketIds: z.array(identifierSchema).optional(),
  reasonCodes: z.array(identifierSchema).min(1),
}).strict();

export const proofPacketSchema = z.object({
  schemaVersion: z.literal(1),
  id: identifierSchema,
  claimId: identifierSchema,
  claimRevision: z.number().int().positive(),
  factSha256: sha256Schema,
  applicabilitySha256: sha256Schema,
  sourceId: identifierSchema,
  observationId: identifierSchema,
  observedAt: isoInstantSchema,
  requestedUrl: z.string().url(),
  finalUrl: z.string().url(),
  rawSha256: sha256Schema,
  normalizedSha256: sha256Schema,
  fragmentId: identifierSchema,
  contextSha256: sha256Schema,
  extracts: z.array(z.object({ extract: z.string().min(1).max(900), extractSha256: sha256Schema }).strict()).min(1),
  extractorId: identifierSchema,
  extractorVersion: identifierSchema,
  packetSha256: sha256Schema,
}).strict();

export const evidenceAutomationRunSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  id: identifierSchema,
  mode: z.enum(["advisory_only", "authoritative_automation"]),
  eligibleForActions: z.boolean(),
  catalogReleaseId: identifierSchema,
  monitoringRunId: identifierSchema,
  policyVersion: identifierSchema,
  assessedAt: isoInstantSchema,
  previousRunSha256: sha256Schema.nullable(),
  summary: z.object({
    total: monitorCountSchema,
    states: z.object({
      current: monitorCountSchema,
      due: monitorCountSchema,
      candidate: monitorCountSchema,
      uncovered: monitorCountSchema,
      unavailable: monitorCountSchema,
      changed: monitorCountSchema,
      contradictory: monitorCountSchema,
      stale: monitorCountSchema,
    }).strict(),
    exceptions: monitorCountSchema,
  }).strict(),
  decisions: z.array(evidenceDecisionSchema),
  proofPackets: z.array(proofPacketSchema).optional(),
  reportSha256: sha256Schema,
}).strict().superRefine((run, context) => {
  if (run.summary.total !== run.decisions.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "total"], message: "Decision count must equal summary total" });
  }
  const stateTotal = Object.values(run.summary.states).reduce((sum, count) => sum + count, 0);
  if (stateTotal !== run.decisions.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["summary", "states"], message: "State counts must equal decision count" });
  }
});

export const evidenceAutomationReportsSchema = z.object({
  schemaVersion: z.literal(1),
  runs: z.array(evidenceAutomationRunSchema),
}).strict();

export const ageRangeSchema = z
  .object({
    minInclusive: z.number().int().min(0).max(120),
    maxInclusive: z.number().int().min(0).max(120),
  })
  .strict()
  .refine((range) => range.minInclusive <= range.maxInclusive, {
    message: "Age range minimum must not exceed its maximum",
  });

export const applicabilitySchema = z
  .object({
    nationalities: z.tuple([z.literal("RU")]).default(["RU"]),
    passportTypes: z.tuple([z.literal("ordinary")]).default(["ordinary"]),
    travellerKinds: z.array(travellerKindSchema).min(1),
    childAgeRange: ageRangeSchema.optional(),
    applicationOrigins: z.array(z.string().trim().min(1)).optional(),
    entryPoints: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const stayRuleSchema = z.union([
  z
    .object({
      kind: z.literal("per_entry"),
      allowedDays: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("rolling_window"),
      allowedDays: z.number().int().positive(),
      windowDays: z.number().int().positive(),
    })
    .strict()
    .refine((rule) => rule.allowedDays <= rule.windowDays, {
      message: "Allowed days cannot exceed the rolling window",
    }),
  z
    .object({
      kind: z.literal("compound"),
      constraints: z
        .array(
          z.union([
            z
              .object({
                kind: z.literal("per_entry"),
                allowedDays: z.number().int().positive(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("rolling_window"),
                allowedDays: z.number().int().positive(),
                windowDays: z.number().int().positive(),
              })
              .strict()
              .refine((rule) => rule.allowedDays <= rule.windowDays, {
                message: "Allowed days cannot exceed the rolling window",
              }),
          ]),
        )
        .min(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("calendar_period"),
      allowedMonths: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("authorization_dependent"),
      requestableDays: z.number().int().positive(),
    })
    .strict(),
]);

export const routeRequirementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ordinary_passport_present") }).strict(),
  z
    .object({
      kind: z.literal("passport_validity"),
      basis: z.enum(["arrival", "planned_departure"]),
      minimumRemainingDays: z.number().int().min(0).optional(),
      minimumRemainingCalendarMonths: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("entry_authorization"),
      authorizationKind: z.enum(["evisa", "visitor_visa", "other"]),
      obligation: z.literal("required").default("required"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("declared_document"),
      documentKind: z.enum([
        "insurance",
        "accommodation",
        "onward_ticket",
        "guardian_consent",
        "birth_certificate",
        "proof_of_funds",
        "passport_blank_pages",
        "passport_scan",
        "portrait_photo",
        "printed_eta",
        "other",
      ]),
      obligation: z
        .enum([
          "required",
          "may_be_requested",
          "recommended",
          "not_required",
        ])
        .default("required"),
    })
    .strict(),
]);

export const claimFactSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("nationality_eligibility"),
      nationality: z.literal("RU"),
      eligible: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("passport_type_eligibility"),
      passportType: z.literal("ordinary"),
      eligible: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("route_availability"),
      availability: routeAvailabilitySchema.exclude(["not_established"]),
    })
    .strict(),
  z.object({ kind: z.literal("stay_rule"), rule: stayRuleSchema }).strict(),
  z
    .object({
      kind: z.literal("requirement"),
      requirement: routeRequirementSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("traveller_applicability"),
      applies: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("arrival_registration"),
      withinHours: z.number().int().positive(),
      responsibleParty: z.enum([
        "accommodation_provider_or_host",
        "traveller_when_self_arranged",
      ]),
    })
    .strict(),
  z.object({
    kind: z.literal("application_timing"),
    minimumDaysBeforeArrival: z.number().int().nonnegative(),
    maximumDaysBeforeArrival: z.number().int().positive().optional(),
  }).strict(),
  z.object({
    kind: z.literal("entry_restriction"),
    restriction: z.enum(["designated_airports_or_seaports", "named_entry_points"]),
    entryPoints: z.array(z.string().trim().min(1)).min(1),
  }).strict(),
  z.object({
    kind: z.literal("per_traveller_application"),
    required: z.boolean(),
  }).strict(),
  z.object({
    kind: z.literal("qualifying_purpose"),
    purposes: z.array(z.string().trim().min(1)).min(1),
    truthfulDeclarationRequired: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("fee_rule"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    amountMinor: z.number().int().nonnegative(),
    perTraveller: z.boolean(),
    refundable: z.boolean(),
  }).strict(),
]);

export const evidenceClaimSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: identifierSchema,
    subjectId: identifierSchema,
    revision: z.number().int().positive(),
    criticality: z.enum(["gate", "explanation", "context"]),
    fact: claimFactSchema,
    summary: localizedTextSchema,
    limitations: z.array(localizedTextSchema).default([]),
    applicability: applicabilitySchema,
    supportingSourceIds: z.array(identifierSchema),
    contradictingSourceIds: z.array(identifierSchema).default([]),
    effectiveFrom: isoInstantSchema.optional(),
    effectiveUntilExclusive: isoInstantSchema.optional(),
    producer: z.object({
      kind: z.enum(["deterministic_pipeline", "model_pipeline", "operator_input"]),
      systemId: identifierSchema,
      version: identifierSchema,
    }).strict(),
    supersedes: identifierSchema.optional(),
  })
  .strict()
  .superRefine((claim, context) => {
    if (claim.fact.kind !== "requirement" || claim.fact.requirement.kind !== "passport_validity") return;
    const { minimumRemainingDays, minimumRemainingCalendarMonths } = claim.fact.requirement;
    if ((minimumRemainingDays === undefined) === (minimumRemainingCalendarMonths === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fact", "requirement"],
        message: "Passport validity needs exactly one duration form",
      });
    }
  });

export const documentRouteSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    placeId: identifierSchema,
    kind: z.enum(["visa_free", "visa_on_arrival", "evisa", "visitor_visa"]),
    ordinary: z.boolean(),
    publicationState: z.enum(["candidate", "published", "withdrawn"]),
    claimIds: z.array(identifierSchema).min(1),
  })
  .strict();

export const passportDeclarationSchema = z.discriminatedUnion("state", [
  z
    .object({
      state: z.literal("present"),
      expiresOn: localDateSchema,
    })
    .strict(),
  z.object({ state: z.literal("missing") }).strict(),
  z.object({ state: z.literal("unknown") }).strict(),
]);

export const documentDeclarationSchema = z
  .object({
    kind: z.enum([
      "insurance",
      "accommodation",
      "onward_ticket",
      "guardian_consent",
      "birth_certificate",
      "proof_of_funds",
      "passport_blank_pages",
      "passport_scan",
      "portrait_photo",
      "printed_eta",
      "other",
    ]),
    state: z.enum(["present", "missing", "unknown"]),
  })
  .strict();

export const authorizationDeclarationSchema = z
  .object({
    kind: z.enum(["evisa", "visitor_visa", "other"]),
    state: z.enum(["present", "missing", "unknown"]),
    validUntil: localDateSchema.optional(),
  })
  .strict();

const travellerDocumentsShape = {
  ordinaryPassport: passportDeclarationSchema,
  documents: z.array(documentDeclarationSchema).default([]),
  authorizations: z.array(authorizationDeclarationSchema).default([]),
};

export const adultProfileSchema = z.object(travellerDocumentsShape).strict();

export const childProfileSchema = z
  .object({
    ...travellerDocumentsShape,
    ageYears: z.number().int().min(6).max(17),
  })
  .strict();

const householdBaseShape = {
  schemaVersion: z.literal(1),
  children: z.tuple([childProfileSchema, childProfileSchema]),
  cashAvailable: z
    .object({
      amountMinor: z.number().int().nonnegative(),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .strict()
    .optional(),
  mode: z.enum(["emergency", "basic", "soft_landing"]).optional(),
  urgency: z.enum(["now", "7_days", "30_days", "building_option"]).optional(),
};

export const humanHouseholdProfileSchema = z.discriminatedUnion("adultCount", [
  z
    .object({
      ...householdBaseShape,
      adultCount: z.literal(1),
      adults: z.tuple([adultProfileSchema]),
    })
    .strict(),
  z
    .object({
      ...householdBaseShape,
      adultCount: z.literal(2),
      adults: z.tuple([adultProfileSchema, adultProfileSchema]),
    })
    .strict(),
]);

export const journeyContextSchema = z
  .object({
    origin: originSchema.default("moscow"),
    arrivalOn: localDateSchema.optional(),
    plannedDepartureOn: localDateSchema.optional(),
    entryPoint: z.string().trim().min(1).optional(),
    priorPresenceDaysInWindow: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine(
    (journey) =>
      !journey.arrivalOn ||
      !journey.plannedDepartureOn ||
      journey.arrivalOn <= journey.plannedDepartureOn,
    { message: "Planned departure cannot precede arrival" },
  );

export const petPartyProfileSchema = z
  .object({
    largeDogCount: z
      .union([z.literal(0), z.literal(1), z.literal(2)])
      .default(0),
  })
  .strict();

export const petTravelAssessmentSchema = z.enum([
  "not_requested",
  "not_assessed",
  "requirements_known",
  "missing_requirements",
  "operationally_uncertain",
]);

export const placeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    city: localizedTextSchema,
    country: localizedTextSchema,
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
    routeIds: z.array(identifierSchema),
    publicationState: z.enum(["candidate", "published", "withdrawn"]),
    unknowns: z.array(localizedTextSchema).default([]),
  })
  .strict();

export const costObservationSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    placeId: identifierSchema,
    origin: originSchema,
    household: z
      .object({
        adults: z.union([z.literal(1), z.literal(2)]),
        childAges: z.tuple([
          z.number().int().min(6).max(17),
          z.number().int().min(6).max(17),
        ]),
      })
      .strict(),
    mode: z.enum(["emergency", "basic"]),
    observedFrom: localDateSchema,
    observedUntil: localDateSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    exchangeRateDate: localDateSchema.optional(),
    lowerMinor: z.number().int().nonnegative(),
    upperMinor: z.number().int().nonnegative(),
    inclusions: z.array(z.string().trim().min(1)).min(1),
    methodology: localizedTextSchema,
    sourceIds: z.array(identifierSchema).min(1),
  })
  .strict()
  .refine((cost) => cost.lowerMinor <= cost.upperMinor, {
    message: "Cost range lower bound must not exceed its upper bound",
  });

export const changeRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    changedAt: isoInstantSchema,
    subjectId: identifierSchema,
    summary: localizedTextSchema,
    previousValue: z.unknown().optional(),
    nextValue: z.unknown(),
    reason: localizedTextSchema,
    sourceIds: z.array(identifierSchema).default([]),
    rollbackReleaseId: identifierSchema.optional(),
    producer: z.object({
      kind: z.enum(["deterministic_pipeline", "model_pipeline", "operator_policy_change"]),
      systemId: identifierSchema,
      version: identifierSchema,
      runId: identifierSchema,
    }).strict(),
    releaseId: identifierSchema,
  })
  .strict();

function addDuplicateIssues(
  records: readonly { id: string }[],
  path: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  records.forEach((record, index) => {
    if (seen.has(record.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, "id"],
        message: `Duplicate ID: ${record.id}`,
      });
    }
    seen.add(record.id);
  });
}

export const contentCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseId: identifierSchema,
    sources: z.array(sourceRecordSchema),
    claims: z.array(evidenceClaimSchema),
    routes: z.array(documentRouteSchema),
    places: z.array(placeSchema),
    costObservations: z.array(costObservationSchema),
    changes: z.array(changeRecordSchema),
  })
  .strict()
  .superRefine((catalog, context) => {
    addDuplicateIssues(catalog.sources, "sources", context);
    addDuplicateIssues(catalog.claims, "claims", context);
    addDuplicateIssues(catalog.routes, "routes", context);
    addDuplicateIssues(catalog.places, "places", context);
    addDuplicateIssues(catalog.costObservations, "costObservations", context);
    addDuplicateIssues(catalog.changes, "changes", context);

    const sourceIds = new Set(catalog.sources.map((source) => source.id));
    const claimsById = new Map(catalog.claims.map((claim) => [claim.id, claim]));
    const routeIds = new Set(catalog.routes.map((route) => route.id));
    const placeIds = new Set(catalog.places.map((place) => place.id));

    catalog.sources.forEach((source, index) => {
      source.derivesFromSourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sources", index, "derivesFromSourceIds"],
            message: `Unknown source derivation reference: ${sourceId}`,
          });
        }
        if (sourceId === source.id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sources", index, "derivesFromSourceIds"],
            message: "A source cannot derive from itself",
          });
        }
      });
    });
    const derivations = new Map(
      catalog.sources.map((source) => [source.id, source.derivesFromSourceIds]),
    );
    const visiting = new Set<string>();
    const visited = new Set<string>();
    function visitSource(sourceId: string): boolean {
      if (visiting.has(sourceId)) return true;
      if (visited.has(sourceId)) return false;
      visiting.add(sourceId);
      const hasCycle = (derivations.get(sourceId) ?? []).some(visitSource);
      visiting.delete(sourceId);
      visited.add(sourceId);
      return hasCycle;
    }
    catalog.sources.forEach((source, index) => {
      if (visitSource(source.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "derivesFromSourceIds"],
          message: "Source derivation graph must be acyclic",
        });
      }
    });

    catalog.claims.forEach((claim, index) => {
      [...claim.supportingSourceIds, ...claim.contradictingSourceIds].forEach(
        (sourceId) => {
          if (!sourceIds.has(sourceId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["claims", index],
              message: `Unknown source reference: ${sourceId}`,
            });
          }
        },
      );
    });

    catalog.changes.forEach((change, index) => {
      change.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["changes", index, "sourceIds"],
            message: `Unknown change source reference: ${sourceId}`,
          });
        }
      });
    });

    catalog.routes.forEach((route, index) => {
      if (new Set(route.claimIds).size !== route.claimIds.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes", index, "claimIds"],
          message: "Route claim references must be unique",
        });
      }
      if (!placeIds.has(route.placeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes", index, "placeId"],
          message: `Unknown place reference: ${route.placeId}`,
        });
      }
      route.claimIds.forEach((claimId) => {
        const claim = claimsById.get(claimId);
        if (!claim) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["routes", index, "claimIds"],
            message: `Unknown claim reference: ${claimId}`,
          });
        } else if (claim.subjectId !== route.id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["routes", index, "claimIds"],
            message: `Claim ${claimId} belongs to ${claim.subjectId}, not ${route.id}`,
          });
        }
      });
      const owningPlace = catalog.places.find((place) => place.id === route.placeId);
      if (owningPlace && !owningPlace.routeIds.includes(route.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routes", index, "placeId"],
          message: `Route ${route.id} must be listed by its declared place ${route.placeId}`,
        });
      }
    });

    catalog.places.forEach((place, index) => {
      if (new Set(place.routeIds).size !== place.routeIds.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["places", index, "routeIds"],
          message: "Place route references must be unique",
        });
      }
      place.routeIds.forEach((routeId) => {
        const route = catalog.routes.find((item) => item.id === routeId);
        if (!routeIds.has(routeId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["places", index, "routeIds"],
            message: `Unknown route reference: ${routeId}`,
          });
        } else if (route?.placeId !== place.id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["places", index, "routeIds"],
            message: `Route ${routeId} belongs to ${route?.placeId}, not ${place.id}`,
          });
        }
      });
    });

    catalog.costObservations.forEach((cost, index) => {
      if (!placeIds.has(cost.placeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["costObservations", index, "placeId"],
          message: `Unknown place reference: ${cost.placeId}`,
        });
      }
      cost.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["costObservations", index, "sourceIds"],
            message: `Unknown source reference: ${sourceId}`,
          });
        }
      });
    });
  });

export type SourceRecord = z.infer<typeof sourceRecordSchema>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;
export type EvidenceDecision = z.infer<typeof evidenceDecisionSchema>;
export type ProofPacket = z.infer<typeof proofPacketSchema>;
export type EvidenceAutomationRun = z.infer<typeof evidenceAutomationRunSchema>;
export type EvidenceCondition = z.infer<typeof evidenceConditionSchema>;
export type RouteAvailability = z.infer<typeof routeAvailabilitySchema>;
export type HouseholdReadiness = z.infer<typeof householdReadinessSchema>;
export type DocumentRoute = z.infer<typeof documentRouteSchema>;
export type HumanHouseholdProfile = z.infer<typeof humanHouseholdProfileSchema>;
export type JourneyContext = z.infer<typeof journeyContextSchema>;
export type PetPartyProfile = z.infer<typeof petPartyProfileSchema>;
export type ContentCatalog = z.infer<typeof contentCatalogSchema>;
