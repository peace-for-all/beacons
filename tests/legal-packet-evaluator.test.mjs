import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { createServer } from "vite";

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
const corridor = await vite.ssrLoadModule("/lib/domain/corridor-requirement-manifest.ts");
const {
  evaluateLegalPacket,
  legalJourneyAssessmentInputSchema,
  minorDepartureContextSchema,
} = await vite.ssrLoadModule("/lib/domain/legal-packet-evaluator.ts");
const [rawCatalog, rawManifests, rawReports] = await Promise.all([
  readFile(new URL("../content/catalog.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/corridor-requirements.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8").then(JSON.parse),
]);
const catalog = schemas.contentCatalogSchema.parse(rawCatalog);
const manifest = corridor.corridorRequirementManifestCollectionSchema.parse(rawManifests).manifests[0];
const reports = schemas.evidenceAutomationReportsSchema.parse(rawReports);
const automationRun = reports.runs.filter((run) => run.catalogReleaseId === catalog.releaseId && run.eligibleForActions).at(-1);
after(async () => vite.close());

function traveller(expiresOn = "2027-12-31") {
  return { ordinaryPassport: { state: "present", expiresOn }, documents: [], authorizations: [] };
}

function household(adultCount = 1, childExpiries = ["2027-12-31", "2027-12-31"]) {
  return schemas.humanHouseholdProfileSchema.parse({
    schemaVersion: 1,
    adultCount,
    adults: Array.from({ length: adultCount }, () => traveller()),
    children: [
      { ...traveller(childExpiries[0]), ageYears: 6 },
      { ...traveller(childExpiries[1]), ageYears: 17 },
    ],
  });
}

const clearMinor = {
  travelsWithLegalRepresentative: "yes",
  representativeRole: "parent",
  guardianOrCustodianAuthorityEvidence: "not_applicable",
  departureObjectionStatus: "confirmed_absent",
  notarizedConsent: "unknown",
  relationshipEvidence: "present",
};

function journey(overrides = {}) {
  return {
    origin: "moscow",
    plannedDepartureOn: "2026-10-30",
    entryPoint: "BEG",
    transit: { state: "direct" },
    minors: [clearMinor, clearMinor],
    legalTime: {
      arrivalOn: "2026-10-01",
      arrivalInstant: "2026-10-01T12:00:00.000+02:00",
      priorStayDates: [],
      registrationArrangement: "paid_accommodation",
      rule: {
        schemaVersion: 2,
        allowedDays: 30,
        entryDay: "included",
        exitDay: "included",
        windowAnchor: "entry",
        dayCounting: "calendar_days",
        nonWorkingDayAdjustment: "none",
        legalTimezone: "Europe/Belgrade",
        exceptions: [],
        registration: { trigger: "arrival", withinHours: 24, responsibleParty: "accommodation_provider_or_host" },
      },
    },
    ...overrides,
  };
}

function coverage(adultCount = 1, state = "confirmed") {
  return [
    ...Array.from({ length: adultCount }, (_, index) => ({ travellerId: `adult-${index + 1}`, state })),
    { travellerId: "child-1", state },
    { travellerId: "child-2", state },
  ];
}

test("the checked-in Serbia packet remains incomplete and cannot become an open route", () => {
  const result = evaluateLegalPacket({ manifest, catalog, automationRun, origin: "moscow", household: household(), journey: journey() });
  assert.equal(result.state, "blocked");
  assert.equal(result.corridorReadinessCeiling, "plan_with_verification");
  assert.ok(result.slots.some((slot) => slot.requirementId === "legal.border_supporting_requirements" && slot.state === "incomplete"));
  assert.ok(result.slots.some((slot) => slot.requirementId === "legal.origin_departure_requirements" && slot.state === "incomplete"));
});

test("adult count and both supported child-age boundaries are evaluated independently", () => {
  const twoAdults = evaluateLegalPacket({ manifest, catalog, automationRun, origin: "moscow", household: household(2), journey: journey() });
  assert.deepEqual(twoAdults.household.travellers.map((item) => item.travellerId), ["adult-1", "adult-2", "child-1", "child-2"]);
  assert.deepEqual(twoAdults.household.travellers.filter((item) => item.kind === "child").map((item) => item.state), ["ready", "ready"]);

  const childExpiry = evaluateLegalPacket({ manifest, catalog, automationRun, origin: "moscow", household: household(1, ["2026-10-29", "2026-10-30"]), journey: journey() });
  assert.equal(childExpiry.household.travellers.find((item) => item.travellerId === "child-1").state, "missing_documents");
  assert.equal(childExpiry.household.travellers.find((item) => item.travellerId === "child-2").state, "ready");
});

test("missing passports, representative authority, objections, and unaccompanied consent fail per child", () => {
  const profile = household();
  profile.children[0].ordinaryPassport = { state: "missing" };
  const uncertainMinor = {
    ...clearMinor,
    representativeRole: "guardian",
    guardianOrCustodianAuthorityEvidence: "unknown",
  };
  const objectedMinor = { ...clearMinor, departureObjectionStatus: "filed" };
  const result = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: profile,
    journey: journey({ minors: [uncertainMinor, objectedMinor] }),
  });
  assert.equal(result.household.travellers.find((item) => item.travellerId === "child-1").state, "missing_documents");
  assert.equal(result.household.travellers.find((item) => item.travellerId === "child-2").state, "blocked");

  const consent = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({ minors: [{
      ...clearMinor,
      travelsWithLegalRepresentative: "no",
      representativeRole: "not_applicable",
      guardianOrCustodianAuthorityEvidence: "not_applicable",
      relationshipEvidence: "not_applicable",
      notarizedConsent: "missing",
    }, clearMinor] }),
  });
  assert.ok(consent.household.travellers[1].reasonCodes.includes("minor_notarized_consent_missing"));
});

