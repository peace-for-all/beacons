# Plan: turn the candidate atlas into a usable household option map

## Outcome

Deliver a private evidence alpha that a person in the supported audience can use
to answer five questions without reading the internal evidence system:

1. Which destinations currently have a verified ordinary route for this
   household?
2. Which documents are needed for every adult and child?
3. How long may the household lawfully stay, and what dates or prior travel
   affect that answer?
4. What is a defensible 30-day cash range from Moscow or Saint Petersburg, and
   what is the household's gap to that range?
5. What is one useful next action for a chosen option?

The first meaningful release is not “seven dots on a map.” It is at least two
current, deeply supported options—one visa-free and one application route—shown
in a map/list interface, evaluated for one or two adults and exactly two children
aged 6–17, with Emergency and Basic costs and one generated next action.

The unpersonalised map remains available before any form. Personalisation adds
readiness and money annotations; it never hides the underlying destinations,
ranks human worth, or turns money into a legal gate.

## Priority decision

Complete the vertical user journey before adding more geographic decoration or
more shallow candidates.

The critical path is:

```text
green baseline
  -> plain, map-first option surface
  -> two evidence-complete routes
  -> household readiness
  -> current 30-day cost ranges
  -> compare and build one option
  -> comprehension/usability alpha
  -> expand to five routes and operational beta
```

Defer destination-country outlines, Homes, Hub graphing, dog logistics, Soft
landing costs, community reports, accounts, and richer exports until that flow
works. Pan/zoom and collision handling are useful map behavior; country-wide
glow is not.

## Verified repository baseline

This plan is based on the worktree on 2026-09-03, not solely on the older
milestone prose.

- Branch/HEAD is `main` at `484ae3c`, with a large uncommitted evidence and
  seven-destination slice. Preserve it. Do not reset, regenerate, reformat, or
  commit it as if it belonged to a new implementation task.
- The current release is `m4-seven-route-atlas`: 7 places, 7 candidate routes,
  59 claims, 16 sources, 16 evidence contracts, and 0 cost observations.
- The latest current-release automation run has 16 current decisions, 41
  uncovered claims, and 2 contradictory claims. No route can currently be
  presented as a mature option.
- Serbia has 6 current claims out of 13, 6 uncovered claims, and an insurance
  contradiction. India has 10 current claims out of 15, 4 uncovered claims,
  and a fee contradiction. The other five routes have no executable claim
  contracts yet.
- `humanHouseholdProfileSchema`, `journeyContextSchema`, and the pure
  `evaluateHumanRoute` logic already exist. They are well tested but are not
  connected to visitor UI.
- `costObservationSchema` exists, but the catalog contains no observations and
  there is no money evaluator, cost UI, option-plan generator, or profile
  storage layer.
- `BeaconsApp` preselects the first place. The home route always renders its
  long detail column, while the desktop grid reserves 320 px for introduction
  and 390–470 px for details. On mobile, a seven-row list precedes the map.
- The map uses real bundled Natural Earth geometry and HTML marker buttons, but
  has no pan, zoom, collision layout, or keyboard camera. Yerevan and Tbilisi
  overlap at fitted mobile and desktop scales.
- Authored UI copy is split between `lib/i18n/messages.ts`, local stores in
  `localized-pages.tsx`, and `site-nav.tsx`; only the first store is parity
  checked. The ordinary detail layer exposes raw JSON and internal vocabulary.
- `npm run check` passes content validation, freshness, i18n, typecheck, and
  build, then fails in `tests/rendered-html.test.mjs` because the home headline
  expectation is stale. Lint has two warnings. The build also reports a large
  client chunk: the home feature is about 802 KB minified / 254 KB gzip, mostly
  because client code imports the full atlas/projection stack.
- `.openai/hosting.json` has neither D1 nor R2. Keep the MVP static-first and
  device-local; no database or account is needed.

## Definition of “usable” for the evidence alpha

All of the following must be true before inviting target users:

