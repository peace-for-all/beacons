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
const guidance = await vite.ssrLoadModule("/lib/domain/journey-guidance.ts");
const [rawGuidance, rawManifests, rawCatalog, rawEvidenceReports] = await Promise.all([
  readFile(new URL("../content/journey-guidance.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/corridor-requirements.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/catalog.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8").then(JSON.parse),
]);
const catalog = schemas.contentCatalogSchema.parse(rawCatalog);
const evidenceReports = schemas.evidenceAutomationReportsSchema.parse(rawEvidenceReports);
const manifestCollection = corridor.corridorRequirementManifestCollectionSchema.parse(rawManifests);
const manifest = manifestCollection.manifests[0];
const asOf = "2026-09-04T07:10:00.000Z";

after(async () => vite.close());

function parseAndValidate(raw = rawGuidance) {
  const collection = guidance.journeyGuidanceCollectionSchema.parse(raw);
  guidance.validateJourneyGuidance({
    collection,
    catalog,
    evidenceReports,
    manifests: manifestCollection.manifests,
    asOf,
  });
  return collection;
}

test("the checked-in guidance release is research-only and represents both origin variants", () => {
  const collection = parseAndValidate();
  assert.equal(collection.authorityPolicies.length, 11);
  assert.equal(collection.guidanceItems.length, 6);
  assert.equal(collection.operationalRecords.length, 16);
  assert.ok(collection.authorityPolicies.every((policy) => !policy.mayEmitDoThis));
  assert.equal(collection.operationalRecords.filter((record) => record.recordState === "observed").length, 4);
  assert.equal(collection.operationalRecords.filter((record) => record.recordState === "not_collected").length, 12);

  const evaluated = guidance.evaluateGuidanceCollection({ collection, manifest, catalog, evidenceReports, asOf });
  assert.ok(evaluated.every((item) => item.actionState !== "do_this"));
  assert.ok(evaluated.every((item) => item.stateReasons.length > 0));
  assert.equal(evaluated.find((item) => item.id === "guidance.serbia.entry_route.v1").actionState, "confirm_first");
  assert.equal(evaluated.find((item) => item.id === "guidance.serbia.host_registration.v1").actionState, "confirm_first");
  assert.ok(evaluated.find((item) => item.id === "guidance.serbia.host_registration.v1").stateReasons.includes("dependency_not_actionable"));
  assert.deepEqual(
    guidance.renderGuidanceItem(evaluated.find((item) => item.id === "guidance.serbia.entry_route.v1"), "en").semantics,
    guidance.renderGuidanceItem(evaluated.find((item) => item.id === "guidance.serbia.entry_route.v1"), "ru").semantics,
  );

  const entryDefinition = collection.guidanceItems.find((item) => item.id === "guidance.serbia.entry_route.v1");
  const legalPolicy = collection.authorityPolicies.find((policy) => policy.id === entryDefinition.authorityPolicyId);
  const stillGated = guidance.evaluateGuidanceItem({
    item: { ...entryDefinition, requirementId: "legal.border_supporting_requirements" },
    policy: legalPolicy,
    manifest,
    catalog,
    evidenceReports,
    asOf,
  });
  assert.equal(stillGated.actionState, "confirm_first");
  assert.ok(stillGated.stateReasons.includes("manifest_slot_incomplete"));

  const publishableCatalog = structuredClone(catalog);
  publishableCatalog.routes.find((route) => route.id === manifest.routeId).publicationState = "published";
  const enabled = guidance.evaluateGuidanceItem({
    item: entryDefinition,
    policy: { ...legalPolicy, mayEmitDoThis: true, minimumIndependentLineages: 1 },
    manifest: { ...manifest, researchTargetOnly: false, activationAuthority: true },
    catalog: publishableCatalog,
    evidenceReports,
    asOf,
  });
  assert.equal(enabled.actionState, "do_this");

  const moscow = guidance.buildCorridorGuidanceView({ manifest, items: evaluated, origin: "moscow" });
  const petersburg = guidance.buildCorridorGuidanceView({ manifest, items: evaluated, origin: "saint_petersburg" });
  assert.equal(moscow.length, petersburg.length);
  assert.ok(moscow.every((entry) => entry.origin !== "saint_petersburg"));
  assert.ok(petersburg.every((entry) => entry.origin !== "moscow"));
  assert.equal(moscow.find((entry) => entry.requirementId === "departure.itineraries_and_fallback").guidance.actionState, "confirm_first");
  assert.equal(petersburg.find((entry) => entry.requirementId === "departure.itineraries_and_fallback").guidance.actionState, "confirm_first");
});

test("policy, proof, jurisdiction, origin, and dependency tampering fail closed", () => {
  const missingPolicy = structuredClone(rawGuidance);
  missingPolicy.authorityPolicies.pop();
  assert.throws(() => parseAndValidate(missingPolicy), /Missing or misclassified authority policy|exactly the versioned authority policy set/);

  const policyVersion = structuredClone(rawGuidance);
  policyVersion.guidanceItems[0].authorityPolicyVersion = 2;
  assert.throws(() => parseAndValidate(policyVersion), /wrong authority policy version/);

  const destination = structuredClone(rawGuidance);
  destination.guidanceItems.find((item) => item.id === "guidance.serbia.entry_route.v1").jurisdictions.destinationJurisdiction = "jurisdiction.india";
  assert.throws(() => parseAndValidate(destination), /wrong destination jurisdiction/);

  const role = structuredClone(rawGuidance);
  role.guidanceItems.find((item) => item.id === "guidance.serbia.entry_route.v1").evidenceLinks[0].sourceRole = "origin_rule";
  assert.throws(() => parseAndValidate(role), /cross-jurisdiction origin source binding/);

  const proof = structuredClone(rawGuidance);
  proof.guidanceItems.find((item) => item.id === "guidance.serbia.entry_route.v1").evidenceLinks[0].proofPacketIds[0] = "proof.unknown";
  assert.throws(() => parseAndValidate(proof), /invalid proof packet binding/);

  const origin = structuredClone(rawGuidance);
  origin.operationalRecords[0].origin = "saint_petersburg";
  assert.throws(() => parseAndValidate(origin), /invalid operational record binding/);

  const manifestRecord = structuredClone(rawManifests);
  manifestRecord.manifests[0].requirements.find((entry) =>
    entry.requirementId === "departure.itineraries_and_fallback" && entry.origin === "moscow"
  ).operationalRecordIds[0] = "record.unknown";
  assert.throws(() => guidance.validateJourneyGuidance({
    collection: guidance.journeyGuidanceCollectionSchema.parse(rawGuidance),
    catalog,
    evidenceReports,
    manifests: corridor.corridorRequirementManifestCollectionSchema.parse(manifestRecord).manifests,
    asOf,
  }), /invalid operational record binding/);

  const absenceRecord = structuredClone(rawManifests);
  absenceRecord.manifests[0].requirements.find((entry) =>
    entry.requirementId === "first72.arrival_transfer"
  ).absenceRecordIds[0] = "record.serbia.first72.payment.not_collected.v1";
  assert.throws(() => guidance.validateJourneyGuidance({
    collection: guidance.journeyGuidanceCollectionSchema.parse(rawGuidance),
    catalog,
    evidenceReports,
    manifests: corridor.corridorRequirementManifestCollectionSchema.parse(absenceRecord).manifests,
    asOf,
  }), /invalid explicit absence record binding/);

  const unboundAbsence = structuredClone(rawManifests);
  unboundAbsence.manifests[0].requirements.find((entry) =>
    entry.requirementId === "first72.arrival_transfer"
  ).absenceRecordIds = [];
  assert.throws(() => guidance.validateJourneyGuidance({
    collection: guidance.journeyGuidanceCollectionSchema.parse(rawGuidance),
    catalog,
    evidenceReports,
    manifests: corridor.corridorRequirementManifestCollectionSchema.parse(unboundAbsence).manifests,
    asOf,
  }), /not bound to its manifest slot/);

  const cycle = structuredClone(rawGuidance);
  cycle.guidanceItems.find((item) => item.id === "guidance.serbia.entry_route.v1").dependencies = ["guidance.serbia.host_registration.v1"];
  assert.throws(() => parseAndValidate(cycle), /dependency cycle/);
});

test("bilingual consequential numbers and structured record distinctions are enforced", () => {
  const mismatch = structuredClone(rawGuidance);
  const hostRegistration = mismatch.guidanceItems.find((item) => item.id === "guidance.serbia.host_registration.v1");
  hostRegistration.copy.summary.ru = hostRegistration.copy.summary.ru.replace("24", "25");
  assert.throws(() => guidance.journeyGuidanceCollectionSchema.parse(mismatch), /semantic numbers differ/);

  const base = {
    schemaVersion: 1,
    id: "record.test.stay.v1",
    revision: 1,
    corridorId: manifest.id,
    routeId: manifest.routeId,
    requirementId: "stay.deadlines",
    recordKind: "stay_timeline_input",
    recordState: "observed",
    sourceBindings: [{ sourceRole: "destination_law", sourceId: "source.serbia-law-foreigners-2023", segmentIds: [] }],
    observationId: "observation.test.stay.v1",
    evidenceFingerprint: "b".repeat(64),
    structuredValuesVerified: true,
    observedAt: "2026-09-03T09:40:57.217Z",
    validUntilExclusive: "2026-09-11T09:40:57.217Z",
    jurisdictions: {
      ruleJurisdiction: "jurisdiction.serbia",
      travellerNationality: "RU",
      originJurisdiction: "jurisdiction.russia",
      destinationJurisdiction: "jurisdiction.serbia",
      transit: { state: "not_established" },
    },
    payload: {
      kind: "stay_timeline_input",
      priorStayDates: [],
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
        registration: { trigger: "accommodation_check_in", withinHours: 24, responsibleParty: "accommodation_provider_or_host" },
      },
    },
  };
  assert.equal(guidance.operationalRecordSchema.parse(base).payload.rule.entryDay, "included");

  const badRange = structuredClone(base);
  badRange.id = "record.test.cost.v1";
  badRange.requirementId = "money.cost_components";
  badRange.origin = "moscow";
  badRange.recordKind = "cost_observation";
  badRange.payload = { kind: "cost_observation", component: "travel", currency: "RSD", lowMinor: 200, highMinor: 100, observedFor: "household", exclusions: [] };
  assert.throws(() => guidance.operationalRecordSchema.parse(badRange), /Cost low value cannot exceed high value/);

  const absent = guidance.operationalRecordSchema.parse({
    schemaVersion: 1,
    id: "record.test.departure.not_collected.v1",
    revision: 1,
    corridorId: manifest.id,
    routeId: manifest.routeId,
    origin: "moscow",
    requirementId: "departure.itineraries_and_fallback",
    recordKind: "departure_observation",
    recordState: "not_collected",
    jurisdictions: {
      ruleJurisdiction: "jurisdiction.russia",
      travellerNationality: "RU",
      originJurisdiction: "jurisdiction.russia",
      destinationJurisdiction: "jurisdiction.serbia",
      transit: { state: "not_established" },
    },
    expectedPayloads: [{ kind: "departure_observation", itineraryRole: "primary" }],
    absenceReason: { en: "No observation collected.", ru: "Наблюдение не собрано." },
  });
  assert.equal(absent.recordState, "not_collected");
  assert.ok(!("payload" in absent));
});

