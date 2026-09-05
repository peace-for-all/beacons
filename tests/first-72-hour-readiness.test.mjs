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

const guidance = await vite.ssrLoadModule("/lib/domain/journey-guidance.ts");
const corridor = await vite.ssrLoadModule("/lib/domain/corridor-requirement-manifest.ts");
const first72 = await vite.ssrLoadModule("/lib/domain/first-72-hour-readiness.ts");
const departureReadiness = await vite.ssrLoadModule("/lib/domain/departure-readiness.ts");
const [rawGuidance, rawManifests, rawCatalog] = await Promise.all([
  readFile(new URL("../content/journey-guidance.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/corridor-requirements.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/catalog.json", import.meta.url), "utf8").then(JSON.parse),
]);
const collection = guidance.journeyGuidanceCollectionSchema.parse(rawGuidance);
const manifest = corridor.corridorRequirementManifestCollectionSchema.parse(rawManifests).manifests[0];

after(async () => vite.close());

test("the departure summary stays timing-neutral, origin-specific, and fail-closed", () => {
  const result = departureReadiness.summarizeDepartureReadiness(manifest, "moscow", {
    operationalRecords: collection.operationalRecords,
    sources: rawCatalog.sources,
    asOf: "2026-09-05T08:00:00.000Z",
  });

  assert.equal(result.assessed, true);
  assert.equal(result.actionReady, false);
  assert.deepEqual({ current: result.current, total: result.total, unresolved: result.unresolved }, { current: 5, total: 45, unresolved: 40 });
  assert.equal(result.categories.legal, "confirm");
  assert.equal(result.categories.departure, "not_established");
  assert.equal(result.categories.first_72_hours, "not_established");
  assert.equal(result.categories.money, "not_established");
  assert.equal(result.categories.safety, "not_established");
  assert.equal(result.categories.offline, "not_established");
  assert.deepEqual(result.householdScope, { minimumAdults: 1, maximumAdults: 2, childCount: 2, childAgeMin: 6, childAgeMax: 17 });
  assert.equal(result.unresolvedFirst72.length, 7);
  assert.deepEqual(result.itineraryLeads.map((lead) => ({
    role: lead.role,
    path: lead.path,
    freshness: lead.freshness,
    daysUntilDeparture: lead.daysUntilDeparture,
    sources: lead.sources.length,
  })), [
    { role: "primary", path: ["SVO", "BEG"], freshness: "recheck", daysUntilDeparture: 6, sources: 2 },
    { role: "fallback", path: ["VKO", "IST", "BEG"], freshness: "recheck", daysUntilDeparture: 11, sources: 5 },
  ]);

  const otherOrigin = departureReadiness.summarizeDepartureReadiness(manifest, "saint_petersburg", {
    operationalRecords: collection.operationalRecords,
    sources: rawCatalog.sources,
    asOf: "2026-09-04T08:00:00.000Z",
  });
  assert.equal(otherOrigin.itineraryLeads.length, 2);
  assert.deepEqual(otherOrigin.itineraryLeads[0].path, ["LED", "BEG"]);
  assert.equal(otherOrigin.itineraryLeads[0].freshness, "current");

  const unassessed = departureReadiness.summarizeDepartureReadiness(undefined, "moscow");
  assert.equal(unassessed.assessed, false);
  assert.equal(unassessed.actionReady, false);
  assert.equal(unassessed.categories.legal, "not_established");
  assert.equal(unassessed.householdScope, null);
});

test("the Serbia first-72-hour packet exposes exact uncollected subjects without gaining authority", () => {
  const result = first72.evaluateFirst72Packet({
    manifest,
    operationalRecords: collection.operationalRecords,
    asOf: "2026-09-04T08:00:00.000Z",
  });

  assert.equal(result.coverageState, "not_established");
  assert.equal(result.actionReady, false);
  assert.deepEqual(result.actionBlockers, [
    "first_72_hour_packet_not_current",
    "corridor_is_research_only",
    "corridor_has_no_activation_authority",
  ]);
  assert.equal(result.nextUnresolvedRequirementId, "first72.accommodation_and_registration");

  const accommodation = result.requirements.find((entry) => entry.requirementId === "first72.accommodation_and_registration");
  assert.equal(accommodation.coverageState, "partial");
  assert.deepEqual(accommodation.expectedSubjects, ["accommodation:primary", "accommodation:fallback"]);

  const communication = result.requirements.find((entry) => entry.requirementId === "first72.communication_and_payment");
  assert.equal(communication.coverageState, "not_established");
  assert.deepEqual(communication.expectedSubjects, ["mobile_data", "voice", "offline_copy", "payment:primary", "payment:fallback"]);

  const failures = result.requirements.find((entry) => entry.requirementId === "first72.failure_paths");
  assert.deepEqual(failures.expectedSubjects, [
    "failure_path:entry_failure",
    "failure_path:transport_failure",
    "failure_path:payment_failure",
    "failure_path:accommodation_failure",
  ]);
});