- Two routes pass the complete action-eligible evidence gate at the current
  time. Candidate or contradictory routes remain visible but never look usable.
- An ordinary load shows a meaningful map and compact option list without a
  questionnaire, default destination, or open detail panel.
- A user can select a place by marker or list, understand its status and stay
  rule, and see what is checked, what remains unknown, and when it was checked.
- A supported household can be entered in roughly two minutes without names,
  dates of birth, motivations, or family-relationship interrogation.
- Every declared adult and child is evaluated independently. “Open now” appears
  only when all people and route-specific declarations pass current evidence.
- Both pilot options have Emergency and Basic 30-day ranges for Moscow and
  Saint Petersburg. Missing or stale costs say “not estimated”; they never
  become zero.
- The money range, cash gap, and optional reserve are visually and semantically
  separate from legal route status.
- A user can compare the two options on route, stay, missing documents, costs,
  freshness, and unknowns without a composite score or “best country” label.
- A verified, evaluated option can produce three short horizons and exactly one
  initial next action. A candidate cannot produce travel instructions.
- English and Russian are complete; mobile, keyboard, screen-reader, zoom,
  reduced-motion, storage-failure, and low-bandwidth paths remain usable.
- Personal data remains in ephemeral React state unless the user explicitly
  saves it. Saved data is versioned, device-local, inspectable, and clearable.

## Product and architecture rules

1. Preserve the existing Vinext/Vite/Cloudflare Sites architecture, npm
   lockfile, Node 22.22.2 runtime, Zod contracts, and `node:test` suite.
2. Keep D1, R2, authentication, analytics, remote fonts, map tiles, geolocation,
   and server-side profiles out of the alpha.
3. Keep these axes independent in types, evaluators, UI, and tests:
   evidence condition, route availability, household readiness, stay result,
   cost availability, and money gap.
4. Only a complete current automation decision and valid proof chain may support
   a route. Never add a manual “verified” toggle or resolve a contradiction by
   source count, model confidence, or UI wording.
5. Use installed shadcn primitives for sheets, dialogs, fields, selections,
   buttons, and alerts; use Lucide icons. Add a library only for behavior the
   installed primitives do not provide.
6. Keep all seven current places visible, but distinguish “verified option,”
   “some rules checked,” “not checked,” “source conflict,” and “withdrawn” with
   text and shape as well as color.
7. Keep original official titles, excerpts, publishers, and URLs unchanged.
   Visitor explanations are localized; machine facts and provenance remain the
   legal/evidence source of truth.
8. Do not put destination selection, camera, household, cash, documents, saved
   options, or rejected options in a URL, request, log, or telemetry event.
9. Do not run or edit `scripts/seed-destination-possibilities.mjs`. It is an
   already-run, untracked migration artifact, not the maintained content source.
10. Do not deploy, publish, push, or alter `.openai/hosting.json` unless the
    project owner separately asks for it.

## Implementation sequence

### Phase 0 — stabilize and protect the current slice

Purpose: establish a green, reviewable baseline before mixing user-facing work
with the existing uncommitted evidence changes.

Files to inspect first:

- all current `git status --short` entries;
- `content/catalog.json`, `content/monitoring-config.json`,
  `content/monitoring-reports.json`, `content/evidence-decisions.json`;
- the new evidence-log/run-selection modules and their tests;
- `tests/rendered-html.test.mjs` and the two files named by lint warnings.

Work:

1. Confirm with the task owner whether the existing m4 worktree is to be kept as
   one slice or reviewed/landed separately. Never stage, discard, or rewrite it
   implicitly.
2. Replace the stale headline-specific rendered test with an assertion for the
   current localized home contract or the final Phase 1 heading. Retain checks
   for `<html lang>`, opposite-language leakage, redirects, and preview metadata.
3. Remove the two known unused-variable warnings without changing evidence-log
   behavior.
4. Add a small repository snapshot test/report that prints place, route, claim,
   source, contract, cost, and decision-state counts. This makes future plans and
   release reviews compare against executable data rather than milestone prose.