test("departure observations stay inside the planning window and preserve connected elapsed segments", () => {
  const primary = rawGuidance.operationalRecords.find((record) => record.id === "record.serbia.departure.moscow.primary.v1");
  const parsed = guidance.operationalRecordSchema.parse(primary);
  assert.equal(parsed.payload.observedDepartureOn, "2026-09-11");
  assert.equal(parsed.payload.durationMinutes, 185);
  assert.deepEqual(parsed.payload.transferPoints, []);
  assert.equal(parsed.payload.operatingState, "scheduled");

  const outsideWindow = structuredClone(primary);
  outsideWindow.payload.observedDepartureOn = "2027-01-05";
  assert.throws(() => guidance.operationalRecordSchema.parse(outsideWindow), /inside the planning window/);

  const disconnected = structuredClone(rawGuidance.operationalRecords.find((record) => record.id === "record.serbia.departure.moscow.fallback.v1"));
  disconnected.payload.segments[1].departurePoint = "SAW";
  assert.throws(() => guidance.operationalRecordSchema.parse(disconnected), /chronological connected itinerary/);

  const wrongDuration = structuredClone(primary);
  wrongDuration.payload.durationMinutes = 184;
  assert.throws(() => guidance.operationalRecordSchema.parse(wrongDuration), /elapsed itinerary time/);
});