test("current inventory still demotes expired or non-observed operational evidence", () => {
  const currentManifest = structuredClone(manifest);
  const records = [];
  for (const requirementId of first72.first72RequirementIds) {
    const slot = currentManifest.requirements.find((entry) => entry.requirementId === requirementId);
    const id = `record.test.${requirementId}.v1`;
    slot.status = "current";
    delete slot.gap;
    slot.claimIds = [];
    slot.absenceRecordIds = [];
    slot.operationalRecordIds = [id];
    records.push({
      id,
      recordState: "observed",
      observedAt: "2026-09-04T08:00:00.000Z",
      validUntilExclusive: "2026-09-05T08:00:00.000Z",
      payload: { kind: "health_guidance", topic: "urgent_care", detail: { en: "Checked.", ru: "Проверено." } },
    });
  }

  const current = first72.evaluateFirst72Packet({
    manifest: currentManifest,
    operationalRecords: records,
    asOf: "2026-09-04T09:00:00.000Z",
  });
  assert.equal(current.coverageState, "current");
  assert.equal(current.actionReady, false);
  assert.deepEqual(current.actionBlockers, ["corridor_is_research_only", "corridor_has_no_activation_authority"]);

  records[0].validUntilExclusive = "2026-09-04T08:30:00.000Z";
  const expired = first72.evaluateFirst72Packet({
    manifest: currentManifest,
    operationalRecords: records,
    asOf: "2026-09-04T09:00:00.000Z",
  });
  assert.equal(expired.coverageState, "partial");
  assert.ok(expired.requirements[0].reasons.includes("operational_evidence_expired"));

  records[0].validUntilExclusive = "2026-09-05T08:00:00.000Z";
  records[0].payload = {
    kind: "first_72_hour_arrangement",
    arrangementKind: "accommodation",
    confirmationState: "pending",
    travellerScope: "all_travellers",
    summary: { en: "Candidate only.", ru: "Только вариант." },
    fallback: { en: "Not selected.", ru: "Не выбран." },
    relatedContactRecordIds: [],
  };
  const pending = first72.evaluateFirst72Packet({
    manifest: currentManifest,
    operationalRecords: records,
    asOf: "2026-09-04T09:00:00.000Z",
  });
  assert.equal(pending.coverageState, "partial");
  assert.ok(pending.requirements[0].reasons.includes("operational_arrangement_pending"));
});

test("contact and arrangement payloads fail closed around dialing and provider details", () => {
  const contactBase = {
    schemaVersion: 1,
    id: "record.test.contact.v1",
    revision: 1,
    corridorId: manifest.id,
    routeId: manifest.routeId,
    requirementId: "safety.emergency_numbers",
    recordKind: "operational_contact",
    recordState: "observed",
    jurisdictions: {
      ruleJurisdiction: "jurisdiction.serbia",
      travellerNationality: "RU",
      originJurisdiction: "jurisdiction.russia",
      destinationJurisdiction: "jurisdiction.serbia",
      transit: { state: "none" },
    },
    sourceBindings: [{ sourceRole: "destination_official_guidance", sourceId: "source.test", segmentIds: [] }],
    observationId: "observation.test.contact.v1",
    evidenceFingerprint: "a".repeat(64),
    structuredValuesVerified: true,
    observedAt: "2026-09-04T08:00:00.000Z",
    validUntilExclusive: "2026-09-05T08:00:00.000Z",
    payload: {
      kind: "operational_contact",
      contactKind: "police",
      label: { en: "Police", ru: "Полиция" },
      dial: { kind: "local_short_code", value: "192" },
      usage: { en: "Emergency police response.", ru: "Экстренный вызов полиции." },
      coverage: "serbia_national",
      availability: "always",
      languageSupport: ["not_established"],
      clickToCall: true,
      copyable: true,
      offlineAvailable: true,
    },
  };
  assert.equal(guidance.operationalRecordSchema.parse(contactBase).payload.dial.value, "192");

  const badShortCode = structuredClone(contactBase);
  badShortCode.payload.dial.value = "19";
  assert.throws(() => guidance.operationalRecordSchema.parse(badShortCode));

  const noDial = structuredClone(contactBase);
  delete noDial.payload.dial;
  assert.throws(() => guidance.operationalRecordSchema.parse(noDial), /dial string or address/);

  const arrangement = structuredClone(contactBase);
  arrangement.id = "record.test.arrangement.v1";
  arrangement.requirementId = "first72.arrival_transfer";
  arrangement.recordKind = "first_72_hour_arrangement";
  arrangement.payload = {
    kind: "first_72_hour_arrangement",
    arrangementKind: "arrival_transfer",
    confirmationState: "confirmed",
    travellerScope: "all_travellers",
    summary: { en: "Transfer checked.", ru: "Трансфер проверен." },
    fallback: { en: "Recheck before travel.", ru: "Перепроверить перед поездкой." },
    relatedContactRecordIds: [],
  };
  assert.throws(() => guidance.operationalRecordSchema.parse(arrangement), /named provider/);
});