5. Record the current minified and gzip sizes of the home feature chunk before
   map changes.
6. Run the complete gate under `.nvmrc` and preserve the output as the baseline.

Exit gate: `npm run check` and `git diff --check` pass; the only source changes
are deliberate; existing evidence history still validates as append-only.

### Phase 1 — define one visitor-facing option contract and plain language

Purpose: stop asking UI components to interpret the raw catalog ad hoc.

Add or refactor:

- `lib/domain/option-view.ts` for visitor-facing types and pure projection;
- `lib/domain/prepared-route.ts` for the minimal client-safe household model;
- `lib/i18n/home-messages.ts`, `nav-messages.ts`,
  `static-page-messages.ts`, `metadata-messages.ts`, and `format.ts`;
- `lib/i18n/messages.ts` as a narrow compatibility/type hub;
- `components/beacons/status.ts` as mappings over the new view types;
- projection, parity, formatting, and editorial-integrity tests.

Define an `OptionView` with explicit fields rather than a composite status:

```ts
type OptionView = {
  place: { id: string; city: LocalizedText; country: LocalizedText; coordinates: [number, number] };
  route: {
    id: string;
    kind: RouteKind;
    availability: RouteAvailability;
    publicationState: "candidate" | "published" | "withdrawn";
    evidenceCondition: EvidenceCondition;
    stay: StructuredStaySummary | null;
    checkedAt: string | null;
    nextCheckAt: string | null;
  };
  coverage: { current: number; total: number; blockingQuestions: LocalizedText[] };
  readiness: HouseholdReadinessView | null;
  money: MoneyView | null;
};
```

Work:

1. Refactor `projectCatalog` into or behind `projectOptions`, preserving the
   existing evidence evaluator. Do not recompute legal truth in components.
2. Refactor `evaluateHumanRoute` so server-side evidence preparation and
   client-side household evaluation share one contract:
   - `prepareRouteForHousehold(...)` validates current route evidence and emits
     only structured stay, entry-point, application, and document requirements;
   - `evaluatePreparedRoute(...)` accepts that minimal model plus profile and
     journey state;
   - `evaluateHumanRoute(...)` composes both for compatibility and regression
     tests.
   A candidate produces no action-eligible prepared model.
3. Centralize all authored labels and descriptions in checked locale modules.
   Do not pull static-page or metadata copy into the home client bundle.
4. Render every structured fact kind through typed EN/RU formatters. Raw JSON,
   hashes, internal IDs, extractor versions, and reason codes belong in a
   collapsed “Technical details” section only.
5. Use direct public labels:
   - Verified option / Проверенный вариант
   - Application available / Можно подать заявление
   - Some rules checked / Часть правил проверена
   - Not checked yet / Пока не проверено
   - Sources conflict / Источники противоречат
   - What still needs checking / Что ещё нужно проверить
6. Rewrite catalog `summary`, `limitations`, `unknowns`, and existing change
   explanations only behind a deterministic semantic projection/hash test. The
   test must prove that IDs, revisions, structured facts, applicability,
   criticality, source references, route/place states, and dates did not change.
7. Update page titles/descriptions and the public reviews/monitoring/methodology
   copy to explain facts first and machinery second. Preserve legal
   qualifications and uncertainty.

Exit gate: every public label comes from parity-checked locale data; structured
facts render equivalent values in EN/RU; no evidence or publication state
changes because of editorial work.

### Phase 2 — make the home route a usable map/list workspace

Purpose: let people explore first and request detail only when they choose it.

Touch or add:

- `components/beacons/beacons-app.tsx`;
- `beacon-map.tsx`, `beacon-list.tsx`, `beacon-detail.tsx`;
- `beacon-detail-sheet.tsx`, `map-controls.tsx`, `use-map-camera.ts`;
- `lib/map/map-camera.ts`, `lib/map/marker-layout.ts`;
- the home portion of `app/globals.css` and focused DOM/geometry tests.

Work:

1. Initialize `selectedId` to `null` and `detailOpen` to `false`. An ordinary
   load must not imply a recommendation by selecting the first catalog record.