test("saved guidance becomes recheck on expiry or revision drift and withdrawn stays withdrawn", () => {
  const collection = parseAndValidate();
  const evaluated = guidance.evaluateGuidanceCollection({ collection, manifest, catalog, evidenceReports, asOf });
  const item = evaluated.find((candidate) => candidate.id === "guidance.serbia.entry_route.v1");
  const policy = collection.authorityPolicies.find((candidate) => candidate.id === item.authorityPolicyId);
  const snapshot = guidance.savedGuidanceSnapshotSchema.parse({
    schemaVersion: 1,
    id: "snapshot.serbia.entry.v1",
    createdAt: asOf,
    catalogReleaseId: catalog.releaseId,
    manifestId: manifest.id,
    manifestVersion: manifest.version,
    routeId: item.routeId,
    policyId: policy.id,
    policyVersion: policy.version,
    itemId: item.id,
    itemRevision: item.revision,
    actionState: item.actionState,
    evidenceValidUntilExclusive: item.evidenceLinks[0].validUntilExclusive,
    claimRevisions: item.evidenceLinks.map((link) => ({ claimId: link.claimId, revision: link.claimRevision })),
    operationalRecordRevisions: [],
    proofPacketIds: item.evidenceLinks.flatMap((link) => link.proofPacketIds),
    scopeFingerprint: "a".repeat(64),
    privateFieldsIncluded: false,
  });
  const input = { snapshot, currentItem: item, currentManifest: manifest, currentPolicy: policy, currentOperationalRecords: collection.operationalRecords, currentCatalogReleaseId: catalog.releaseId, currentScopeFingerprint: "a".repeat(64), asOf };
  assert.deepEqual(guidance.evaluateSavedGuidanceSnapshot(input), { validity: "current", reasons: [] });
  assert.equal(guidance.evaluateSavedGuidanceSnapshot({ ...input, asOf: "2026-09-13T00:00:00.000Z" }).validity, "recheck");
  assert.equal(guidance.evaluateSavedGuidanceSnapshot({ ...input, currentItem: { ...item, revision: 2 } }).validity, "recheck");
  assert.deepEqual(guidance.evaluateSavedGuidanceSnapshot({ ...input, currentItem: { ...item, publicationState: "withdrawn" } }), { validity: "withdrawn", reasons: ["guidance_item_withdrawn"] });
});
