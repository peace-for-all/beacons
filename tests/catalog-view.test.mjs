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
const { formatStructuredFact } = await vite.ssrLoadModule("/lib/i18n/format.ts");
const { evaluateClaimEvidence } = await vite.ssrLoadModule("/lib/domain/freshness.ts");
const { evaluateHouseholdCounts } = await vite.ssrLoadModule("/lib/domain/household-eligibility.ts");
const { buildTravelDocumentChecklists } = await vite.ssrLoadModule("/lib/domain/travel-document-checklist.ts");
const { buildRelocationPlan } = await vite.ssrLoadModule("/lib/domain/relocation-plan.ts");
const { buildFirstStayChecks, buildPackingList } = await vite.ssrLoadModule("/lib/domain/departure-action-plan.ts");
const { departureLinks } = await vite.ssrLoadModule("/lib/domain/departure-links.ts");
const { householdMobility } = await vite.ssrLoadModule("/lib/content/household-mobility.ts");
const { BeaconsApp } = await vite.ssrLoadModule("/components/beacons/beacons-app.tsx");
const { BeaconDetail } = await vite.ssrLoadModule("/components/beacons/beacon-detail.tsx");
const { DocumentChecklist, formatChecklistsForCopy, writeChecklistToClipboard } = await vite.ssrLoadModule("/components/beacons/document-checklist.tsx");
const { RelocationPlan, formatRelocationPlanForCopy } = await vite.ssrLoadModule("/components/beacons/relocation-plan.tsx");
const { ActionPlanWorkspace, formatDepartureActionPlan } = await vite.ssrLoadModule("/components/beacons/action-plan-workspace.tsx");
const { MapToolbar } = await vite.ssrLoadModule("/components/beacons/map-toolbar.tsx");
const { messages } = await vite.ssrLoadModule("/lib/i18n/messages.ts");
const { ReviewsPage } = await vite.ssrLoadModule("/components/beacons/localized-pages.tsx");
const catalog = contentCatalogSchema.parse(JSON.parse(await readFile(new URL("../content/catalog.json", import.meta.url), "utf8")));
const automationReports = evidenceAutomationReportsSchema.parse(JSON.parse(await readFile(new URL("../content/evidence-decisions.json", import.meta.url), "utf8")));
const authoritativeRun = [...automationReports.runs].reverse().find((run) => run.schemaVersion === 2 && run.mode === "authoritative_automation" && run.eligibleForActions && run.catalogReleaseId === catalog.releaseId) ?? null;
const testAsOf = "2026-09-04T07:10:00.000Z";
const places = projectCatalog(catalog, testAsOf, authoritativeRun);
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
  const historicalRun = automationReports.runs.find((run) => run.schemaVersion === 2 && run.eligibleForActions && run.catalogReleaseId !== catalog.releaseId);
  const claim = catalog.claims[0];
  assert.deepEqual(evaluateClaimEvidence({
    claim,
    automationRun: historicalRun,
    catalogReleaseId: catalog.releaseId,
    asOf: "2026-09-03T10:00:00.000Z",
  }).reasonCodes, ["automation_release_mismatch"]);
});

test("the proof explorer fails closed without confirmation controls", () => {
  const html = renderToStaticMarkup(React.createElement(ReviewsPage, { lang: "en" }));
  assert.match(html, /No proof packet: this fact cannot publish/);
  assert.doesNotMatch(html, /<form\b|type="checkbox"|data-action="(?:confirm|approve)"/i);
});

test("evidence-supported candidates remain visible but cannot self-activate as Beacons", () => {
  assert.equal(places.length, catalog.places.length);
  assert.equal(places[0].evidenceState, "supported");
  assert.equal(places[0].presentation, "not_verified");
  assert.equal(places[0].evidenceCondition, "current");
  assert.equal(places[0].publicationState, "candidate");
});

