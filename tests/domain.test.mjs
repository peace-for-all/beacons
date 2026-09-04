import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { createServer } from "vite";
import { fingerprint } from "../scripts/lib/evidence-automation-core.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

const schemas = await vite.ssrLoadModule("/lib/domain/schemas.ts");
const freshness = await vite.ssrLoadModule("/lib/domain/freshness.ts");
const humanRoutes = await vite.ssrLoadModule(
  "/lib/domain/human-route-evaluator.ts",
);
const runSelection = await vite.ssrLoadModule(
  "/lib/domain/evidence-run-selection.ts",
);
const petLogistics = await vite.ssrLoadModule("/lib/domain/pet-logistics.ts");

after(async () => {
  await vite.close();
});

const primarySource = schemas.sourceRecordSchema.parse({
  schemaVersion: 2,
  id: "source.official",
  tier: "primary",
  authority: "foreign_ministry",
  publisher: "Example foreign ministry",
  publisherEntityId: "authority.example-foreign-ministry",
  publicationChainId: "publication.example-entry-rules",
  originEntityId: "authority.example-foreign-ministry",
  independenceGroupId: "lineage.example-entry-rules",
  derivesFromSourceIds: [],
  precedence: "official_rule",
  jurisdiction: "Example",
  originalTitle: "Entry rules",
  sourceLanguage: "en",
  url: "https://example.gov/entry",
  retrievedAt: "2026-09-01T00:00:00.000Z",
  availability: "reachable",
  expectedContentType: "html",
  allowedRedirectHosts: [],
  contentFingerprint: "sha256-example",
});

function makeClaim(id, fact, overrides = {}) {
  return schemas.evidenceClaimSchema.parse({
    schemaVersion: 2,
    id,
    subjectId: "route.example",
    revision: 1,
    criticality: "gate",
    fact,
    summary: {
      en: `Test claim ${id}`,
      ru: `Тестовое утверждение ${id}`,
    },
    limitations: [],
    applicability: {
      travellerKinds: ["adult", "child"],
      childAgeRange: { minInclusive: 6, maxInclusive: 17 },
    },
    supportingSourceIds: [primarySource.id],
    producer: {
      kind: "deterministic_pipeline",
      systemId: "test-claim-builder",
      version: "fixture-v2",
    },
    ...overrides,
  });
}

const baseClaims = [
  makeClaim("claim.nationality", {
    kind: "nationality_eligibility",
    nationality: "RU",
    eligible: true,
  }),
  makeClaim("claim.passport", {
    kind: "passport_type_eligibility",
    passportType: "ordinary",
    eligible: true,
  }),
  makeClaim("claim.availability", {
    kind: "route_availability",
    availability: "verified_eligible",
  }),
  makeClaim("claim.stay", {
    kind: "stay_rule",
    rule: { kind: "per_entry", allowedDays: 30 },
  }),
  makeClaim("claim.passport-present", {
    kind: "requirement",
    requirement: { kind: "ordinary_passport_present" },
  }),
  makeClaim("claim.passport-validity", {
    kind: "requirement",
    requirement: {
      kind: "passport_validity",
      basis: "arrival",
      minimumRemainingDays: 0,
    },
  }),
  makeClaim("claim.traveller-applicability", {
    kind: "traveller_applicability",
    applies: true,
  }),
  makeClaim("claim.entry-point", {
    kind: "entry_restriction",
    restriction: "named_entry_points",
    entryPoints: ["Example Border"],
  }),
];

const baseRoute = schemas.documentRouteSchema.parse({
  schemaVersion: 1,
  id: "route.example",
  placeId: "place.example",
  kind: "visa_free",
  ordinary: true,
  publicationState: "candidate",
  claimIds: baseClaims.map((claim) => claim.id),
});

const sha256 = "a".repeat(64);
const textSha256 = (value) => createHash("sha256").update(value).digest("hex");

