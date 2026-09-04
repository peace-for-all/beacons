import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fingerprint } from "../scripts/lib/evidence-automation-core.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });
const schemas = await vite.ssrLoadModule("/lib/domain/schemas.ts");
const { withdrawRoute } = await vite.ssrLoadModule("/lib/domain/catalog-operations.ts");
const { evaluateClaimEvidence } = await vite.ssrLoadModule("/lib/domain/freshness.ts");
const { projectCatalog } = await vite.ssrLoadModule("/lib/domain/catalog-view.ts");
const catalog = schemas.contentCatalogSchema.parse(JSON.parse(await readFile(new URL("../content/catalog.json", import.meta.url), "utf8")));
const reports = schemas.evidenceAutomationReportsSchema.parse(JSON.parse(await readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8")));
const authoritativeRun = [...reports.runs].reverse().find((run) => run.schemaVersion === 2 && run.mode === "authoritative_automation" && run.eligibleForActions);
const testAsOf = "2026-09-04T07:10:00.000Z";
const textSha256 = (value) => createHash("sha256").update(value).digest("hex");
after(async () => vite.close());

function runWithRouteState(route, state) {
  const run = structuredClone(authoritativeRun);
  const syntheticPackets = [];
  run.decisions = run.decisions.map((decision) => route.claimIds.includes(decision.claimId) ? {
    ...decision,
    state,
    publicAction: state === "current" ? "no_change" : "queue_exception",
    handler: state === "current" ? "scheduled_monitor" : state === "unavailable" ? "source_recovery" : "semantic_reextraction",
    mayAutoPublish: state === "current",
    mayRenewFreshness: state === "current",
    expectedFactSha256: state === "current" ? fingerprint(catalog.claims.find((claim) => claim.id === decision.claimId).fact) : decision.expectedFactSha256,
    expectedApplicabilitySha256: state === "current" ? fingerprint(catalog.claims.find((claim) => claim.id === decision.claimId).applicability) : decision.expectedApplicabilitySha256,
    observationIds: state === "current" ? [`observation.${decision.claimId.replace(/^claim\./, "")}.incident`] : decision.observationIds,
    proofPacketIds: state === "current" ? [`proof.${decision.claimId.replace(/^claim\./, "")}.incident`] : [],
    reasonCodes: [state === "current" ? "proof_policy_satisfied" : `automation_${state}`],
  } : decision);
  if (state === "current") {
    for (const claimId of route.claimIds) {
      const claim = catalog.claims.find((item) => item.id === claimId);
      const source = catalog.sources.find((item) => item.id === claim.supportingSourceIds[0]);
      const extract = `Official evidence for ${claim.id}`;
      const packetWithoutHash = {
        schemaVersion: 1,
        id: `proof.${claim.id.replace(/^claim\./, "")}.incident`,
        claimId: claim.id,
        claimRevision: claim.revision,
        factSha256: fingerprint(claim.fact),
        applicabilitySha256: fingerprint(claim.applicability),
        sourceId: source.id,
        observationId: `observation.${claim.id.replace(/^claim\./, "")}.incident`,
        observedAt: run.assessedAt,
        requestedUrl: source.url,
        finalUrl: source.url,
        rawSha256: "a".repeat(64),
        normalizedSha256: "a".repeat(64),
        fragmentId: `fragment.${claim.id.replace(/^claim\./, "")}.incident`,
        contextSha256: "a".repeat(64),
        extracts: [{ extract, extractSha256: textSha256(extract) }],
        extractorId: "incident-extractor",
        extractorVersion: "fixture-v2",
      };
      syntheticPackets.push({ ...packetWithoutHash, packetSha256: fingerprint(packetWithoutHash) });
    }
  }
  run.proofPackets = [...run.proofPackets.filter((packet) => !route.claimIds.includes(packet.claimId)), ...syntheticPackets];
  const withoutHash = { ...run };
  delete withoutHash.reportSha256;
  run.reportSha256 = fingerprint(withoutHash);
  return run;
}

test("false-open drill: one withdrawal contains a route and preserves its audit evidence", () => {
  const synthetic = structuredClone(catalog);
  const route = synthetic.routes.find((item) => item.id === "route.serbia-visa-free-30");
  route.publicationState = "published";
  const run = runWithRouteState(route, "current");
  const before = projectCatalog(schemas.contentCatalogSchema.parse(synthetic), testAsOf, run).find((place) => place.id === "place.belgrade");
  assert.equal(before.presentation, "verified_ordinary_route");
  assert.equal(before.publicationState, "published");

  const withdrawn = withdrawRoute(synthetic, { routeId: route.id, changeId: "change.drill-false-open", nextReleaseId: "drill-false-open-contained", operatorId: "project-owner", changedAt: "2026-09-02T16:01:00.000Z", reason: { en: "False-open containment drill", ru: "Учебное снятие ошибочно открытого маршрута" } });
  const after = projectCatalog(withdrawn, testAsOf, run).find((place) => place.id === "place.belgrade");
  assert.equal(after.publicationState, "withdrawn");
  assert.equal(after.presentation, "not_verified");
  assert.equal(withdrawn.claims.length, synthetic.claims.length);
  assert.equal(withdrawn.sources.length, synthetic.sources.length);
  assert.equal(withdrawn.changes.at(-1).rollbackReleaseId, synthetic.releaseId);
});

test("source-unavailable drill blocks otherwise automatically supported evidence", () => {
  const claim = catalog.claims.find((item) => item.id === "claim.serbia-russian-nationality");
  const route = catalog.routes.find((item) => item.id === claim.subjectId);
  const result = evaluateClaimEvidence({ claim, automationRun: runWithRouteState(route, "unavailable"), asOf: testAsOf });
  assert.equal(result.condition, "unavailable");
  assert.equal(result.blocking, true);
});

test("semantic extraction disagreement blocks an otherwise supported gate", () => {
  const claim = catalog.claims.find((item) => item.id === "claim.serbia-russian-nationality");
  const route = catalog.routes.find((item) => item.id === claim.subjectId);
  const result = evaluateClaimEvidence({ claim, automationRun: runWithRouteState(route, "changed"), asOf: testAsOf });
  assert.equal(result.condition, "unknown");
  assert.equal(result.blocking, true);
  assert.deepEqual(result.reasonCodes, ["automation_changed"]);
});

test("bad-deployment drill aborts invalid containment without mutating the catalog", () => {
  const before = JSON.stringify(catalog);
  assert.throws(() => withdrawRoute(catalog, { routeId: "route.does-not-exist", changeId: "change.invalid", nextReleaseId: "invalid-release", operatorId: "project-owner", changedAt: "2026-09-02T12:00:00.000Z", reason: { en: "Invalid test", ru: "Проверка ошибки" } }), /Unknown route/);
  assert.equal(JSON.stringify(catalog), before);
});