2. Replace the three permanent columns with a compact heading/status row, a
   horizontal 44 px-minimum option rail, and a map that dominates the remaining
   viewport. At 390 × 844, the map must appear before any long details.
3. Make list and marker activation call the same selection action and open one
   controlled Sheet. Use a right sheet at 768 px and above and a bottom sheet on
   smaller screens. Escape and a localized close button close it and return
   focus to the exact activating marker/list control.
4. Order detail content for decisions:
   - public status and route kind;
   - lawful stay rule and checked date;
   - what is checked for adults and children;
   - what still needs checking;
   - cost/readiness placeholders until Phases 4–5;
   - collapsed facts and sources;
   - collapsed technical trace.
5. Add one constrained camera for wheel/trackpad, drag, touch/pinch,
   double-click, `+`, `-`, reset, arrow keys, `+`/`-`, and Home/`0`. Do not
   intercept Ctrl/Command-wheel browser zoom or gestures starting on controls.
6. Keep marker controls at 44 × 44 CSS pixels. Apply the same camera transform
   to basemap, route lines, true marker anchors, and Moscow origin. Use a
   deterministic screen-space collision helper and leader lines for overlapping
   markers; never shrink the target or move the route endpoint away from its
   geographic anchor.
7. Keep the complete option rail available without geography, color, pointer,
   or zoom. Selected/focused markers may show full labels; other labels may be
   collision-suppressed because the rail remains the equivalent.
8. Keep one polite live region for selection/readiness changes. Use visible
   focus, text plus shape/dash status distinctions, and reduced-motion styles.
9. Preserve selection and camera across an explicit EN/RU switch with a
   validated, one-use `sessionStorage` handoff. Do not store `detailOpen` or
   destination history. Direct load/refresh starts unselected.
10. Do not add country outlines in this phase. The existing neutral land/border
    geometry is sufficient for orientation.

Exit gate: the first viewport is an exploration surface; every place is usable
from marker or list; all camera inputs operate one constrained transform; no map
interaction alters route truth.

### Phase 3 — produce two evidence-complete pilot options

Purpose: replace a visually polished candidate map with real options. This
evidence track can begin after Phase 0 while Phases 1–2 are implemented, but its
generated records must be integrated sequentially.

Start with the existing Serbia and India work because it has the most executable
coverage, but do not force either through a contradiction. Create
`specs/pilot-option-scorecard.md` and compare all seven routes on:

- availability of controlling/official sources for every required gate;
- explicit ordinary Russian passport and child applicability;
- passport validity and stay-window clarity;
- application/entry-point operational clarity;
- unresolved official contradictions;
- cost-source reproducibility from both origins;
- monitor fetch/parse reliability;
- expected maintenance burden.

Select one visa-free route and one application route. India is the default
application candidate. Serbia is the default visa-free candidate only if the
insurance, passport-validity, and child/funds questions can be resolved by the
configured authority policy and exact official evidence. Otherwise choose the
highest-scoring visa-free candidate; do not weaken the gate.

For each pilot:

1. Audit the route against the required claim packet in
   `specs/evidence_handbook.md`: nationality, ordinary passport, operational
   availability, structured stay, passport presence/validity, every mandatory
   document/fee, adult/child applicability, entry/application restrictions,
   insurance/funds/accommodation/onward travel, and effective dates.
2. Correct structured facts only through a new claim revision, source lineage,
   bilingual changelog entry, and regression fixture. Never edit history to make
   it agree with the desired outcome.
3. Add allow-listed sources and exact bounded fragment checks to
   `monitoring-config.json`. Use official primary sources for route gates;
   secondary search results may discover sources but cannot support a claim.
4. Add one executable evidence contract per supporting claim. Pin fact and
   applicability hashes, source/fragment locators, context, authority policy,
   and baseline provenance.
5. Run a complete monitoring acquisition and authoritative evaluation for the
   new catalog release. Every action-eligible decision must have a valid proof
   packet; a failed fetch/parse cannot renew evidence.