function automationRunFor(claims, options = {}) {
  const assessedAt = options.assessedAt ?? "2026-09-01T00:00:00.000Z";
  const defaultState = options.defaultState ?? "current";
  const decisions = claims.map((claim) => {
    const state = options.states?.[claim.id] ?? defaultState;
    const supported = state === "current" || state === "due";
    return {
      id: `decision.${claim.id.replace(/^claim\./, "")}.fixture`,
      claimId: claim.id,
      contractId: `contract.${claim.id.replace(/^claim\./, "")}.v1`,
      contractVersion: 1,
      basis: "pinned_semantic_baseline",
      state,
      publicAction: supported ? "no_change" : "queue_exception",
      handler: state === "due" || state === "current" ? "scheduled_monitor" : state === "contradictory" ? "precedence_resolution" : state === "unavailable" || state === "stale" ? "source_recovery" : "semantic_reextraction",
      observationIds: [`observation.${claim.id.replace(/^claim\./, "")}.fixture`],
      independentGroups: ["lineage.example-entry-rules"],
      expectedFactSha256: fingerprint(claim.fact),
      expectedApplicabilitySha256: fingerprint(claim.applicability),
      mayAutoPublish: state === "current",
      mayRenewFreshness: state === "current",
      proofPacketIds: supported ? [`proof.${claim.id.replace(/^claim\./, "")}.fixture`] : [],
      reasonCodes: [state === "current" ? "proof_policy_satisfied" : `automation_${state}`],
    };
  });
  const states = Object.fromEntries(["current", "due", "candidate", "uncovered", "unavailable", "changed", "contradictory", "stale"].map((state) => [state, decisions.filter((decision) => decision.state === state).length]));
  const proofPackets = decisions.flatMap((decision) => {
    if (!decision.proofPacketIds.length) return [];
    const claim = claims.find((item) => item.id === decision.claimId);
    const packetWithoutHash = {
      schemaVersion: 1,
      id: decision.proofPacketIds[0],
      claimId: claim.id,
      claimRevision: claim.revision,
      factSha256: fingerprint(claim.fact),
      applicabilitySha256: fingerprint(claim.applicability),
      sourceId: primarySource.id,
      observationId: decision.observationIds[0],
      observedAt: assessedAt,
      requestedUrl: primarySource.url,
      finalUrl: primarySource.url,
      rawSha256: sha256,
      normalizedSha256: sha256,
      fragmentId: `fragment.${claim.id.replace(/^claim\./, "")}.fixture`,
      contextSha256: sha256,
      extracts: [{ extract: `Official evidence for ${claim.id}`, extractSha256: textSha256(`Official evidence for ${claim.id}`) }],
      extractorId: "fixture-extractor",
      extractorVersion: "fixture-v2",
    };
    return [{ ...packetWithoutHash, packetSha256: fingerprint(packetWithoutHash) }];
  });
  const runWithoutHash = {
    schemaVersion: 2,
    id: "automation.fixture.authoritative",
    mode: "authoritative_automation",
    eligibleForActions: true,
    catalogReleaseId: "release.fixture",
    monitoringRunId: "monitor.fixture",
    policyVersion: "proof-policy-v2",
    assessedAt,
    previousRunSha256: null,
    summary: { total: decisions.length, states, exceptions: decisions.filter((decision) => decision.publicAction === "queue_exception").length },
    decisions,
    proofPackets,
  };
  return schemas.evidenceAutomationRunSchema.parse({
    ...runWithoutHash,
    reportSha256: fingerprint(runWithoutHash),
  });
}

const baseAutomationRun = automationRunFor(baseClaims);

function presentTraveller() {
  return {
    ordinaryPassport: { state: "present", expiresOn: "2028-01-01" },
    documents: [],
    authorizations: [],
  };
}

function household(adultCount = 1, childAges = [6, 17]) {
  const adults = Array.from({ length: adultCount }, presentTraveller);
  return schemas.humanHouseholdProfileSchema.parse({
    schemaVersion: 1,
    adultCount,
    adults,
    children: childAges.map((ageYears) => ({
      ...presentTraveller(),
      ageYears,
    })),
  });
}

