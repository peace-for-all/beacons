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
const [rawCollection, rawCatalog, rawEvidenceReports] = await Promise.all([
  readFile(new URL("../content/corridor-requirements.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/catalog.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8").then(JSON.parse),
]);
const catalog = schemas.contentCatalogSchema.parse(rawCatalog);
const evidenceReports = schemas.evidenceAutomationReportsSchema.parse(rawEvidenceReports);

after(async () => {
  await vite.close();
});

function parseAndValidate(input, reports = evidenceReports) {
  const collection = corridor.corridorRequirementManifestCollectionSchema.parse(input);
  corridor.validateCorridorRequirementManifests({ collection, catalog, evidenceReports: reports });
  return collection;
}

test("the Serbia research target has a complete fail-closed corridor denominator", () => {
  const collection = parseAndValidate(rawCollection);
  const manifest = collection.manifests[0];
  const summary = corridor.summarizeCorridorManifest(manifest);

  assert.deepEqual(manifest.origins, ["moscow", "saint_petersburg"]);
  assert.equal(manifest.researchTargetOnly, true);
  assert.equal(manifest.activationAuthority, false);
  assert.deepEqual(manifest.stage3Closure, {
    status: "closed_research_scope",
    closedOn: "2026-09-04",
    actionReady: false,
  });
  assert.equal(summary.total, 60);
  assert.equal(summary.required, 59);
  assert.equal(summary.optional, 1);
  assert.deepEqual(summary.statuses, {
    current: 6,
    incomplete: 18,
    contradictory: 0,
    missing: 36,
    not_applicable: 0,
  });
});

test("Stage 3 closure distinguishes reusable evidence gaps from future case inputs", () => {
  const collection = parseAndValidate(rawCollection);
  const closure = corridor.summarizeLegalStageClosure(collection.manifests[0]);
  assert.deepEqual(closure, {
    current: 6,
    incomplete: 5,
    contradictory: 0,
    missing: 0,
    evidenceGapSlots: 3,
    runtimeInputSlots: 5,
    unclassifiedSlots: 0,
    researchClosureReady: true,
    actionReady: false,
  });

  const unclassified = structuredClone(rawCollection);
  const slot = unclassified.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.border_supporting_requirements",
  );
  delete slot.gap.remainingKinds;
  assert.throws(
    () => corridor.corridorRequirementManifestCollectionSchema.parse(unclassified),
    /distinguish evidence gaps from runtime inputs/,
  );

  const reopenedByMissingEvidence = structuredClone(rawCollection);
  const nationality = reopenedByMissingEvidence.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.nationality_and_passport_scope",
  );
  nationality.status = "missing";
  nationality.claimIds = [];
  nationality.gap = { summary: "Required proof was withdrawn.", workstreams: ["source"], remainingKinds: ["evidence_gap"] };
  assert.throws(
    () => parseAndValidate(reopenedByMissingEvidence),
    /Stage 3 research closure.*no legal slot to be missing or contradictory/,
  );

  const falselyActionReady = structuredClone(rawCollection);
  for (const entry of falselyActionReady.manifests[0].requirements) {
    if (!entry.requirementId.startsWith("legal.") || entry.status !== "incomplete") continue;
    entry.status = "current";
    delete entry.gap;
  }
  assert.throws(
    () => parseAndValidate(falselyActionReady),
    /must report action readiness honestly/,
  );
});

test("deleting, duplicating, or moving a slot cannot shrink or blur the denominator", () => {
  const missing = structuredClone(rawCollection);
  missing.manifests[0].requirements.pop();
  assert.throws(() => parseAndValidate(missing), /complete versioned requirement set/);

  const duplicate = structuredClone(rawCollection);
  duplicate.manifests[0].requirements.push(structuredClone(duplicate.manifests[0].requirements[0]));
  assert.throws(() => parseAndValidate(duplicate), /duplicate requirement slots/);

  const unknown = structuredClone(rawCollection);
  unknown.manifests[0].requirements[0].requirementId = "legal.unrecognised_slot";
  assert.throws(() => parseAndValidate(unknown), /complete versioned requirement set/);

  const crossOrigin = structuredClone(rawCollection);
  const moscowFare = crossOrigin.manifests[0].requirements.find(
    (entry) => entry.requirementId === "departure.fare_observation" && entry.origin === "moscow",
  );
  moscowFare.origin = "saint_petersburg";
  assert.throws(() => parseAndValidate(crossOrigin), /duplicate requirement slots|complete versioned requirement set/);
});