6. Resolve a contradiction only with an explicit, versioned precedence rule
   justified by the relevant jurisdiction and source relationship. If equally
   authoritative sources still disagree, retain the conflict and remove that
   route from the pilot.
7. Exercise `route:withdraw` and the shared-source incident fixtures against the
   pilot before exposing it as usable.

Exit gate: two different route shapes evaluate as promotable/current with no
blocking gate claims, every displayed route fact has a traceable proof, and the
UI shows them as verified options. This is evidence alpha; it does not satisfy
the later four-week public-beta requirement.

### Phase 4 — connect progressive household readiness

Purpose: answer “does this work for the people travelling with me?” without
blocking exploration or collecting unnecessary personal data.

Add:

- `components/beacons/household-profile-sheet.tsx`;
- `household-basics.tsx`, `route-questions.tsx`, `readiness-summary.tsx`;
- `lib/profile/schema.ts`, `storage.ts`, and migration tests;
- prepared-route and component-interaction tests.

Work:

1. Add a visible “Check for my household” action after the unpersonalised map.
   State the current boundary before entry: one or two adults, exactly two
   children aged 6–17, ordinary Russian passports.
2. Ask the smallest shared set first: adult count, each child's whole-year age,
   travel-cost origin, optional arrival/departure dates, and each traveller's
   passport presence/expiry. Never ask for names, birth dates, motivations, or a
   family diagram.
3. Initialize unasked documents/authorizations to `unknown`. Ask route-specific
   questions only after the user opens a verified option; derive those questions
   from the prepared route model so UI and evaluator cannot drift.
4. Re-evaluate every route locally after each answer. Display independent
   results for route availability, stay, each traveller, entry point, and
   provisional dates. “Open now” requires current route evidence and `ready` for
   every traveller.
5. Keep candidates and unsupported profiles visible. Use “we cannot check this
   profile yet,” never a guessed approximation or “closed.”
6. Group or annotate the list as Open now / Needs documents / Not fully checked,
   but never remove places. Default ordering within a group must be stable and
   non-evaluative (catalog order or localized city order).
7. Keep profile state ephemeral by default. Only an explicit “Save on this
   device” action writes the versioned, Zod-validated payload to `localStorage`.
   Handle corrupt/old/unavailable storage by ignoring it, and provide “Clear my
   data” beside the save control.
8. Preserve the profile across EN/RU on the device without putting any value in
   the URL. Explain that device-local storage is not encryption.

Exit gate: truth-table tests cover 1/2 adults, child ages 6 and 17, missing and
unknown passports, passport date boundaries, application documents, rolling
stay history, entry points, absent dates, unsupported profiles, and storage
migration/failure.

### Phase 5 — add honest 30-day costs and money distance

Purpose: answer “how far away is this option financially?” without promising
inventory or changing legal status.

The current aggregate `costObservationSchema` is not sufficient for a useful
calculation: it has no optional-reserve record, no actual exchange rate, and
binds observations to exact child ages. Migrate it before adding numbers.

Add or refactor:

- componentized cost and exchange-rate schemas in `lib/domain/schemas.ts`;
- `lib/domain/money.ts` with integer-minor-unit arithmetic;
- `components/beacons/money-summary.tsx` and `cost-methodology.tsx`;
- pilot cost records in `content/catalog.json` or a validated split content file;
- cost invariant, freshness, and localized formatting tests.

Use a model that records, per component:

- place, origin, 30-day period, Emergency/Basic mode, and household
  applicability;
- category: outbound travel, accommodation, food, essential local transport,
  mandatory insurance, or administrative fees;
- lower/upper minor units, native currency, observed date/window, inclusion
  rule, source IDs, methodology, and volatility/freshness window;
- whether the component is required cash or optional reserve;
- an official, dated exchange-rate observation when cash and estimate currencies
  differ.

Work:

1. Before research, have the product owner approve the Emergency accommodation
   standard. Recommended default: a lawful, actually bookable, lockable space
   that sleeps the complete household for 30 nights and has sanitary access; no
   dorm/shared sleeping assumption for children. Basic adds a modest private
   family unit and ordinary local living costs.
2. Research both pilot places for both origins, 1- and 2-adult households, and
   both modes. Use reproducible recent sources and record the exact observation
   window. A single live listing is an observation, not guaranteed inventory.
3. Reuse structured legal fees/funds/insurance requirements rather than typing a
   second conflicting amount into the cost model. Project one source fact into
   both legal explanation and money calculation.
4. Return `estimated`, `stale`, `not_estimated`, or `profile_not_covered` before
   returning a range. Never extrapolate Moscow to Saint Petersburg, one mode to
   another, or a missing household case.
5. Calculate required range and cash gap separately:
   `gapLow = max(0, requiredLow - cash)` and
   `gapHigh = max(0, requiredHigh - cash)`. Round currency conversion outward so
   the displayed range never becomes narrower through rounding.
6. Display native/selected currency, observation date, inclusions, major
   uncertainty, and source/methodology. Show optional reserve in a separate card
   and never add it to route readiness.
7. Add cost freshness checks to `npm run check`; stale volatile components turn
   the estimate into “not current,” not into a stale numeric recommendation.

Exit gate: both pilot options have current Emergency and Basic ranges for both
origins, all supported household shapes, reproducible source lineage, explicit
uncertainty, and pure evaluator tests proving money cannot alter route status.

### Phase 6 — compare options and build one small plan

Purpose: turn facts into an action without pretending to recommend a country or
a move.

Add:

- `lib/domain/option-compare.ts` and `plan.ts`;
- `components/beacons/compare-tray.tsx`, `option-comparison.tsx`, and
  `plan-builder.tsx`;
- `lib/profile/plan-storage.ts` and deliberate export helpers;
- deterministic bilingual plan/compare tests.

Work:

1. Let the user pin up to three places from map, list, or detail. Comparison rows
   are route/stay, evidence date, household readiness, missing documents,
   unresolved questions, required 30-day range, cash gap, and optional reserve.
2. Never calculate a composite score, friendliness/safety judgment, or “best”
   badge. Preserve unknown/not-estimated cells rather than sorting them last as
   if they were bad results.
3. Enable “Build this option” only for a current verified route. If household or
   cost inputs are incomplete, the plan may ask for the next missing declaration
   but must not present a ready travel checklist.
4. Generate three short horizons from structured route requirements, profile
   gaps, lead times, urgency, and money gap:
   - Can do without spending;
   - Can build;
   - Ready option.
5. Choose exactly one initial next action using deterministic precedence:
   resolve an evidence/profile unknown, then obtain/renew a required document,
   then complete an application-timing step, then close the required money gap.
   Never suggest spending while a blocking legal unknown remains.
6. Save a chosen option only after explicit confirmation. Store stable semantic
   IDs and user declarations, not copied source passages or a frozen “verified”
   boolean; always re-evaluate against the current catalog on load.
7. First export Markdown and print-friendly HTML. Preview every included field,
   exclude cash/document declarations by default, and include generation time,
   catalog release, fact-check dates, and a verify-before-travel warning.

Exit gate: both languages produce deterministic plans; changing money never
changes legal steps; a later withdrawal visibly invalidates a saved plan; export
contains no undeclared private fields.

### Phase 7 — prove comprehension, accessibility, privacy, and performance

Purpose: verify the product works for people rather than only for its schemas.

Automated work:

1. Add focused DOM tests using `jsdom`, Testing Library, and `user-event` while
   keeping `node:test`/Vite as the runner. Stub `ResizeObserver`, `matchMedia`,
   storage, and element bounds.
2. Test no initial selection, marker/list equivalence, detail focus recovery,
   all map inputs, collision layout, localized names, profile progression,
   readiness changes, money gaps, compare, plan, clear-data, and storage failure.
3. Add an accessibility scan to representative EN/RU states. Retain manual
   keyboard and screen-reader checks because an automated scan is insufficient.