test("authored facts remain displayable with explicit confidence metadata", () => {
  const unchecked = places.find((place) => place.city.en === "Tbilisi")?.routes[0]?.claims ?? [];
  assert.ok(unchecked.length > 0);
  assert.ok(unchecked.some((claim) => claim.confidenceState === "sourced_unchecked"));
  assert.ok(unchecked.every((claim) => ["sourced_unchecked", "source_unavailable", "current_checked"].includes(claim.confidenceState)));
  assert.ok(unchecked.some((claim) => claim.fact.kind === "stay_rule"));
  const disputed = places.flatMap((place) => place.routes).flatMap((route) => route.claims).filter((claim) => claim.confidenceState === "disputed");
  assert.equal(disputed.length, 1);

  const insurance = places[0].routes[0].claims.find((claim) => claim.id === "claim.serbia-insurance");
  assert.equal(insurance.confidenceState, "current_checked");
  assert.ok(insurance.sources.some((source) => source.relationship === "contradicts" && source.id === "source.serbia-mfa-general-entry"));
});

test("option projection keeps evidence, availability, readiness, and money independent", () => {
  const options = projectOptions(catalog, testAsOf, authoritativeRun);
  assert.equal(options.length, catalog.routes.length);
  assert.ok(options.every((option) => option.readiness === null && option.money === null));
  assert.ok(options.every((option) => option.coverage.total > 0));
  assert.ok(options.every((option) => option.route.publicationState === "candidate"));
  assert.equal(options.find((option) => option.route.id === "route.serbia-visa-free-30")?.route.stay?.rule.kind, "per_entry");
});

