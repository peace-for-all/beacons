import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, logLevel: "silent", root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false } });
const { contentCatalogSchema, evidenceAutomationReportsSchema } = await vite.ssrLoadModule("/lib/domain/schemas.ts");
const { projectCatalog } = await vite.ssrLoadModule("/lib/domain/catalog-view.ts");
const { projectOptions } = await vite.ssrLoadModule("/lib/domain/option-view.ts");
const { evaluateClaimEvidence } = await vite.ssrLoadModule("/lib/domain/freshness.ts");
const { BeaconsApp } = await vite.ssrLoadModule("/components/beacons/beacons-app.tsx");
const { ReviewsPage } = await vite.ssrLoadModule("/components/beacons/localized-pages.tsx");
const catalog = contentCatalogSchema.parse(JSON.parse(await readFile(new URL("../content/catalog.json", import.meta.url), "utf8")));
const automationReports = evidenceAutomationReportsSchema.parse(JSON.parse(await readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8")));
const authoritativeRun = [...automationReports.runs].reverse().find((run) => run.schemaVersion === 2 && run.mode === "authoritative_automation" && run.eligibleForActions && run.catalogReleaseId === catalog.releaseId) ?? null;
const places = projectCatalog(catalog, "2026-09-02T18:30:00.000Z", authoritativeRun);
after(async () => vite.close());

test("catalog truth records contain producer provenance and no human approval fields", () => {
  assert.doesNotMatch(catalog.releaseId, /review|verif/i);
  for (const claim of catalog.claims) {
    assert.ok(claim.producer.systemId);
    assert.ok(claim.producer.version);
    for (const removed of ["reviewState", "reviewMode", "researcherId", "verifierId", "verifiedAt", "semanticParityReview"]) {
      assert.equal(removed in claim, false, `${claim.id} still contains ${removed}`);
    }
  }
});

test("the current release has an authoritative proof run", () => {
  assert.ok(authoritativeRun);
  const historicalRun = automationReports.runs.at(-2);
  const claim = catalog.claims[0];
  assert.deepEqual(evaluateClaimEvidence({
    claim,
    automationRun: historicalRun,
    catalogReleaseId: catalog.releaseId,
    asOf: "2026-09-02T18:30:00.000Z",
  }).reasonCodes, ["automation_release_mismatch"]);
});

test("the proof explorer fails closed without confirmation controls", () => {
  const html = renderToStaticMarkup(React.createElement(ReviewsPage, { lang: "en" }));
  assert.match(html, /No proof packet: this fact cannot publish/);
  assert.doesNotMatch(html, /<form\b|type="checkbox"|data-action="(?:confirm|approve)"/i);
});

test("automation-withheld candidates remain visible but cannot light as Beacons", () => {
  assert.equal(places.length, catalog.places.length);
  assert.equal(places[0].evidenceState, "conflicting");
  assert.equal(places[0].presentation, "not_verified");
  assert.notEqual(places[0].evidenceCondition, "current");
});

test("option projection keeps evidence, availability, readiness, and money independent", () => {
  const options = projectOptions(catalog, "2026-09-02T18:30:00.000Z", authoritativeRun);
  assert.equal(options.length, catalog.routes.length);
  assert.ok(options.every((option) => option.readiness === null && option.money === null));
  assert.ok(options.every((option) => option.coverage.total > 0));
  assert.ok(options.every((option) => option.route.publicationState === "candidate"));
  assert.equal(options.find((option) => option.route.id === "route.serbia-visa-free-30")?.route.stay?.rule.kind, "per_entry");
});

test("map and list render the identical place set with explicit evidence states", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconsApp, { places, releaseId: catalog.releaseId, lang: "en" }));
  const ids = [...html.matchAll(/data-place-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, [...catalog.places.map((place) => place.id), ...catalog.places.map((place) => place.id)]);
  assert.equal((html.match(/data-status="conflicting"/g) ?? []).length, 4);
  assert.doesNotMatch(html, /pending_review|Pending review|human review/i);
  assert.doesNotMatch(html, /before approval/i);
  assert.match(html, /evidence (?:automation )?incomplete/i);
  assert.equal((html.match(/beacon-marker[^\"]*candidate/g) ?? []).length, catalog.places.length);
  assert.match(html, /role="status"/);
  assert.equal((html.match(/aria-live=/g) ?? []).length, 1);
});

test("the exploration surface starts without an implied destination selection", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconsApp, { places, releaseId: catalog.releaseId, lang: "en" }));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 0);
  assert.doesNotMatch(html, /data-slot="sheet-content"/);
});

test("page no longer contains destination facts outside the catalog", async () => {
  const page = await readFile(new URL("../app/[lang]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /mfa\.gov|welcometoserbia|Visa-free entry/);
});