4. Inventory browser requests during map, profile, cost, save, compare, and plan
   interactions. No cited source should auto-fetch and no household value should
   leave the browser.
5. Remove the full atlas payload from the home client graph before public beta.
   Prefer a server-rendered/canonical regional basemap passed as an opaque child
   to the client camera, or a checked-in clipped/simplified regional artifact.
   Keep Natural Earth attribution and exact marker projection. Target a home
   feature chunk below 180 KB gzip; at minimum, do not regress from the recorded
   baseline.
6. Test the production worker at 1440 × 900, 1024 × 768, 768 px, 390 × 844, and
   320 px; at 200%/400% zoom; with reduced motion; and with JavaScript/storage
   failures. Check both languages and long Russian strings.

Private usability alpha:

- Recruit 5 target users before scaling beyond two routes. Include Russian-first
  and mobile-only users; include keyboard/low-vision/screen-reader participants
  as early as recruitment permits.
- Give scenarios, not leading explanations. Ask each person to find two options,
  explain the difference between unknown and closed, check a household, compare
  cash gaps, and identify the next action.
- Do not collect real names, passport data, motivations, or detailed family
  history. Use fictional profiles unless a participant deliberately uses local
  device data that is never transmitted.
- Release-blocking failures are: treating a candidate as usable, treating an
  application as guaranteed, treating money as eligibility, missing a child,
  assuming a stale price is current, or being unable to find/clear saved data.
- Update wording and interaction before adding destinations. Record issues by
  task/state, not by sensitive user story.

Exit gate: at least 4 of 5 participants can complete the core flow and correctly
explain the status distinctions without coaching; there are no critical WCAG
2.2 AA, privacy-egress, or low-bandwidth defects.

### Phase 8 — expand from evidence alpha to closed/public beta

Only after Phase 7:

1. Use the pilot scorecard and observed maintenance cost to select three more
   routes. Complete depth before adding more dots.
2. Bring all five through the same claim, proof, cost, profile, and incident
   gates. Do not clone assumptions between jurisdictions.
3. Run a closed beta with 8–12 participants across both languages, both origins,
   mobile-only use, limited English, keyboard, low vision, and screen reader.
4. Complete four genuine consecutive weekly monitoring cycles for every public
   route. Historical same-day runs do not count as weekly cycles.
5. Name the automation operator, release owner, and incident contact. Rehearse
   route withdrawal, correction, app/content rollback, and deployment rollback.
6. Add profile-free uptime/error monitoring only after documenting unavoidable
   hosting logs and retention. Do not add behavioral analytics.
7. Publish through the existing Sites project only after the project owner asks
   for deployment and every public-beta gate in `specs/implementation_plan.md`
   passes.

## Required test matrix

### Evidence and release integrity

- Current-release selection rejects action-eligible history from another
  release.
- Every current decision has a valid claim revision, contract, observation,
  proof packet, source/fragment mapping, hashes, and append-only predecessor.
- Candidate, stale, unavailable, changed, conflicting, and withdrawn routes
  fail closed.
- A copy-only edit cannot alter the semantic catalog projection.
- A pilot shared-source failure demotes every dependent claim/route.

### Household and stay

- One and two adults; children aged 6 and 17; invalid child counts/ages.
- Passport missing, unknown, expired, minimum days, and calendar-month edges.
- Visa-free and per-traveller application routes.
- Required, may-be-requested, recommended, and not-required documents.
- Per-entry, rolling-window, compound, calendar, and authorization-dependent
  stay rules; prior-presence and missing-date behavior.
- Entry-point restrictions and provisional outcomes.
- No profile never yields “Open now.”

### Money

- Both origins, both adult counts, child applicability, both modes, and every
  required component.
- Lower/upper invariants, outward FX rounding, cash below/inside/above range,
  zero cash, and different currencies.
- Missing/stale source, missing origin, incompatible household, and optional
  reserve separation.
- The same legally required fee/insurance fact is not duplicated with a
  different value.