test("v1 household supports one or two adults and exactly two children", () => {
  assert.equal(household(1).adults.length, 1);
  assert.equal(household(2).adults.length, 2);

  const oneChild = {
    schemaVersion: 1,
    adultCount: 1,
    adults: [presentTraveller()],
    children: [{ ...presentTraveller(), ageYears: 10 }],
  };
  assert.equal(schemas.humanHouseholdProfileSchema.safeParse(oneChild).success, false);

  const threeAdults = {
    ...oneChild,
    adultCount: 3,
    adults: [presentTraveller(), presentTraveller(), presentTraveller()],
    children: [
      { ...presentTraveller(), ageYears: 10 },
      { ...presentTraveller(), ageYears: 12 },
    ],
  };
  assert.equal(
    schemas.humanHouseholdProfileSchema.safeParse(threeAdults).success,
    false,
  );
});

test("v1 school-age product boundary is 6 through 17 inclusive", () => {
  assert.deepEqual(household(1, [6, 17]).children.map((child) => child.ageYears), [6, 17]);
  assert.equal(
    schemas.humanHouseholdProfileSchema.safeParse({
      schemaVersion: 1,
      adultCount: 1,
      adults: [presentTraveller()],
      children: [
        { ...presentTraveller(), ageYears: 5 },
        { ...presentTraveller(), ageYears: 17 },
      ],
    }).success,
    false,
  );
  assert.equal(
    schemas.humanHouseholdProfileSchema.safeParse({
      schemaVersion: 1,
      adultCount: 1,
      adults: [presentTraveller()],
      children: [
        { ...presentTraveller(), ageYears: 6 },
        { ...presentTraveller(), ageYears: 18 },
      ],
    }).success,
    false,
  );
});

test("profiles reject names, birth dates, and malformed passport declarations", () => {
  const withName = {
    schemaVersion: 1,
    adultCount: 1,
    adults: [{ ...presentTraveller(), name: "Not collected" }],
    children: [
      { ...presentTraveller(), ageYears: 8 },
      { ...presentTraveller(), ageYears: 12 },
    ],
  };
  assert.equal(
    schemas.humanHouseholdProfileSchema.safeParse(withName).success,
    false,
  );
  assert.equal(
    schemas.passportDeclarationSchema.safeParse({ state: "present" }).success,
    false,
  );
  assert.equal(
    schemas.passportDeclarationSchema.safeParse({
      state: "missing",
      expiresOn: "2027-01-01",
    }).success,
    false,
  );
});

test("journey defaults to Moscow and permits Saint Petersburg explicitly", () => {
  assert.equal(schemas.journeyContextSchema.parse({}).origin, "moscow");
  assert.equal(
    schemas.journeyContextSchema.parse({ origin: "saint_petersburg" }).origin,
    "saint_petersburg",
  );
});

test("large-dog input is capped at two and kept deliberately minimal", () => {
  assert.equal(schemas.petPartyProfileSchema.parse({}).largeDogCount, 0);
  assert.equal(
    schemas.petPartyProfileSchema.parse({ largeDogCount: 2 }).largeDogCount,
    2,
  );
  assert.equal(
    schemas.petPartyProfileSchema.safeParse({ largeDogCount: 3 }).success,
    false,
  );
});

test("claims require accountable machine producer provenance", () => {
  assert.equal(
    schemas.evidenceClaimSchema.safeParse({
      ...baseClaims[0],
      producer: undefined,
    }).success,
    false,
  );
  const humanReviewFields = {
    ...baseClaims[0],
    reviewState: "verified",
    verifierId: "project-owner",
    verifiedAt: "2026-09-01T12:00:00.000Z",
    semanticParityReview: { status: "approved" },
  };
  assert.equal(schemas.evidenceClaimSchema.safeParse(humanReviewFields).success, false);
});