test("unknown objection checks and unresolved relationship-document rules do not become clear case facts", () => {
  const result = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({ minors: [
      { ...clearMinor, departureObjectionStatus: "not_checked" },
      { ...clearMinor, relationshipEvidence: "missing" },
    ] }),
  });
  assert.ok(result.household.travellers[1].reasonCodes.includes("minor_departure_objection_not_checked"));
  assert.ok(result.household.travellers[2].reasonCodes.includes("relationship_evidence_requirement_unresolved"));
  assert.deepEqual(result.household.travellers.filter((item) => item.kind === "child").map((item) => item.state), ["not_evaluated", "not_evaluated"]);
});

test("missing guardian authority evidence stays unresolved instead of becoming an invented border requirement", () => {
  const result = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({ minors: [{
      ...clearMinor,
      representativeRole: "guardian",
      guardianOrCustodianAuthorityEvidence: "missing",
    }, clearMinor] }),
  });
  const child = result.household.travellers.find((item) => item.travellerId === "child-1");
  assert.equal(child.state, "not_evaluated");
  assert.ok(child.reasonCodes.includes("guardian_or_custodian_authority_not_established"));
});

test("minor case inputs reject contradictory accompaniment and authority declarations", () => {
  assert.equal(minorDepartureContextSchema.safeParse({
    ...clearMinor,
    travelsWithLegalRepresentative: "no",
  }).success, false);
  assert.equal(minorDepartureContextSchema.safeParse({
    ...clearMinor,
    representativeRole: "guardian",
  }).success, false);
  assert.equal(minorDepartureContextSchema.safeParse({
    ...clearMinor,
    representativeRole: "unknown",
    guardianOrCustodianAuthorityEvidence: "unknown",
  }).success, true);
});

test("unknown transit and origin mismatch remain explicit blockers to completion", () => {
  const unknownTransit = evaluateLegalPacket({ manifest, catalog, automationRun, origin: "moscow", household: household(), journey: journey({ transit: { state: "unknown" } }) });
  assert.ok(unknownTransit.slots.some((slot) => slot.requirementId === "legal.transit_runtime_check"));
  const mismatch = evaluateLegalPacket({ manifest, catalog, automationRun, origin: "saint_petersburg", household: household(), journey: journey() });
  assert.ok(mismatch.slots.some((slot) => slot.reasonCodes.includes("journey_origin_mismatch")));
});

test("transit case checks distinguish a confirmed airside candidate from a landside transfer without entry permission", () => {
  const airside = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({
      transit: {
        state: "with_transit",
        jurisdictions: ["Türkiye"],
        transferMode: "airside",
        singleTicket: "yes",
        baggageCheckedThrough: "yes",
        transitEntryPermission: "not_applicable",
      },
    }),
  });
  assert.equal(airside.caseChecks.transit.state, "current");
  assert.deepEqual(airside.caseChecks.transit.reasonCodes, ["transit_case_confirmed"]);

  const landside = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({
      transit: {
        state: "with_transit",
        jurisdictions: ["Türkiye"],
        transferMode: "landside_or_self_transfer",
        singleTicket: "no",
        baggageCheckedThrough: "no",
        transitEntryPermission: "missing",
      },
    }),
  });
  assert.equal(landside.caseChecks.transit.state, "blocked");
  assert.ok(landside.caseChecks.transit.reasonCodes.includes("transit_entry_permission_missing"));
});

test("the current BEG claim clears only the named entry-point check", () => {
  const beg = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey(),
  });
  assert.deepEqual(beg.caseChecks.entryPoint, { state: "current", reasonCodes: ["entry_point_confirmed"] });

  const otherAirport = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({ entryPoint: "INI" }),
  });
  assert.equal(otherAirport.caseChecks.entryPoint.state, "blocked");
  assert.ok(otherAirport.caseChecks.entryPoint.reasonCodes.includes("entry_point_not_in_current_allowed_set"));
});