- Money output cannot mutate availability, evidence, stay, or readiness.

### Interaction and accessibility

- No initial selection/detail; marker and list open identical data.
- Close/Escape restore the exact activator; selecting a new place updates the
  open sheet without moving the camera.
- Camera limits, resize, pointer-centered zoom, controls, keyboard, touch, and
  collision output are deterministic and finite.
- Profile questions come from prepared requirements and every traveller is
  represented.
- Compare/plan work without pointer or geography; all state changes have concise
  announcements.
- EN/RU parity covers navigation, metadata, forms, statuses, reason displays,
  counts, dates, currency, sheets, exports, and technical disclosures.
- 44 px targets, focus visibility, contrast, reflow, reduced motion, and
  screen-reader names remain valid.

### Privacy and failure states

- Direct/refresh visits have no destination history.
- Corrupt, old, quota-failed, or unavailable storage fails harmlessly.
- Explicit clear removes profile and saved options.
- A saved plan is re-evaluated and invalidated after evidence withdrawal.
- No profile/cash/document value appears in URL, rendered server logs, source
  fetches, or exports unless the user explicitly selects it in the preview.
- No external request occurs when the map moves or a detail/evidence disclosure
  opens.

## Verification sequence for each phase

Use the pinned runtime and run focused tests before the full gate:

```bash
source /home/wx/.nvm/nvm.sh
nvm use
npm run runtime:check
npm run check:i18n
npm run validate:content
npm run check:freshness
node --test <focused test files for the phase>
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run check
git diff --check
```

Evidence acquisition requires network access and current official sources; run
it only in the explicit evidence phase and review generated append-only records
before integration. Ordinary UI/domain phases must not regenerate monitoring or
decision logs.

## Suggested reviewable change sequence

Do not combine generated evidence history with broad UI refactors.

1. `chore: restore a green seven-route baseline`
2. `refactor: project plain-language option views`
3. `feat: make the map and list the primary workspace`
4. `feat: complete two pilot evidence routes` (generated records isolated)
5. `feat: evaluate household readiness on device`
6. `feat: add sourced 30-day cost ranges`
7. `feat: compare and build a private option`
8. `test: add usability accessibility and privacy release gates`

Country outlines, additional routes, dogs, Homes/Hubs, and Soft landing belong
in later commits after the evidence-alpha exit gate.

## Project-owner decisions and external dependencies

Implementation can begin without another architecture decision, but these items
must be resolved before their named phase exits:

1. Approve the Emergency accommodation standard before Phase 5 cost research.
2. Confirm that EUR and RUB are the first cash-entry/display currencies, with
   official dated FX observations; otherwise constrain the first alpha to the
   estimate's native display currency and say so explicitly.
3. Recruit 5 private-alpha and later 8–12 closed-beta participants without
   collecting sensitive motivations or identity data.
4. Name evidence/release/incident owners before public beta.
5. Decide whether Markdown plus print-friendly HTML is sufficient for the first
   export. PDF should not block the core option flow.

## Stop conditions

- If a source conflict remains materially unresolved, keep the route a candidate
  and choose another pilot; never soften wording to make it look supported.
- If child applicability, passport validity, stay arithmetic, or mandatory
  documents cannot be established for the supported household, the route is not
  an alpha option.
- If a copy edit changes legal scope, certainty, dates, amounts, applicability,
  or source relationship, stop the editorial change and create a new evidence
  revision.
- If a missing/stale cost would be shown as zero or silently inferred, block the
  money phase.
- If profile questions are not derived from the evaluator's prepared
  requirements, do not ship the form; duplicated legal checklists will drift.
- If a camera implementation makes any place pointer-only or breaks marker/route
  alignment, keep the list primary and fix the shared geometry contract.
- If personal data reaches a URL, request, log, analytics event, or default
  export, treat it as a release-blocking privacy incident.
- If target users confuse unknown with closed, application with approval, cost
  with inventory, or Beacon with safety/friendliness, revise and retest before
  adding destinations or publishing.