test("current and contradictory slots must match the pinned authoritative run", () => {
  const falseCurrent = structuredClone(rawCollection);
  const falseCurrentBorder = falseCurrent.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.border_supporting_requirements",
  );
  falseCurrentBorder.status = "current";
  delete falseCurrentBorder.gap;
  const driftedReports = structuredClone(evidenceReports);
  const latestRun = driftedReports.runs.find((run) => run.id === falseCurrent.manifests[0].authoritativeRunId);
  latestRun.decisions.find((decision) => decision.claimId === "claim.serbia-insurance").state = "changed";
  assert.throws(() => parseAndValidate(falseCurrent, driftedReports), /cannot be current while bound evidence is not current/);

  const falseConflict = structuredClone(rawCollection);
  const borderRequirements = falseConflict.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.border_supporting_requirements",
  );
  borderRequirements.status = "contradictory";
  assert.throws(() => parseAndValidate(falseConflict), /must bind an authoritative contradiction/);
});

test("a claim with the right evidence state cannot satisfy an unrelated slot", () => {
  const wrongCurrentKind = structuredClone(rawCollection);
  const nationality = wrongCurrentKind.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.nationality_and_passport_scope",
  );
  nationality.claimIds = ["claim.serbia-arrival-registration-host"];
  assert.throws(() => parseAndValidate(wrongCurrentKind), /cannot bind claim kind arrival_registration/);

  const wrongContradictionKind = structuredClone(rawCollection);
  const border = wrongContradictionKind.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.border_supporting_requirements",
  );
  border.claimIds = ["claim.serbia-insurance", "claim.serbia-stay-rule"];
  assert.throws(() => parseAndValidate(wrongContradictionKind), /cannot bind claim kind stay_rule/);
});

test("a current legal slot must cover all of its required semantic facts", () => {
  const partial = structuredClone(rawCollection);
  const nationality = partial.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.nationality_and_passport_scope",
  );
  nationality.claimIds = ["claim.serbia-russian-nationality"];
  assert.throws(() => parseAndValidate(partial), /nationality and ordinary-passport facts/);

  const missingReturnTicket = structuredClone(rawCollection);
  const border = missingReturnTicket.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.border_supporting_requirements",
  );
  border.status = "current";
  delete border.gap;
  border.claimIds = border.claimIds.filter((claimId) => claimId !== "claim.serbia-onward-ticket");
  assert.throws(() => parseAndValidate(missingReturnTicket), /exact return-ticket facts/);

  const missingSelfRegistration = structuredClone(rawCollection);
  const stay = missingSelfRegistration.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.stay_counting_and_registration",
  );
  stay.status = "current";
  delete stay.gap;
  stay.claimIds = stay.claimIds.filter((claimId) => claimId !== "claim.serbia-arrival-registration-self");
  const registrationCurrentReports = structuredClone(evidenceReports);
  const latestRun = registrationCurrentReports.runs.find((run) => run.id === missingSelfRegistration.manifests[0].authoritativeRunId);
  latestRun.decisions.find((decision) => decision.claimId === "claim.serbia-arrival-registration-host").state = "current";
  assert.throws(() => parseAndValidate(missingSelfRegistration, registrationCurrentReports), /host and self-arranged registration facts/);
});

test("Russian origin proof from one institutional lineage cannot make the departure slot current", () => {
  const partial = structuredClone(rawCollection);
  const origin = partial.manifests[0].requirements.find(
    (entry) => entry.requirementId === "legal.origin_departure_requirements" && entry.origin === "moscow",
  );
  origin.status = "current";
  delete origin.gap;
  const singleLineageReports = structuredClone(evidenceReports);
  const latestRun = singleLineageReports.runs.find((run) => run.id === partial.manifests[0].authoritativeRunId);
  const statutoryPackets = new Set(latestRun.proofPackets.filter((packet) => packet.sourceId === "source.russia-kdmid-federal-law-114fz").map((packet) => packet.id));
  for (const decision of latestRun.decisions) {
    decision.proofPacketIds = decision.proofPacketIds.filter((packetId) => !statutoryPackets.has(packetId));
  }
  assert.throws(() => parseAndValidate(partial, singleLineageReports), /two independent Russian lineages/);
});

test("route revision drift and unjustified omission fail closed", () => {
  const staleSnapshot = structuredClone(rawCollection);
  staleSnapshot.manifests[0].routeClaimRevisions.pop();
  assert.throws(() => parseAndValidate(staleSnapshot), /snapshot every current route claim revision/);

  const unjustified = structuredClone(rawCollection);
  const slot = unjustified.manifests[0].requirements.find(
    (entry) => entry.requirementId === "safety.emergency_numbers",
  );
  slot.status = "not_applicable";
  delete slot.gap;
  assert.throws(
    () => corridor.corridorRequirementManifestCollectionSchema.parse(unjustified),
    /Not applicable needs a structured decision/,
  );
});