test("freshness boundaries are driven by the authoritative automation run", () => {
  const claim = makeClaim(
    "claim.freshness",
    {
      kind: "traveller_applicability",
      applies: true,
    },
  );
  const currentRun = automationRunFor([claim], { assessedAt: "2026-08-25T00:00:00.000Z" });

  assert.equal(
    freshness.evaluateClaimEvidence({
      claim,
      automationRun: currentRun,
      asOf: "2026-09-02T00:00:00.000Z",
    }).condition,
    "current",
  );
  assert.equal(
    freshness.evaluateClaimEvidence({
      claim,
      automationRun: currentRun,
      asOf: "2026-09-02T00:00:00.001Z",
    }).condition,
    "due",
  );
  assert.equal(
    freshness.evaluateClaimEvidence({
      claim,
      automationRun: currentRun,
      asOf: "2026-09-08T00:00:00.001Z",
    }).condition,
    "stale",
  );
});

test("contradiction, expiry, and unavailable evidence block publication", () => {
  const contradictory = makeClaim(
    "claim.contradictory",
    { kind: "traveller_applicability", applies: true },
  );
  assert.equal(
    freshness.evaluateClaimEvidence({
      claim: contradictory,
      automationRun: automationRunFor([contradictory], { defaultState: "contradictory" }),
      asOf: "2026-09-02T00:00:00.000Z",
    }).condition,
    "contradictory",
  );

  const expired = makeClaim(
    "claim.expired",
    { kind: "traveller_applicability", applies: true },
    { effectiveUntilExclusive: "2026-09-02T00:00:00.000Z" },
  );
  assert.equal(
    freshness.evaluateClaimEvidence({
      claim: expired,
      automationRun: automationRunFor([expired]),
      asOf: "2026-09-02T00:00:00.000Z",
    }).condition,
    "stale",
  );

  assert.equal(
    freshness.evaluateClaimEvidence({
      claim: baseClaims[0],
      automationRun: automationRunFor([baseClaims[0]], { defaultState: "unavailable" }),
      asOf: "2026-09-02T00:00:00.000Z",
    }).condition,
    "unavailable",
  );
});