test("structured facts have plain-language English and Russian renderings", () => {
  for (const claim of catalog.claims) {
    const english = formatStructuredFact(claim.fact, "en");
    const russian = formatStructuredFact(claim.fact, "ru");
    assert.ok(english.length > 5, `English rendering missing for ${claim.id}`);
    assert.ok(russian.length > 5, `Russian rendering missing for ${claim.id}`);
    assert.doesNotMatch(english, /^\s*[{[]/);
    assert.doesNotMatch(russian, /^\s*[{[]/);
  }
});

test("the map exposes every destination with its bottom legal disclaimer", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconsApp, { places, lang: "en" }));
  const ids = [...html.matchAll(/data-place-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, catalog.places.map((place) => place.id));
  assert.doesNotMatch(html, /data-surface="list"/);
  assert.equal((html.match(/data-status="conflicting"/g) ?? []).length, 1);
  assert.match(html, /Not immigration or legal advice/);
  assert.doesNotMatch(html, /research-safety-banner/);
  assert.doesNotMatch(html, /pending_review|Pending review|human review/i);
  assert.doesNotMatch(html, /before approval/i);
  assert.match(html, /data-status="(?:conflicting|incomplete)"/);
  assert.equal((html.match(/beacon-marker[^\"]*candidate/g) ?? []).length, catalog.places.length);
  assert.match(html, /role="status"/);
  assert.equal((html.match(/aria-live=/g) ?? []).length, 1);
  assert.match(html, /role="list"/);
  assert.match(html, /aria-haspopup="dialog"/);
});

test("candidate route items never become instructions before a requirement manifest exists", () => {
  const claims = places.flatMap((place) => place.routes).flatMap((route) => route.claims);
  assert.ok(claims.length > 0);
  assert.ok(claims.every((claim) => claim.actionState !== "do_this"));
  const serbia = places.find((place) => place.id === "place.belgrade");
  assert.ok(serbia);
  const members = buildTravelDocumentChecklists({ place: serbia, household: { adults: 2, children: 0, dogs: 0 }, lang: "en", asOf: testAsOf });
  assert.ok(members.flatMap((member) => member.items).every((item) => item.status !== "required" && item.actionState !== "do_this"));
  const phases = buildRelocationPlan({ place: serbia, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" });
  assert.ok(phases.flatMap((phase) => phase.tasks).filter((task) => task.sources.length > 0).every((task) => task.status === "confirm"));
});

test("unresolved stay-rule semantics are quarantined from planning", () => {
  const options = projectOptions(catalog, testAsOf, authoritativeRun);
  assert.equal(options.find((option) => option.route.id === "route.turkiye-visa-free-60")?.route.stay, null);
  assert.equal(options.find((option) => option.route.id === "route.kazakhstan-visa-free-90")?.route.stay, null);
  for (const placeId of ["place.istanbul", "place.almaty"]) {
    const place = places.find((item) => item.id === placeId);
    assert.ok(place);
    const phases = buildRelocationPlan({ place, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" });
    const deadline = phases.flatMap((phase) => phase.tasks).find((task) => task.id === "arrival.deadline");
    assert.ok(deadline);
    assert.equal(deadline.status, "planning");
    assert.match(deadline.text, /confirm the lawful departure deadline/);
  }
});

test("content validation rejects a claim bound to another destination jurisdiction", () => {
  const tampered = structuredClone(catalog);
  const source = tampered.sources.find((item) => item.id === "source.turkiye-mfa-russia-visa");
  assert.ok(source);
  source.jurisdiction = "Kazakhstan";
  const result = contentCatalogSchema.safeParse(tampered);
  assert.equal(result.success, false);
  assert.match(result.error.issues.map((issue) => issue.message).join("\n"), /cannot bind source.*scoped to Kazakhstan/);
});

test("origin-departure claims require an explicit matching non-destination jurisdiction", () => {
  const tampered = structuredClone(catalog);
  const claim = tampered.claims.find((item) => item.id === "claim.serbia-russia-exit-valid-document");
  assert.ok(claim);
  claim.sourceScope.ruleJurisdiction = "Serbia";
  const result = contentCatalogSchema.safeParse(tampered);
  assert.equal(result.success, false);
  assert.match(result.error.issues.map((issue) => issue.message).join("\n"), /non-destination rule jurisdiction|scoped to Serbia cannot bind source/);
});

test("localized content rejects changed semantic numbers", () => {
  const tampered = structuredClone(catalog);
  const claim = tampered.claims.find((item) => item.summary.en.includes("30"));
  assert.ok(claim);
  claim.summary.ru = claim.summary.ru.replace(/30/, "31");
  const result = contentCatalogSchema.safeParse(tampered);
  assert.equal(result.success, false);
  assert.match(result.error.issues.map((issue) => issue.message).join("\n"), /semantic numbers differ/);
});

test("the exploration surface starts without an implied destination selection", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconsApp, { places, lang: "en" }));
  assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 0);
  assert.doesNotMatch(html, /data-slot="sheet-content"/);
});

test("the unfinished household feature is absent from the map workspace", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconsApp, { places, lang: "en" }));
  assert.doesNotMatch(html, /Check for my household/);
  assert.doesNotMatch(html, /Open now/);
});

test("the unfinished household evaluator never fabricates a passport expiry", async () => {
  const source = await readFile(new URL("../components/beacons/household-profile-sheet.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /2030-01-01/);
  assert.match(source, /passportExpiries/);
  assert.match(source, /type="date"/);
});

test("household count filtering excludes only a confirmed over-limit result", () => {
  const rules = new Map(householdMobility.rules.map((rule) => [rule.placeId, rule]));
  const serbia = places.find((place) => place.id === "place.belgrade");
  const india = places.find((place) => place.id === "place.delhi");
  const turkiye = places.find((place) => place.id === "place.istanbul");
  const uae = places.find((place) => place.id === "place.dubai");
  assert.ok(serbia && india && turkiye && uae);
  assert.deepEqual(evaluateHouseholdCounts(serbia, rules.get(serbia.id), { adults: 2, children: 2, dogs: 2 }, testAsOf), { eligible: true, assessment: "uncertain", children: "count_not_ruled_out", dogs: "supported" });
  assert.deepEqual(evaluateHouseholdCounts(serbia, rules.get(serbia.id), { adults: 2, children: 1, dogs: 0 }, testAsOf), { eligible: true, assessment: "uncertain", children: "count_not_ruled_out", dogs: "not_requested" });
  assert.deepEqual(evaluateHouseholdCounts(serbia, rules.get(serbia.id), { adults: 2, children: 0, dogs: 1 }, testAsOf), { eligible: true, assessment: "confirmed_with_requirements", children: "not_requested", dogs: "supported" });
  assert.equal(evaluateHouseholdCounts(india, rules.get(india.id), { adults: 2, children: 2, dogs: 1 }, testAsOf).assessment, "uncertain");
  assert.equal(evaluateHouseholdCounts(turkiye, rules.get(turkiye.id), { adults: 2, children: 1, dogs: 2 }, testAsOf).eligible, true);
  assert.equal(evaluateHouseholdCounts(uae, rules.get(uae.id), { adults: 2, children: 0, dogs: 3 }, testAsOf).dogs, "over_limit");
  assert.equal(evaluateHouseholdCounts(serbia, rules.get(serbia.id), { adults: 2, children: 0, dogs: 1 }, "2026-09-18T12:00:00.000+03:00").dogs, "stale");
});

test("the map toolbar exposes adult, child, and dog count filters", () => {
  const noop = () => {};
  const html = renderToStaticMarkup(React.createElement(MapToolbar, {
    t: messages.en, total: 7, shown: 7, routeFilter: "all", confidenceFilter: "all", adultCount: 2, childrenCount: 0, dogCount: 0,
    origin: "MOW", pinnedCount: 0, open: true, onOpenChange: noop, onRouteFilter: noop, onConfidenceFilter: noop,
    onAdultCount: noop, onChildrenCount: noop, onDogCount: noop, onOrigin: noop, onClear: noop, onCompare: noop,
  }));
  assert.match(html, /Household count/);
  assert.match(html, />Adults</);
  assert.match(html, />Children</);
  assert.match(html, />Dogs</);
  assert.match(html, /one document checklist per adult, child, and dog/);
});

test("household evidence has a periodic unattended renewal workflow", async () => {
  assert.ok(householdMobility.rules.every((rule) => rule.sources.every((source) => source.monitoring)));
  assert.equal(householdMobility.rules.filter((rule) => rule.dogCount.status === "supported").length, 6);
  assert.equal(householdMobility.rules.find((rule) => rule.placeId === "place.delhi")?.dogCount.status, "permit_required");
  const workflow = await readFile(new URL("../.github/workflows/evidence-refresh.yml", import.meta.url), "utf8");
  assert.match(workflow, /cron: "17 4 \*\/3 \* \*"/);
  assert.match(workflow, /npm run evidence:household-refresh/);
  assert.match(workflow, /npm run evidence:monitor/);
  assert.match(workflow, /git push/);
});

test("detail leads with aligned decision facts and keeps proof mechanics secondary", () => {
  const html = renderToStaticMarkup(React.createElement(BeaconDetail, { place: places[0], mobilityRule: householdMobility.rules[0], householdCounts: { adults: 2, children: 2, dogs: 2 }, asOf: testAsOf, lang: "en", t: messages.en }));
  assert.ok(html.indexOf("At a glance") < html.indexOf("Sources for this route"));
  assert.match(html, /What we currently know/);
  assert.match(html, /Sourced, not checked|Current and checked|Sources disagree/);
  assert.match(html, /Leaving soon/);
  assert.match(html, /Sources for this route/);
  assert.match(html, /read them directly before making your own decision/i);
  assert.match(html, /target="_blank"/);
  assert.match(html, /What still needs checking/);
  assert.match(html, /Children: 2 · Dogs: 2/);
  assert.match(html, /Count supported: up to 5/);
  assert.match(html, /vet\.minpolj\.gov\.rs/);
});

test("detail data follows the child and dog filters independently", () => {
  const common = { place: places[0], mobilityRule: householdMobility.rules[0], lang: "en", t: messages.en };
  const childOnly = renderToStaticMarkup(React.createElement(BeaconDetail, { ...common, householdCounts: { adults: 2, children: 1, dogs: 0 } }));
  const dogOnly = renderToStaticMarkup(React.createElement(BeaconDetail, { ...common, householdCounts: { adults: 2, children: 0, dogs: 1 } }));
  const neither = renderToStaticMarkup(React.createElement(BeaconDetail, { ...common, householdCounts: { adults: 2, children: 0, dogs: 0 } }));
  const russianChildOnly = renderToStaticMarkup(React.createElement(BeaconDetail, { ...common, lang: "ru", t: messages.ru, householdCounts: { adults: 2, children: 1, dogs: 0 } }));
  const russianDogOnly = renderToStaticMarkup(React.createElement(BeaconDetail, { ...common, lang: "ru", t: messages.ru, householdCounts: { adults: 2, children: 0, dogs: 1 } }));

  assert.match(childOnly, /id="mobility-rules-title">Children: 1</);
  assert.match(childOnly, /data-household-category="children"/);
  assert.doesNotMatch(childOnly, /data-household-category="dogs"/);
  assert.match(dogOnly, /id="mobility-rules-title">Dogs: 1</);
  assert.match(dogOnly, /data-household-category="dogs"/);
  assert.doesNotMatch(dogOnly, /data-household-category="children"/);
  assert.doesNotMatch(neither, /class="mobility-rules"/);
  assert.match(russianChildOnly, /id="mobility-rules-title">Дети: 1</);
  assert.doesNotMatch(russianChildOnly, /Дети и собаки/);
  assert.match(russianDogOnly, /id="mobility-rules-title">Собаки: 1</);
  assert.doesNotMatch(russianDogOnly, /Дети и собаки/);
});

test("every beacon produces separate evidence-backed document lists for every selected member", () => {
  const rules = new Map(householdMobility.rules.map((rule) => [rule.placeId, rule]));
  for (const place of places) {
    const members = buildTravelDocumentChecklists({
      place,
      mobilityRule: rules.get(place.id),
      household: { adults: 2, children: 1, dogs: 1 },
      lang: "en",
      asOf: testAsOf,
    });
    assert.deepEqual(members.map((member) => member.id), ["adult-1", "adult-2", "child-1", "dog-1"], place.id);
    assert.ok(members.every((member) => member.items.length > 0), `${place.id} has an empty member checklist`);
    assert.ok(members.flatMap((member) => member.items).every((item) => item.text.length > 4), `${place.id} has a blank action`);
    assert.ok(members.flatMap((member) => member.items).some((item) => item.sources.length > 0), `${place.id} has no checklist sources`);
  }
});

test("a two-adult household with one dog gets independently copyable actionable checklists", async () => {
  const place = places.find((item) => item.id === "place.belgrade");
  const mobilityRule = householdMobility.rules.find((rule) => rule.placeId === "place.belgrade");
  assert.ok(place && mobilityRule);
  const members = buildTravelDocumentChecklists({ place, mobilityRule, household: { adults: 2, children: 0, dogs: 1 }, lang: "en", asOf: testAsOf });
  const copyText = formatChecklistsForCopy("Belgrade, Serbia", members, messages.en);
  let clipboardText = "";
  await writeChecklistToClipboard(copyText, { clipboard: { writeText: async (value) => { clipboardText = value; } } });
  const html = renderToStaticMarkup(React.createElement(DocumentChecklist, { place, members, lang: "en", t: messages.en }));

  assert.deepEqual(members.map((member) => member.id), ["adult-1", "adult-2", "dog-1"]);
  assert.match(copyText, /Adult 1[\s\S]*Adult 2[\s\S]*Dog 1/);
  assert.match(copyText, /☐ Valid ordinary passport/);
  assert.match(copyText, /☐ Microchip identification/);
  assert.match(copyText, /Source: https:\/\//);
  assert.equal(clipboardText, copyText);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, members.flatMap((member) => member.items).length);
  assert.equal((html.match(/aria-label="Copy checklist:/g) ?? []).length, 3);
  assert.match(html, /aria-label="Copy all"/);
  assert.doesNotMatch(html, />Copy all</);
  assert.match(html, /Adult 1/);
  assert.match(html, /Adult 2/);
  assert.match(html, /Dog 1/);
});

test("application-route checklists include per-person authorisation documents without false certainty", () => {
  const place = places.find((item) => item.id === "place.delhi");
  const mobilityRule = householdMobility.rules.find((rule) => rule.placeId === "place.delhi");
  assert.ok(place && mobilityRule);
  const members = buildTravelDocumentChecklists({ place, mobilityRule, household: { adults: 1, children: 1, dogs: 1 }, lang: "en", asOf: testAsOf });
  const adultText = members[0].items.map((item) => item.text).join("\n");
  const dogText = members[2].items.map((item) => item.text).join("\n");
  assert.match(adultText, /Granted individual e-Visa \/ ETA/);
  assert.match(adultText, /Printed granted ETA/);
  assert.match(adultText, /Return or onward ticket/);
  assert.match(dogText, /DGFT licence/);
  assert.ok(members.flatMap((member) => member.items).some((item) => item.status === "confirm"));
});

test("every beacon has the complete ordered relocation sequence with uncertainty marked", () => {
  for (const place of places) {
    const phases = buildRelocationPlan({ place, household: { adults: 2, children: 1, dogs: 1 }, lang: "en" });
    assert.deepEqual(phases.map((phase) => phase.id), ["prepare_local", "arrange_remote", "after_arrival"], place.id);
    assert.ok(phases.every((phase) => phase.tasks.length > 0), `${place.id} has an empty move phase`);
    assert.ok(phases[0].tasks.some((task) => task.id === "local.work" && /remote work, leave, or resignation/.test(task.text)), `${place.id} lacks work preparation`);
    assert.ok(phases[0].tasks.some((task) => task.id === "local.home" && /rent out/.test(task.text)), `${place.id} lacks home preparation`);
    assert.ok(phases[1].tasks.some((task) => task.id === "remote.housing"), `${place.id} lacks remote housing preparation`);
    assert.ok(phases[2].tasks.some((task) => task.id === "arrival.border"), `${place.id} lacks arrival instructions`);
    const stayClaim = place.routes.flatMap((route) => route.claims).find((claim) => claim.fact.kind === "stay_rule");
    const deadline = phases[2].tasks.find((task) => task.id === "arrival.deadline");
    assert.ok(deadline, `${place.id} lacks a stay-deadline verification task`);
    assert.equal(deadline.sources.length > 0, !stayClaim?.actionQuarantine, `${place.id} does not respect its stay-rule quarantine`);
    assert.ok(phases.flatMap((phase) => phase.tasks).some((task) => task.status === "confirm"), `${place.id} does not mark uncertainty`);
    assert.ok(phases.flatMap((phase) => phase.tasks).every((task) => task.timing.length > 2), `${place.id} has an untimed instruction`);
  }
});

test("route evidence adds timely destination-specific remote and arrival actions", () => {
  const belgrade = places.find((place) => place.id === "place.belgrade");
  const delhi = places.find((place) => place.id === "place.delhi");
  assert.ok(belgrade && delhi);
  const belgradePlan = buildRelocationPlan({ place: belgrade, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" });
  const delhiPlan = buildRelocationPlan({ place: delhi, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" });
  const remoteRegistration = belgradePlan[1].tasks.find((task) => task.id === "remote.registration-arrangement");
  const arrivalRegistration = belgradePlan[2].tasks.find((task) => task.id === "arrival.registration");
  const application = delhiPlan[1].tasks.find((task) => task.id === "remote.application-window");
  const entryPoint = delhiPlan[1].tasks.find((task) => task.id === "remote.entry-point");
  assert.match(remoteRegistration?.text ?? "", /within 24 hours/);
  assert.match(remoteRegistration?.text ?? "", /traveller when arranging their own accommodation/);
  assert.match(remoteRegistration?.text ?? "", /confirm how each traveller is handled/);
  assert.doesNotMatch(remoteRegistration?.text ?? "", /register every family member/);
  assert.equal(arrivalRegistration?.timing, "Within 24 hours");
  assert.ok(arrivalRegistration?.sources.length > 0);
  assert.match(arrivalRegistration?.text ?? "", /no family-batching rule has been established/);
  assert.equal(application?.timing, "4–120 days before arrival");
  assert.match(entryPoint?.text ?? "", /Delhi Indira Gandhi International Airport/);
  assert.ok(entryPoint?.sources.length > 0);
});

test("the move stepper shows one stage at a time while full copy preserves the whole plan", async () => {
  const place = places.find((item) => item.id === "place.belgrade");
  const mobilityRule = householdMobility.rules.find((rule) => rule.placeId === "place.belgrade");
  assert.ok(place && mobilityRule);
  const household = { adults: 2, children: 0, dogs: 1 };
  const phases = buildRelocationPlan({ place, household, lang: "en" });
  const members = buildTravelDocumentChecklists({ place, mobilityRule, household, lang: "en", asOf: testAsOf });
  const copyText = formatRelocationPlanForCopy("Belgrade, Serbia", phases, members, messages.en);
  const html = renderToStaticMarkup(React.createElement(RelocationPlan, { place, phases, members, lang: "en", t: messages.en }));
  let clipboardText = "";
  await writeChecklistToClipboard(copyText, { clipboard: { writeText: async (value) => { clipboardText = value; } } });
  assert.ok(copyText.indexOf("1. Prepare locally") < copyText.indexOf("2. Arrange remotely"));
  assert.ok(copyText.indexOf("2. Arrange remotely") < copyText.indexOf("3. Complete after arrival"));
  assert.match(copyText, /Documents and preparations[\s\S]*Adult 1[\s\S]*Adult 2[\s\S]*Dog 1/);
  assert.match(copyText, /Planning step/);
  assert.match(copyText, /Confirm before travel/);
  assert.equal(clipboardText, copyText);
  assert.match(html, /Where are you now\?/);
  assert.equal((html.match(/data-stage-choice=/g) ?? []).length, 3);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.equal((html.match(/data-phase=/g) ?? []).length, 3);
  assert.equal((html.match(/data-state="active"[^>]*data-phase="prepare_local"/g) ?? []).length, 1);
  assert.equal((html.match(/data-state="inactive"[^>]*hidden=""[^>]*data-phase=/g) ?? []).length, 2);
  assert.match(html, /aria-label="Copy full plan"/);
  assert.doesNotMatch(html, />Copy full plan</);
  assert.equal((html.match(/aria-label="Copy phase:/g) ?? []).length, 1);
  assert.match(html, /Documents and preparations/);
});

test("the departure workspace exposes five focused modules and produces one complete plan", () => {
  const place = places.find((item) => item.id === "place.belgrade");
  const mobilityRule = householdMobility.rules.find((rule) => rule.placeId === "place.belgrade");
  assert.ok(place && mobilityRule);
  const household = { adults: 2, children: 1, dogs: 1 };
  const members = buildTravelDocumentChecklists({ place, mobilityRule, household, lang: "en", asOf: testAsOf });
  const phases = buildRelocationPlan({ place, household, lang: "en" });
  const packing = buildPackingList(household, "en");
  const firstStayChecks = buildFirstStayChecks(household, "en");
  const departure = departureLinks(place.id, "MOW");
  const html = renderToStaticMarkup(React.createElement(ActionPlanWorkspace, { place, household, members, phases, lang: "en", t: messages.en, origin: "MOW", departure }));
  const text = formatDepartureActionPlan({
    destination: "Belgrade, Serbia",
    route: "Visa-free route",
    stay: "Confirm current stay limit",
    uncertainty: "First accommodation not verified",
    members,
    packing,
    firstStayChecks,
    checked: new Set(["pack.documents", "stay.cancellable"]),
    notes: { travelRoute: "Direct flight", travelDate: "12 September", stayName: "Example hotel", stayAddress: "Example address", stayContact: "Late check-in confirmed", stayTransfer: "Airport taxi" },
    origin: "Moscow",
    airport: departure.airport,
    phases,
    t: messages.en,
  });

  assert.equal((html.match(/data-action-module=/g) ?? []).length, 5);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 5);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.match(html, /Departure plan/);
  assert.match(html, /Where/);
  assert.match(html, /Documents/);
  assert.match(html, /Take/);
  assert.match(html, /Fly/);
  assert.match(html, /First stay/);
  assert.match(text, /1\. Where[\s\S]*2\. Documents[\s\S]*3\. Take[\s\S]*4\. Fly[\s\S]*5\. First stay/);
  assert.match(text, /☑ Passports/);
  assert.match(text, /Example hotel[\s\S]*Example address[\s\S]*Airport taxi/);
  assert.match(text, /Personal note|not verified|planning candidate/i);
  assert.match(text, /Your move sequence/);
});

test("the move stepper has direct English and Russian position choices", () => {
  const place = places[0];
  const phasesEn = buildRelocationPlan({ place, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" });
  const phasesRu = buildRelocationPlan({ place, household: { adults: 2, children: 0, dogs: 0 }, lang: "ru" });
  const english = renderToStaticMarkup(React.createElement(RelocationPlan, { place, phases: phasesEn, members: [], lang: "en", t: messages.en }));
  const russian = renderToStaticMarkup(React.createElement(RelocationPlan, { place, phases: phasesRu, members: [], lang: "ru", t: messages.ru }));

  for (const label of ["I am preparing my life at home", "I am arranging entry and the trip", "I have arrived at the destination", "What to do now", "0 of 5 actions done"]) assert.match(english, new RegExp(label));
  for (const label of ["Я готовлю дела дома к отъезду", "Я организую въезд и поездку", "Я уже на месте", "Что делать сейчас", "Выполнено действий: 0 из 5"]) assert.match(russian, new RegExp(label));
  assert.doesNotMatch(english, /Я готовлю дела дома|Что делать сейчас/);
  assert.doesNotMatch(russian, /I am preparing my life at home|What to do now/);
});

test("optional child and dog instructions follow the selected household", () => {
  const place = places[0];
  const adultsOnly = buildRelocationPlan({ place, household: { adults: 2, children: 0, dogs: 0 }, lang: "en" }).flatMap((phase) => phase.tasks.map((task) => task.id));
  const fullHousehold = buildRelocationPlan({ place, household: { adults: 2, children: 1, dogs: 1 }, lang: "en" }).flatMap((phase) => phase.tasks.map((task) => task.id));
  assert.doesNotMatch(adultsOnly.join(" "), /school|dog/);
  for (const id of ["local.school", "remote.school", "arrival.school", "local.dog", "remote.dog-carrier", "arrival.dog"]) assert.ok(fullHousehold.includes(id));
});

test("the relocation sequence is fully usable in Russian", () => {
  const place = places[0];
  const phases = buildRelocationPlan({ place, household: { adults: 2, children: 1, dogs: 1 }, lang: "ru" });
  const tasks = phases.flatMap((phase) => phase.tasks);
  assert.match(tasks.find((task) => task.id === "local.work")?.text ?? "", /удалёнка/);
  assert.match(tasks.find((task) => task.id === "remote.housing")?.text ?? "", /первое жильё/);
  assert.match(tasks.find((task) => task.id === "arrival.border")?.timing ?? "", /пограничной зоны/);
  assert.ok(tasks.every((task) => !/Start now|Before departure|First week/.test(task.timing)));
});

test("every authored detail fact has a compact, accessible source citation", () => {
  for (const place of places) {
    const html = renderToStaticMarkup(React.createElement(BeaconDetail, { place, lang: "en", t: messages.en }));
    const claims = place.routes.flatMap((route) => route.claims);
    for (const claim of claims) {
      assert.match(html, new RegExp(`data-claim-id="${claim.id}"`), `missing rendered fact ${claim.id}`);
      assert.match(html, new RegExp(`data-citation-for="${claim.id}"`), `missing source citation for ${claim.id}`);
      for (const source of claim.sources) {
        assert.match(html, new RegExp(`data-source-id="${source.id}"`), `missing source link ${source.id}`);
      }
    }
    assert.match(html, /class="fact-citation (?:supports|contradicts)"/);
    assert.match(html, /aria-label="Official sources \d+:/);
    assert.match(html, /target="_blank" rel="noreferrer"/);
  }
});

test("comparison aligns decision rows without inventing missing costs", async () => {
  const source = await readFile(new URL("../components/beacons/option-compare-sheet.tsx", import.meta.url), "utf8");
  for (const row of ["routeKind", "nominalStay", "routeRequirements", "primaryUncertainty", "informationStatus", "practicalDeparture", "firstMonthEstimate"]) assert.match(source, new RegExp(`t\\.${row}`));
  assert.match(source, /t\.estimateNotCollected/);
  assert.match(source, /t\.researchOnlyNotice/);
  assert.match(source, /coverageStatus/);
  assert.match(source, /actionQuarantine/);
  assert.doesNotMatch(source, /find\(\(claim\) => claim\.confidenceState === "current_checked"\)/);
});

test("page no longer contains destination facts outside the catalog", async () => {
  const page = await readFile(new URL("../app/[lang]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /mfa\.gov|welcometoserbia|Visa-free entry/);
});