test("transit declarations reject an airside or landside contradiction", () => {
  assert.equal(legalJourneyAssessmentInputSchema.safeParse(journey({
    transit: {
      state: "with_transit",
      jurisdictions: ["Türkiye"],
      transferMode: "airside",
      singleTicket: "yes",
      baggageCheckedThrough: "yes",
      transitEntryPermission: "present",
    },
  })).success, false);
  assert.equal(legalJourneyAssessmentInputSchema.safeParse(journey({
    transit: {
      state: "with_transit",
      jurisdictions: ["Türkiye"],
      transferMode: "landside_or_self_transfer",
      singleTicket: "no",
      baggageCheckedThrough: "no",
      transitEntryPermission: "not_applicable",
    },
  })).success, false);
});

test("funds and registration coverage remain per traveller without inventing family pooling", () => {
  const individual = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({
      funds: { allocation: "individual", travellerCoverage: coverage() },
      registrationCoverage: coverage(),
    }),
  });
  assert.equal(individual.caseChecks.funds.state, "current");
  assert.equal(individual.caseChecks.registration.state, "current");

  const pooled = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({
      funds: { allocation: "household_pool", travellerCoverage: coverage() },
      registrationCoverage: coverage().map((item) => item.travellerId === "child-2"
        ? { ...item, state: "missing" }
        : item),
    }),
  });
  assert.equal(pooled.caseChecks.funds.state, "incomplete");
  assert.ok(pooled.caseChecks.funds.reasonCodes.includes("household_funds_allocation_rule_not_established"));
  assert.equal(pooled.caseChecks.registration.state, "blocked");
  assert.ok(pooled.caseChecks.registration.reasonCodes.includes("registration_missing:child-2"));
});

test("case coverage rejects duplicate and unexpected traveller identifiers", () => {
  assert.equal(legalJourneyAssessmentInputSchema.safeParse(journey({
    registrationCoverage: [
      { travellerId: "adult-1", state: "confirmed" },
      { travellerId: "adult-1", state: "confirmed" },
    ],
  })).success, false);

  const unexpected = evaluateLegalPacket({
    manifest,
    catalog,
    automationRun,
    origin: "moscow",
    household: household(),
    journey: journey({ registrationCoverage: [...coverage(), { travellerId: "adult-2", state: "confirmed" }] }),
  });
  assert.equal(unexpected.caseChecks.registration.state, "blocked");
  assert.ok(unexpected.caseChecks.registration.reasonCodes.includes("registration_unexpected_traveller:adult-2"));
});

test("withdrawal and a deleted legal slot block the packet without deleting audit evidence", () => {
  const withdrawnCatalog = structuredClone(catalog);
  withdrawnCatalog.routes.find((route) => route.id === manifest.routeId).publicationState = "withdrawn";
  const withdrawn = evaluateLegalPacket({ manifest, catalog: withdrawnCatalog, automationRun, origin: "moscow", household: household(), journey: journey() });
  assert.equal(withdrawn.state, "blocked");
  assert.ok(withdrawn.slots.some((slot) => slot.reasonCodes.includes("route_withdrawn")));
  assert.equal(withdrawnCatalog.claims.length, catalog.claims.length);

  const missingManifest = structuredClone(manifest);
  missingManifest.requirements = missingManifest.requirements.filter((entry) => !(
    entry.requirementId === "legal.origin_departure_requirements" && entry.origin === "moscow"
  ));
  const missing = evaluateLegalPacket({ manifest: missingManifest, catalog, automationRun, origin: "moscow", household: household(), journey: journey() });
  assert.ok(missing.slots.some((slot) => slot.reasonCodes.includes("required_legal_manifest_slot_missing")));
});

test("shared-source loss, changed-law revisions, and cross-jurisdiction proof all demote legal slots", () => {
  const unavailableRun = structuredClone(automationRun);
  unavailableRun.decisions.find((decision) => decision.claimId === "claim.serbia-russian-nationality").state = "unavailable";
  const unavailable = evaluateLegalPacket({ manifest, catalog, automationRun: unavailableRun, origin: "moscow", household: household(), journey: journey() });
  assert.ok(unavailable.slots.find((slot) => slot.requirementId === "legal.nationality_and_passport_scope").reasonCodes.some((reason) => reason.startsWith("claim_not_current:")));

  const revisedCatalog = structuredClone(catalog);
  revisedCatalog.claims.find((claim) => claim.id === "claim.serbia-russian-nationality").revision += 1;
  const revised = evaluateLegalPacket({ manifest, catalog: revisedCatalog, automationRun, origin: "moscow", household: household(), journey: journey() });
  assert.ok(revised.slots.find((slot) => slot.requirementId === "legal.nationality_and_passport_scope").reasonCodes.some((reason) => reason.startsWith("claim_revision_drift:")));

  const wrongJurisdictionCatalog = structuredClone(catalog);
  wrongJurisdictionCatalog.sources.find((source) => source.id === "source.serbia-mfa-russia-visa").jurisdiction = "Russia";
  const wrongJurisdiction = evaluateLegalPacket({ manifest, catalog: wrongJurisdictionCatalog, automationRun, origin: "moscow", household: household(), journey: journey() });
  assert.ok(wrongJurisdiction.slots.find((slot) => slot.requirementId === "legal.nationality_and_passport_scope").reasonCodes.some((reason) => reason.startsWith("proof_jurisdiction_mismatch:")));
});