test("missing authoritative automation is explicit and blocks publication", () => {
  const unassessed = makeClaim(
    "claim.unassessed",
    { kind: "traveller_applicability", applies: true },
  );
  const result = freshness.evaluateClaimEvidence({
    claim: unassessed,
    automationRun: null,
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.condition, "unknown");
  assert.equal(result.blocking, true);
  assert.deepEqual(result.reasonCodes, ["no_authoritative_automation_run"]);
});

test("current evidence selection excludes action-eligible history for another release", () => {
  assert.equal(
    runSelection.selectLatestActionEligibleAutomationRun(
      [baseAutomationRun],
      "release.different",
    ),
    null,
  );
  assert.equal(
    runSelection.selectLatestActionEligibleAutomationRun(
      [baseAutomationRun],
      "release.fixture",
    )?.id,
    baseAutomationRun.id,
  );
});

test("an authoritative run for another catalog release cannot support a claim", () => {
  const result = freshness.evaluateClaimEvidence({
    claim: baseClaims[0],
    automationRun: baseAutomationRun,
    catalogReleaseId: "release.different",
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.condition, "unknown");
  assert.equal(result.blocking, true);
  assert.deepEqual(result.reasonCodes, ["automation_release_mismatch"]);
});

test("tampered automation reports and proof extracts fail closed", () => {
  const tamperedReport = structuredClone(baseAutomationRun);
  tamperedReport.decisions[0].reasonCodes = ["tampered"];
  assert.deepEqual(freshness.evaluateClaimEvidence({
    claim: baseClaims[0],
    automationRun: tamperedReport,
    asOf: "2026-09-02T00:00:00.000Z",
  }).reasonCodes, ["automation_report_invalid"]);

  const tamperedProof = structuredClone(baseAutomationRun);
  tamperedProof.proofPackets[0].extracts[0].extract = "Altered evidence text";
  const withoutHash = { ...tamperedProof };
  delete withoutHash.reportSha256;
  tamperedProof.reportSha256 = fingerprint(withoutHash);
  assert.deepEqual(freshness.evaluateClaimEvidence({
    claim: baseClaims[0],
    automationRun: tamperedProof,
    asOf: "2026-09-02T00:00:00.000Z",
  }).reasonCodes, ["automation_proof_invalid"]);
});

test("due evidence may remain published but cannot promote a candidate", () => {
  const result = freshness.evaluateRoutePublication({
    route: baseRoute,
    claims: new Map(baseClaims.map((claim) => [claim.id, claim])),
    automationRun: automationRunFor(baseClaims, { defaultState: "due" }),
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.aggregateCondition, "due");
  assert.equal(result.canPromote, false);
  assert.equal(result.canRemainPublished, true);
});

test("route publication requires distinct passport presence and validity gates", () => {
  const withoutValidity = baseClaims.filter((claim) => claim.id !== "claim.passport-validity");
  const result = freshness.evaluateRoutePublication({
    route: schemas.documentRouteSchema.parse({
      ...baseRoute,
      claimIds: withoutValidity.map((claim) => claim.id),
    }),
    claims: new Map(withoutValidity.map((claim) => [claim.id, claim])),
    automationRun: automationRunFor(withoutValidity),
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.canPromote, false);
  assert.ok(result.blockingClaimIds.includes("required:passport_validity"));
});

test("passport validity preserves calendar-month boundaries", () => {
  const calendarValidity = makeClaim("claim.calendar-validity", {
    kind: "requirement",
    requirement: {
      kind: "passport_validity",
      basis: "arrival",
      minimumRemainingCalendarMonths: 6,
    },
  });
  const claims = [...baseClaims.filter((claim) => claim.id !== "claim.passport-validity"), calendarValidity];
  const route = schemas.documentRouteSchema.parse({ ...baseRoute, claimIds: claims.map((claim) => claim.id) });
  const profile = household(1, [8, 12]);
  for (const traveller of [...profile.adults, ...profile.children]) {
    traveller.ordinaryPassport = { state: "present", expiresOn: "2026-07-31" };
  }
  const input = {
    route,
    claims: new Map(claims.map((claim) => [claim.id, claim])),
    automationRun: automationRunFor(claims),
    household: profile,
    journey: { origin: "moscow", arrivalOn: "2026-01-31" },
    asOf: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(humanRoutes.evaluateHumanRoute(input).household.state, "ready");
  for (const traveller of [...profile.adults, ...profile.children]) {
    traveller.ordinaryPassport = { state: "present", expiresOn: "2026-07-30" };
  }
  assert.equal(humanRoutes.evaluateHumanRoute(input).household.state, "missing_documents");
});

test("compound stay rules use the tightest constraint and require rolling-window history", () => {
  const compoundStay = makeClaim("claim.compound-stay", {
    kind: "stay_rule",
    rule: {
      kind: "compound",
      constraints: [
        { kind: "per_entry", allowedDays: 60 },
        { kind: "rolling_window", allowedDays: 90, windowDays: 180 },
      ],
    },
  });
  const claims = baseClaims.map((claim) => claim.id === "claim.stay" ? compoundStay : claim);
  const route = schemas.documentRouteSchema.parse({ ...baseRoute, claimIds: claims.map((claim) => claim.id) });
  const input = {
    route,
    claims: new Map(claims.map((claim) => [claim.id, claim])),
    automationRun: automationRunFor(claims),
    asOf: "2026-09-02T00:00:00.000Z",
  };
  assert.equal(humanRoutes.evaluateHumanRoute({ ...input, journey: { origin: "moscow" } }).stay.state, "not_evaluated");
  const stay = humanRoutes.evaluateHumanRoute({ ...input, journey: { origin: "moscow", priorPresenceDaysInWindow: 40 } }).stay;
  assert.equal(stay.availableDays, 50);
  assert.equal(stay.state, "meets_30_days");
});

test("open now requires a ready profile for every adult and child", () => {
  const claims = new Map(baseClaims.map((claim) => [claim.id, claim]));
  const sources = new Map([[primarySource.id, primarySource]]);
  const withoutProfile = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims,
    sources,
    automationRun: baseAutomationRun,
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(withoutProfile.presentation, "verified_ordinary_route");
  assert.equal(withoutProfile.household.state, "not_evaluated");

  const ready = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims,
    sources,
    automationRun: baseAutomationRun,
    household: household(2, [8, 12]),
    journey: { origin: "moscow", arrivalOn: "2026-09-10", entryPoint: "Example Border" },
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(ready.presentation, "open_now");
  assert.equal(ready.household.state, "ready");
  assert.equal(ready.household.travellers.length, 4);
});

test("application routes require per-traveller authorization and an allowed entry point", () => {
  const applicationClaims = baseClaims.map((claim) => {
    if (claim.id === "claim.availability") return makeClaim(claim.id, { kind: "route_availability", availability: "application_route_available" });
    if (claim.id === "claim.stay") return makeClaim(claim.id, { kind: "stay_rule", rule: { kind: "authorization_dependent", requestableDays: 30 } });
    return claim;
  });
  applicationClaims.push(
    makeClaim("claim.evisa", { kind: "requirement", requirement: { kind: "entry_authorization", authorizationKind: "evisa", obligation: "required" } }),
    makeClaim("claim.application-entry-point", { kind: "entry_restriction", restriction: "named_entry_points", entryPoints: ["Delhi Airport"] }),
  );
  const route = schemas.documentRouteSchema.parse({ ...baseRoute, kind: "evisa", claimIds: applicationClaims.map((claim) => claim.id) });
  const profile = household(2, [8, 12]);
  for (const traveller of [...profile.adults, ...profile.children]) {
    traveller.authorizations = [{ kind: "evisa", state: "present", validUntil: "2026-10-01" }];
  }
  const input = { route, claims: new Map(applicationClaims.map((claim) => [claim.id, claim])), sources: new Map([[primarySource.id, primarySource]]), automationRun: automationRunFor(applicationClaims), household: profile, asOf: "2026-09-02T00:00:00.000Z" };
  assert.equal(humanRoutes.evaluateHumanRoute({ ...input, journey: { origin: "moscow", arrivalOn: "2026-09-10", entryPoint: "Delhi Airport" } }).presentation, "open_now");
  assert.equal(humanRoutes.evaluateHumanRoute({ ...input, journey: { origin: "moscow", arrivalOn: "2026-09-10", entryPoint: "Another Airport" } }).presentation, "application_route_available");
});

test("one missing child passport prevents open now", () => {
  const profile = household(1, [8, 12]);
  profile.children[1].ordinaryPassport = { state: "missing" };
  const result = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims: new Map(baseClaims.map((claim) => [claim.id, claim])),
    sources: new Map([[primarySource.id, primarySource]]),
    automationRun: baseAutomationRun,
    household: profile,
    journey: { origin: "moscow", arrivalOn: "2026-09-10", entryPoint: "Example Border" },
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.household.state, "missing_documents");
  assert.notEqual(result.presentation, "open_now");
  assert.equal(result.household.travellers[2].travellerId, "child-2");
});

test("stale automation evidence demotes an otherwise ready human route", () => {
  const result = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims: new Map(baseClaims.map((claim) => [claim.id, claim])),
    sources: new Map([[primarySource.id, primarySource]]),
    automationRun: automationRunFor(baseClaims, { defaultState: "stale" }),
    household: household(1),
    journey: { origin: "moscow", arrivalOn: "2026-09-10" },
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(result.availability.state, "not_established");
  assert.equal(result.presentation, "not_verified");
});

test("explicit ineligibility requires current evidence", () => {
  const ineligibleClaims = baseClaims.map((claim) =>
    claim.id === "claim.nationality"
      ? schemas.evidenceClaimSchema.parse({
          ...claim,
          fact: {
            kind: "nationality_eligibility",
            nationality: "RU",
            eligible: false,
          },
        })
      : claim,
  );
  const current = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims: new Map(ineligibleClaims.map((claim) => [claim.id, claim])),
    sources: new Map([[primarySource.id, primarySource]]),
    automationRun: automationRunFor(ineligibleClaims),
    household: household(1),
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(current.availability.state, "explicitly_ineligible");
  assert.equal(current.presentation, "explicitly_ineligible");

  const stale = humanRoutes.evaluateHumanRoute({
    route: baseRoute,
    claims: new Map(ineligibleClaims.map((claim) => [claim.id, claim])),
    sources: new Map([[primarySource.id, primarySource]]),
    automationRun: automationRunFor(ineligibleClaims, { defaultState: "stale" }),
    household: household(1),
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(stale.availability.state, "not_established");
  assert.equal(stale.presentation, "not_verified");
});

test("an application route is not open until every traveller has authorization", () => {
  const applicationClaims = baseClaims.map((claim) =>
    claim.id === "claim.availability"
      ? schemas.evidenceClaimSchema.parse({
          ...claim,
          fact: {
            kind: "route_availability",
            availability: "application_route_available",
          },
        })
      : claim,
  );
  const authorizationClaim = makeClaim("claim.authorization", {
    kind: "requirement",
    requirement: {
      kind: "entry_authorization",
      authorizationKind: "visitor_visa",
    },
  });
  applicationClaims.push(authorizationClaim);
  const route = schemas.documentRouteSchema.parse({
    ...baseRoute,
    kind: "visitor_visa",
    claimIds: applicationClaims.map((claim) => claim.id),
  });
  const claims = new Map(applicationClaims.map((claim) => [claim.id, claim]));
  const sources = new Map([[primarySource.id, primarySource]]);
  const withoutAuthorizations = humanRoutes.evaluateHumanRoute({
    route,
    claims,
    sources,
    automationRun: automationRunFor(applicationClaims),
    household: household(1),
    journey: { origin: "moscow", arrivalOn: "2026-09-10" },
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(withoutAuthorizations.presentation, "application_route_available");

  const readyHousehold = household(1);
  for (const traveller of [
    ...readyHousehold.adults,
    ...readyHousehold.children,
  ]) {
    traveller.authorizations.push({
      kind: "visitor_visa",
      state: "present",
      validUntil: "2026-12-31",
    });
  }
  const withAuthorizations = humanRoutes.evaluateHumanRoute({
    route,
    claims,
    sources,
    automationRun: automationRunFor(applicationClaims),
    household: readyHousehold,
    journey: { origin: "moscow", arrivalOn: "2026-09-10", entryPoint: "Example Border" },
    asOf: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(withAuthorizations.presentation, "open_now");
});

test("large dogs cannot alter a human route result", () => {
  const input = {
    route: baseRoute,
    claims: new Map(baseClaims.map((claim) => [claim.id, claim])),
    sources: new Map([[primarySource.id, primarySource]]),
    automationRun: baseAutomationRun,
    household: household(1),
    journey: { origin: "moscow", arrivalOn: "2026-09-10" },
    asOf: "2026-09-02T00:00:00.000Z",
  };
  const humanBefore = humanRoutes.evaluateHumanRoute(input);
  const pets = petLogistics.evaluateLargeDogLogistics({ largeDogCount: 2 });
  const humanAfter = humanRoutes.evaluateHumanRoute(input);

  assert.deepEqual(humanAfter, humanBefore);
  assert.deepEqual(pets, {
    state: "not_assessed",
    largeDogCount: 2,
    affectsHumanRoute: false,
  });
});
