# Roadmap: from destination browser to a safe departure companion

- **Status:** approved direction; execution plan
- **Updated:** 2026-09-03
- **Primary outcome:** help a person understand where they may be able to go,
  prepare a viable journey, arrive with a fallback, and remain lawfully and
  practically safe without mistaking incomplete research for instructions
- **Initial audience:** the currently supported Russian-passport household scope
- **Release strategy:** prove one pilot route across both supported origin
  variants before expanding destination coverage

## 1. Product outcome

Beacons should support this journey:

```text
urgent triage
  -> can every traveller leave?
  -> where may they be able to enter?
  -> how can they physically get there?
  -> what must happen during the first 72 hours?
  -> what is the lawful-stay timeline?
  -> what is the longer-term status or safe-exit path?
  -> what should happen if the primary plan fails?
```

The map remains the best discovery surface. After a person chooses a destination,
the product becomes task-first: it shows the current stage, the next blocking
action, the next deadline, the largest unresolved question, and an offline
emergency path.

The first meaningful release is not seven destinations with shallow guidance.
It is one deeply supported route for one explicit household shape, with separate
Moscow and Saint Petersburg corridor variants as required by the active pilot
scorecard. A second route with a different legal shape proves that the model
generalises.

## 2. Starting truth

This plan is based on the worktree reviewed on 2026-09-03. Recalculate these
figures at the beginning of execution rather than copying them into later release
claims.

- The current catalog release is `m5-family-entry-evidence` with 7 places,
  7 candidate routes, 59 claims, 17 sources, and no cost observations.
- The latest authoritative run reports 21 current claims, 36 uncovered claims,
  2 contradictory claims, and 38 exceptions.
- No route is currently selected as a pilot or safe to present as a complete
  travel plan.
- The map, fact-level confidence, sources, filters, household counts, pinning,
  three-way comparison, per-member document lists, and a three-stage relocation
  sequence exist in the current worktree.
- Structured itineraries, first-72-hour costs, first-month costs, emergency
  contacts, destination health and housing guidance, lawful-stay reminders,
  explicit local saving, offline use, and interaction-level accessibility tests
  are not complete.
- `npm run check` passed content validation, freshness checks, EN/RU parity,
  lint, typecheck, production build, 104 unit tests, and 6 production-browser
  tests during the 2026-09-03 audit.
  The freshness command passed for zero published routes; this is an engineering
  baseline, not evidence of user readiness.
- The worktree contains substantial uncommitted work. Preserve and review it;
  do not reset, regenerate, or silently overwrite unrelated changes.

## 3. Non-negotiable product contracts

### 3.1 Browsable is not actionable

Useful information may remain visible when incomplete, unchecked, stale,
unavailable, or disputed. Visibility never grants action authority.

Every guidance item has an independent action state:

- **Do this:** current evidence appropriate to the item's declared authority
  class supports the instruction for the declared scope. Legal instructions
  always require route-specific primary evidence.
- **Confirm first:** the item is useful, but incomplete, volatile, conditional,
  or not checked for the declared scope.
- **Not established:** the product cannot yet tell the person what to do.
- **Blocked:** current evidence establishes that the proposed action or route
  must not be relied on.

Only **Do this** may appear as a destination-specific requirement or feed a
deadline automatically. Candidate, stale, disputed, or incomplete material may
produce research tasks, but not travel-ready instructions. Generally applicable
preparedness advice may become **Do this** only under a separate versioned
authority class with current sources, declared applicability, contraindications,
and no implication that it is a destination's legal rule.

The derivation is deterministic:

| Evidence and dependencies | Output |
| --- | --- |
| Current supporting evidence, correct declared scope, and every manifest dependency current | **Do this** |
| Current restrictive evidence establishes that the proposed action cannot be relied on | **Blocked** |
| A useful fact exists, but evidence or any manifest dependency is incomplete, stale, unavailable, disputed, volatile beyond its window, or scoped differently | **Confirm first** |
| No applicable fact has been collected | **Not established** |
| The record or route is withdrawn | Do not render it as guidance; retain audit history |

General preparedness items use their own manifest dependencies rather than a
destination's legal packet. Free-form summaries, layout position, checkboxes, and
completion state never participate in this derivation.

### 3.2 Route readiness is explicit

Each corridor has one derived action-readiness state:

- **Research only:** critical gaps or contradictions prevent a usable plan.
- **Plan with verification:** enough is known to prepare, but named blocking
  questions must be resolved before travel.
- **Actionable for the declared scope:** every critical gate is current and the
  operational route has been checked for the stated dates and travellers.
- **Withdrawn:** known false, misleading, unsafe, or invalid information is
  suppressed while its audit history remains available.

Legal-route readiness is a separate input to corridor readiness. Completing the
legal packet can establish `Legal packet current`; it cannot establish an
actionable corridor until departure, first-72-hour, stay/exit, safety, money,
household, and offline-critical requirements also pass.

One current claim must never make a mostly uncovered route look current. Route
summaries show coverage and blockers, for example: `7 of 12 critical facts
checked · 2 blockers · child documents unresolved`.

### 3.3 No guarantee language

Beacons does not guarantee admission, safety, transport, price, housing, work,
schooling, healthcare, or long-term residence. It records what was checked,
when, for whom, against which source, and what remains uncertain.

### 3.4 Independent state axes stay independent

Do not collapse these into one score:

- evidence condition;
- route availability;
- action readiness;
- household readiness;
- departure feasibility;
- stay-timeline calculability;
- cost completeness and money gap;
- pet feasibility;
- operational safety coverage.

Money, popularity, geography, or pet logistics never change human legal-route
eligibility. Unknown is never treated as zero, safe, closed, or ineligible.

### 3.5 Privacy and user control

- Browse without a profile or account.
- Keep household, document, cash, medical, travel-history, date, plan, and note
  data in memory unless the person explicitly saves or exports it.
- Store statuses and dates, not passport numbers, scans, names, or exact birth
  dates.
- Provide inspect, clear, and reset actions for all saved local data.
- Never put private inputs in URLs, requests, logs, analytics, external search
  links, or default exports.
- Opening the map or details must not contact a third party.
- Treat a shared or coercively monitored device as part of the threat model.
  Explain that local storage may still be visible to another device user; offer
  an immediate clear-plan action and a neutral quick-exit destination; keep
  sensitive details out of titles, URLs, browser notifications, and recent-item
  labels. Do not claim the application can erase browser or operating-system
  history that it does not control.

### 3.6 Evidence semantics remain fail-closed for action

- Historical evidence validates only against its own catalog release.
- Exact current-release facts and applicability are required for current action
  support.
- Source count, model confidence, a confirmation click, or favourable wording
  cannot resolve a contradiction.
- Restrictive or unresolved changes demote automatically.
- Relaxing conclusions require a new claim revision and complete current proof.
- Semantic changes, moved applicability, or superseding rules produce a blocking
  diagnostic rather than an automatic travel instruction.

## 4. Definition of a complete pilot route and corridor variants

A corridor is a versioned tuple:

```text
origin + departure window + travellers + destination + entry point + route
```

The corridor-alpha household envelope is one or two adults and exactly two
children aged 6–17, all travelling on ordinary Russian passports. The two child
ages are evaluated independently. Other household counts may remain visible as
discovery inputs, but they are outside alpha action-readiness until a separately
versioned profile contract expands the scope.

A pilot route contains two separately evidenced corridor variants, one from
Moscow and one from Saint Petersburg. Observations never transfer between
origins. The active pilot scorecard continues to require reproducible 30-day
costs from both origins before pilot selection unless the owner explicitly
approves a versioned change to that policy.

Before implementation can calculate a coverage denominator, create a versioned
`CorridorRequirementManifest`. It enumerates every required and optional item in
the legal, departure, first-72-hour, stay/exit, safety, money, household, and
offline packets. Missing, duplicate, unknown, or inapplicable-without-reason
requirements fail closed. A content record cannot remove itself from readiness
by disappearing from the catalog.

The first route may be designated as a research target after evidence comparison;
that designation has no UI or action authority. Serbia and India remain
provisional research targets, not predetermined pilot selections.

A corridor is complete only when all of the following are present.

### Legal and document packet

- origin-country departure requirements for every traveller;
- nationality and ordinary-passport applicability;
- passport presence and validity basis;
- minor consent, custody, relationship, and individual-document requirements;
- public application procedure and per-traveller authorisation when applicable;
- transit-country and permitted-entry-point constraints;
- accommodation, insurance, funds, onward travel, fees, and other border gates;
- exact initial stay rule, rolling-window arithmetic, entry/exit counting rules,
  registration deadlines, and relevant exceptions;
- current official sources, bounded evidence, observation dates, effective dates,
  expiry dates, and explicit unknowns.

### Physical departure packet

- one dated primary itinerary and one fallback where reasonably available;
- departure and arrival points, modes, transfers, and duration;
- transit and carrier constraints;
- baggage assumptions and accessibility constraints where relevant;
- observed fare range, currency, booking source, cancellation assumptions, and
  observation time;
- an explicit distinction between `not collected`, `not found`, and `known not
  operating`.

### First-72-hour packet

- cancellable first accommodation and whether the host can perform required
  registration;
- safe transfer from the arrival point and a fallback transfer;
- working communication path and payment fallback;
- food, medication, urgent healthcare, and essential child/pet needs;
- check-in plan with a trusted contact;
- action to take if entry, transport, payment, or accommodation fails.

### Stay and exit packet

- calculable registration, application, renewal, and last-lawful-day deadlines;
- activities not authorised by the visitor route;
- official longer-term status pathways, shown as separate conditional routes;
- safe-exit or onward route before lawful stay expires;
- reminder lead times and a visible calculation safety margin.

### Operational safety packet

- police, ambulance, fire, and relevant general emergency numbers;
- applicable consular assistance and lost-document procedure;
- urgent medical and insurance-assistance contacts;
- border refusal, stranded-transit, lost phone/money, housing failure, domestic
  violence, and child-safeguarding paths where official help exists;
- local laws or operational hazards materially relevant to the declared trip;
- source, scope, last check, validity window, click-to-call/copy support, and
  offline availability for every contact.

### Money packet

- travel, entry/application, accommodation, deposit, food, local transport,
  communications, insurance, registration, and other mandatory cost components;
- first-72-hour and first-30-day low/high ranges;
- household assumptions, native currency, exchange-rate date, exclusions, and
  missing components;
- payment-method accessibility and a separately displayed emergency/return
  reserve;
- no affordability label when the total is partial.

## 5. Execution roadmap

Phases are ordered by safety dependency. Research and schema work may run in
parallel only when their file ownership and contracts do not overlap. Shared
domain seams are integrated sequentially.

```text
Phase 0 -> Phase 1 (research target and manifest)
Phase 1 -> Phase 2 (journey domain) -> Phase 3 (legal packet)
Phase 2 + Phase 3 -> Phases 4-7
Phases 4-7 -> Phase 8 -> Phase 9 -> Phase 10 -> Phase 11
```

Accessibility, privacy, security, evidence invalidation, and EN/RU parity are
acceptance criteria in every phase. The dedicated Phase 9 validates the
integrated result; it is not permission to postpone those qualities until the
end.

### Phase 0 — stop misleading action and restore semantic integrity

**Status:** complete. The 2026-09-03 safety slice added persistent
research-only framing, independent fail-closed action state, an equal
non-spatial destination list, origin-correct map geometry, cross-jurisdiction
source validation, numeric EN/RU semantic binding, explicit quarantine for the
unresolved Türkiye and Kazakhstan stay-rule representations, and a production-
artifact Playwright/axe browser harness covering EN/RU, keyboard focus, mobile
dialog semantics, 200% zoom, touch targets, and load-time privacy. README, RFC,
implementation plan, content guide, and evidence handbook now share the
browsable/actionable boundary. The expanded full gate passes 104 unit tests and
6 production-browser tests.

**Purpose:** make the current research browser safe to inspect while deeper work
continues.

**Work:**

1. Render a persistent candidate/readiness banner above every destination summary
   and plan.
2. Add the independent guidance action state and prevent incomplete claims from
   producing `Do this`, `Required`, or calculated-deadline output.
3. Replace destination confidence aggregation based on any current claim with
   route coverage, worst blocker, and fact-level labels.
4. Correct the Türkiye family-applicability jurisdiction mismatch and add
   subject, route, place, country, source-jurisdiction, and EN/RU semantic-binding
   validation.
5. Resolve or explicitly quarantine the Türkiye and Kazakhstan stay-rule versus
   rolling-window inconsistencies before they feed any plan.
6. Change child-count language from apparent support to `count not ruled out` or
   `not evaluated` until all child-critical requirements are complete.
7. Ensure the selected origin changes the map origin coordinates and label.
8. Restore an equal non-map destination list so discovery never depends on
   pointer use, marker collision, or geographic inference.
9. Establish the browser interaction and automated accessibility harness now;
   add focused keyboard, focus, dialog/dock semantics, 200% zoom, touch-target,
   privacy, and EN/RU tests with every subsequent UI slice.
10. Reconcile README, RFC, implementation plan, content handbook, tests, and this
   roadmap around the browsable/actionable distinction.
11. Preserve the generic relocation text only as clearly labelled planning advice;
   it must not inherit legal authority from being next to sourced requirements.

**Likely implementation areas:**

- `lib/domain/catalog-view.ts`
- `lib/domain/household-eligibility.ts`
- `lib/domain/travel-document-checklist.ts`
- `lib/domain/relocation-plan.ts`
- `components/beacons/beacon-detail.tsx`
- `components/beacons/option-compare-sheet.tsx`
- `components/beacons/beacon-map.tsx`
- restored accessible destination-list component
- `content/catalog.json`
- content validation and rendered/domain tests
- browser/a11y configuration and a first-class package test command
- `README.md`, `specs/beacons_rfc.md`, `specs/implementation_plan.md`, and
  `specs/evidence_handbook.md`

**Exit gate:**

- every current route is visibly research-only;
- no incomplete route emits a destination-specific `Do this` requirement or a
  calculated stay deadline;
- no current proof can validate prose for the wrong jurisdiction or subject;
- all internal stay-rule contradictions are either resolved with current evidence
  or visibly quarantined;
- every destination is reachable through an equal non-spatial list;
- focused browser and accessibility tests cover the changed interaction contracts;
- the full repository gate passes.

### Phase 1 — designate a research target and build its gap manifest

**Status:** complete. The `m5-family-entry-evidence` scorecard is refreshed
against the current authoritative run and designates Serbia as a research target
only. `corridor.serbia-belgrade.alpha.v1` now pins the release, authoritative
run, complete route-claim revision set, alpha household, and separate Moscow and
Saint Petersburg variants. Its code-defined 60-slot denominator spans legal,
departure, first-72-hour, stay/exit, safety, money, household, and offline
packets: 2 slots are current, 9 incomplete, 1 contradictory, and 48 missing.
Every unresolved slot records its gap and workstreams. Validation rejects slot
deletion, duplication, unknown IDs, origin leakage, unjustified omission, stale
route revisions, and false current/contradictory states. The owner-readable
decision records exact source lineages and withdrawal/invalidation blast radius;
none of these artifacts grants pilot, publication, promotion, or action
authority.

**Purpose:** choose where to concentrate research without granting pilot or UI
authority prematurely.

**Work:**

1. Refresh the pilot scorecard from the current catalog release.
2. Compare candidates on missing critical claims, contradictions, source quality,
   monitorability, child scope, transit complexity, transport observability, and
   emergency-information availability.
3. Designate one route as the research target. Record explicitly that this is not
   pilot selection, publication, promotion, or action authority.
4. Create its `CorridorRequirementManifest`, including both Moscow and Saint
   Petersburg variants and the exact alpha household envelope.
5. Inventory each required slot as current, incomplete, contradictory, missing,
   or not applicable with a structured reason.
6. Record the source, schema, extractor, evaluator, transport, cost, safety, and
   operational work needed to fill every gap.
7. Record the exact route revision, source lineages, known contradictions, and
   withdrawal blast radius in an owner-readable research-target decision.

**Exit gate:**

- every readiness denominator comes from the versioned manifest rather than the
  claims that happen to exist;
- missing, duplicate, unrecognised, or unjustifiably omitted slots fail closed;
- the research-target record explains why effort is concentrated there and
  states that the route remains research-only;
- the active pilot scorecard and both-origin cost gate remain unchanged.

### Phase 2 — establish the journey guidance domain

**Status:** complete. The 2026-09-03 domain slice adds an authored-versus-
evaluated guidance boundary, 11 versioned record-specific authority policies,
typed operational absence and observation records, stable jurisdiction/source-
role bindings, detailed version-2 stay-timeline inputs, structured consequential
caveats, and revision-pinned saved guidance invalidation. The Serbia research
target now has separate Moscow and Saint Petersburg `not_collected` journey
records plus four proof-linked or explicitly missing guidance definitions; all
remain `Confirm first` or `Not established`, and every policy remains capped by
`mayEmitDoThis: false`. Cross-file validation rejects wrong claim kinds, policy
or proof drift, origin leakage, cross-jurisdiction bindings, dependency cycles,
and EN/RU numeric divergence without changing the Phase 1 manifest totals. The
full repository gate passes 109 unit tests and 6 built-site browser and
accessibility tests.

**Purpose:** represent operational guidance as traceable data rather than generic
component prose.

**Work:**

1. Introduce a structured `GuidanceItem` with category, criticality, journey
   stage, urgency, traveller applicability, action state, authority class,
   requirement-manifest slot, timing, dependencies, evidence links, observation
   time, expiry, fallback, and safe copy in both languages.
2. Add structured records for departure observations, first-72-hour arrangements,
   operational contacts, health guidance, housing guidance, communication paths,
   cost observations, stay-timeline inputs, and plan snapshots.
3. Add explicit source roles and jurisdiction fields such as rule jurisdiction,
   traveller nationality, origin jurisdiction, destination jurisdiction, transit
   jurisdiction, and source role. Origin-country consular guidance, destination
   law, bilateral rules, carrier rules, and observations must not be conflated.
4. Define a versioned authority policy for each category before it can emit an
   action: permitted source types, lineage/independence, corroboration, conflict
   handling, freshness window, recheck trigger, restrictive-change behavior,
   relaxation behavior, and required proof packet.
5. Define which fields require official primary evidence and which may use dated
   operational observations. Keep legal truth, general preparedness, and
   lived/operational context separate.
6. Extend stay rules to represent entry/exit inclusivity, window anchors,
   working-day calculations, exceptions, legal timezone, and registration
   responsibility where applicable.
7. Validate every number, date, phone number, address, jurisdiction, traveller
   scope, and translation against its subject and source.
8. Require caveats that affect eligibility, timing, money, or safety to exist as
   structured data before appearing in prose.
9. Add invalidation rules so a saved task, deadline, or contact becomes `Recheck`
   when its evidence revision expires or changes.

**Exit gate:**

- both target corridor variants can be expressed without hard-coded destination
  instructions in React components;
- every action shows why it has its action state;
- every manifest slot has an enforceable criticality and authority policy;
- legal, itinerary, housing, health, cost, emergency, and general-preparedness
  records cannot emit actions without their category-specific proof requirements;
- EN and RU render from the same structured value and retain identical numbers,
  dates, obligations, applicability, and uncertainty;
- schema tampering and cross-jurisdiction binding fail validation.

### Phase 3 — complete the target's legal and document packet

**Status:** closed for the research-browser scope on 2026-09-04; an action-ready
legal packet remains deliberately unclaimed and is deferred until a real journey
needs evaluation. The 2026-09-03 safety and evidence slices add a dedicated
fail-closed legal-packet evaluator, structured per-child departure context,
exact inclusive legal-time and 24-hour registration calculations, and incident
fixtures for withdrawal, missing slots, shared-source loss, changed claim
revisions, jurisdiction mismatch, unknown transit, passport boundaries,
custody uncertainty, and active departure objections. Missing entry-point proof
no longer becomes eligible by absence. Manifest validation now rejects several
partial legal slots that were previously label-able as current.

**Closure handoff:** [Stage 3 closure handoff — 2026-09-04](specs/stage-3-handoff-2026-09-04.md)

The versioned `m8-russia-two-lineage-evidence` snapshot now has atomic,
executable proof for Serbian passport presence and validity, inclusive stay
counting, funds, accommodation, exact return-ticket wording, host and
self-arranged registration, and an explicit controlling-law resolution for
insurance that continues monitoring the lower-precedence MFA discrepancy. Six
Russian-jurisdiction departure claims are now pinned to both the consolidated
Federal Law 114-FZ and independent General Prosecutor guidance. The child
document fact was corrected so the five-destination 20 January transition is
not misapplied to Serbia. Before the dated-transport continuation, the manifest
had 4 current, 10 incomplete, 0 contradictory, and 46 missing slots.

The 2026-09-04 continuation makes the remaining household case boundary more
precise without changing route authority. Minor inputs now distinguish legal-
representative role and guardian/custodian authority evidence, and an unchecked
departure objection can no longer be treated as confirmed clear. Registration
calculation now requires paid accommodation, private host, or self-arranged
address and validates the responsible party against that choice. Primary-source
review did not establish a per-child or household-pooled interpretation of the
EUR 50-per-day funds benchmark, or a general border-carry rule for relationship
and representative-authority documents, so those questions remain unresolved.

The owner-supplied departure window is now represented inclusively as 11
September 2026 through 4 January 2027. Separate Moscow and Saint Petersburg
records contain a dated direct Air Serbia schedule and a Turkish Airlines
fallback candidate through Istanbul, including segment instants, elapsed time,
carrier, transfer jurisdiction, and BEG as the observed Serbian entry point.
Future schedules are `scheduled`, not `observed_operating`; every observation
expires after 24 hours, and the fallback remains blocked pending confirmation
of a single ticket, exact segments, airside transfer, and through-checked
baggage. Fare, cancellation, baggage allowance, and accessibility slots remain
missing. The manifest is now 4 current, 18 incomplete, 0 contradictory, and 38
missing slots. Legal transit and entry-point constraints also remain missing
because an operational itinerary is not a route-specific legal claim. The
Serbia route therefore remains a research target and the evaluator still
returns `blocked` or `incomplete`, never `Legal packet current`.

The subsequent `m10-transit-case-evidence` slice adds a narrow, current Turkish
airport-transit fact from two independent official lineages: no transit visa is
required only while remaining in the airport transit area, and competent
authorities may still check documents. Origin-specific legal transit slots are
therefore incomplete rather than absent; they still cannot pass until the
booking confirms airside continuity and a route-specific Serbian source
establishes BEG's legal entry-point scope. The case evaluator now distinguishes
airside, landside, and self-transfer conditions and checks funds and
registration coverage per traveller without inventing household pooling or
family batching. A transient failure of one host-registration guidance source
demoted provenance during one run and a later successful refresh restored it;
the manifest is now 4 current, 20 incomplete, 0 contradictory, and 36 missing
slots.

The `m11-beg-entry-point-evidence` continuation closes the remaining static
entry-point evidence gap without broadening route authority. The active 3
September 2026 Serbia/Montenegro AIP says Serbian entry occurs at border
stations, states the Government-designation condition for international
airports, and identifies `BEOGRAD/Nikola Tesla` (`LYBE`/`BEG`) as international
with scheduled use. One contract pins the three passages as a single official
publication lineage. Both origin-specific legal transit and entry-point slots
are now current, but booking-level airside continuity remains a separate case
check and all legal guidance policies still have `mayEmitDoThis: false`. The
manifest is now 6 current, 18 incomplete, 0 contradictory, and 36 missing.

The Stage 3 closure pass separates reusable research gaps from facts that can
exist only for a particular household or booking. All five incomplete legal
slots now declare their remaining kind: the two origin-departure slots need only
future runtime inputs; minor documents, border-supporting requirements, and stay
registration contain both an evidence gap and future runtime inputs. There are
no missing, contradictory, or unclassified legal slots. This is sufficient to
close the research implementation stage, but not to call the route or any
household action-ready. Personal declarations must not be collected merely to
make the roadmap appear complete.

**Purpose:** fill the legal manifest using the domain and authority policies from
Phase 2.

**Work:**

1. Account for every legal and document requirement in Section 4 with current
   proof or an explicitly classified evidence gap/runtime input; never infer an
   absent claim.
2. Add current contracts and proof packets for each action-critical claim.
3. Render gate-critical public copy from structured facts; keep free summaries
   explanatory and non-authoritative.
4. Add fixtures for adults, each supported child age boundary, missing passport,
   passport expiry boundary, consent/custody uncertainty, prior stays, transit,
   entry point, registration, exceptions, and legal-time calculations.
5. Exercise withdrawal, shared-source, changed-law, missing-manifest-slot, and
   cross-jurisdiction incident drills against the target.

**Research-stage closure gate:**

- no legal slot is missing, contradictory, or left without a structured
  evidence-gap/runtime-input classification;
- current claims remain no broader than their proof, while unresolved semantics
  remain `Confirm first` rather than being filled from assumptions;
- future household and booking facts remain runtime inputs and are not requested
  until a real journey needs evaluation;
- the full content, evidence, domain, incident, and repository gates pass.

**Future action-ready gate, not met:** every required legal slot applicable to
the actual household and booking is current, with household applicability
established per traveller rather than inferred from a generic nationality
sentence. Even then, the corridor remains no more than `Plan with verification`
until all operational packets pass. Do not begin Phase 4 solely because the
research-stage closure gate passes; wait for an explicit product need.

### Phase 4 — build urgency and task-first navigation

**Purpose:** answer `What should I do now?` without making the user read the whole
research dossier.

**Work:**

1. Add urgency choices: immediate danger/hours, several days, within 30 days, and
   building an option.
2. Replace the three-stage sequence with five directly reachable working modes:
   `Prepare`, `Travel day / border`, `First 72 hours`, `Stay`, and `Emergency`.
3. Ask `Where are you now?` before presenting actions.
4. Show one next blocking action, up to three immediate tasks, the next deadline,
   the largest unresolved question, and a clear fallback.
5. Keep the full plan behind progressive disclosure.
6. When no destination is selected, retain map-first discovery and an accessible
   non-map destination list. When a plan is saved, make its current stage the
   default home surface without hiding the map.
7. Do not request property, employment, medical, or school planning during an
   hours-level emergency unless it is immediately relevant.

**Exit gate:**

- a first-time user can identify the next relevant action in under one minute;
- travel-day and emergency information is reachable in at most two deliberate
  actions from the selected in-memory plan; saved-plan reachability is gated in
  Phase 8;
- no task receives authority from its position, styling, or checkbox;
- the map remains usable without creating a profile.

### Phase 5 — add real departure and first-72-hour feasibility

**Purpose:** turn a legal possibility into an executable physical route with a
fallback.

**Work:**

1. Collect and validate each origin variant's primary and fallback itineraries.
2. Cover origin exit, every transit point, carrier rules, permitted arrival
   point, baggage assumptions, and date-specific availability.
3. Collect the first-night accommodation and registration-capable-host evidence.
4. Add airport/station transfer, communication, payment, food, medicine, trusted
   contact, and failure-path guidance.
5. Label fares and availability as dated observations, never guarantees.
6. Recheck volatile observations shortly before planned departure and visibly
   invalidate them when their freshness window closes.

**Exit gate:**

- each origin variant has one understandable primary route and one viable
  fallback; if no safe fallback is available, the manifest records that absence
  and the corridor remains at most `Plan with verification` rather than satisfying
  corridor-alpha readiness;
- a user can produce a per-traveller border pack and first-72-hour checklist;
- failed transport, entry, payment, and housing branches each have a next action;
- no external service receives private profile data.

### Phase 6 — implement household readiness and the lawful-stay clock

**Purpose:** answer whether the collected route fits the actual travellers and
what deadlines govern the stay.

**Work:**

1. Collect only necessary device-local inputs: adult count, child ages, passport
   availability and expiry, relevant visas/statuses, intended dates, origin,
   entry point, and prior stays.
2. Never invent dates or treat `passport present` as sufficient validity.
3. Evaluate every traveller independently and preserve unanswered requirements
   as unknown.
4. Calculate registration, application, renewal, and last-lawful-day deadlines
   only when the structured rule supports the exact calculation.
5. Show the input dates, counting rule, prior-stay assumptions, safety margin,
   source revision, and reasons when calculation is unavailable.
6. Separate visitor permission from work, study, schooling, residence, extension,
   and renewal routes.
7. Provide reminder lead times without silently scheduling external notifications.

**Exit gate:**

- `Actionable for the declared scope` requires a current result for every
  traveller and every critical requirement;
- one missing or expired document prevents a ready result without hiding the
  underlying destination;
- deadline boundary, leap/calendar, rolling-window, prior-stay, timezone, and
  registration tests pass;
- a rule change invalidates the affected readiness result and saved deadline.

### Phase 7 — add money and resilience

**Purpose:** show whether the journey is financially plausible without turning
money into legal eligibility.

**Work:**

1. Collect first-72-hour and first-30-day observations for both origin variants.
2. Model travel, fees, accommodation/deposit, food, transport, communication,
   insurance, registration, healthcare setup, child/pet needs, and other required
   components independently.
3. Show low/high ranges, native currency, exchange-rate date, observation date,
   household assumptions, exclusions, and missing components.
4. Record payment accessibility separately from nominal price, including a tested
   primary method, backup method, and cash constraints where lawfully relevant.
5. Keep emergency/return reserve separate from the base estimate.
6. Allow device-local cash input and show a range gap without calling the route
   affordable or unaffordable when the cost packet is incomplete.

**Exit gate:**

- every displayed total identifies all missing components;
- both Moscow and Saint Petersburg variants have complete, current, reproducible
  30-day cost packets before this phase is marked complete;
- missing or stale observations never become zero;
- changing origin or household changes cost context without changing legal route
  availability;
- the plan contains a payment-failure fallback and separate return reserve.

### Phase 8 — save, export, and work offline

**Purpose:** keep the plan usable during connectivity, power, device, or service
failure.

**Work:**

1. Add an explicit `Save on this device` action; do not persist automatically.
2. Save the selected corridor, stage, task statuses, user-entered dates, local
   notes, evidence release, and plan revision. Exclude passport numbers, scans,
   names, and exact birth dates.
3. Provide inspect, update, clear, and reset controls.
4. Add a printable and downloadable travel packet plus plain text/Markdown. It
   must include generation time, catalog release, traveller assumptions,
   uncertainty, blockers, source/check dates, expiry, deadlines, fallbacks, and
   emergency contacts. Private inputs are excluded by default.
5. Cache the selected plan, essential application shell, map assets, and permitted
   evidence excerpts for offline use.
6. Display offline state and `saved/checked as of` prominently. Cached evidence
   must never present itself as currently checked.
7. Apply an explicit offline transition rule per item. `Checked as of <time>` is
   a presentation qualifier, not a fifth action state. A cached **Do this** item
   retains that action state only while it remains inside its evidence and
   operational validity window, and is displayed as **Do this · checked as of
   <time>**, never as current. It becomes **Confirm first** after expiry. Items marked
   `online recheck required`, including configured high-volatility travel-day
   gates, demote as soon as a current check cannot be performed. Saved legal
   calculations may remain visible with their snapshot inputs but never retain a
   current label offline.
8. Add a shared-device warning, neutral quick-exit action, clear-plan shortcut,
   and a rule forbidding sensitive browser notifications or recent-item labels.
9. Add a device-loss backup procedure that does not require uploading private
   information to Beacons.

**Exit gate:**

- a saved pilot plan remains readable after refresh, restart, language switch,
  and loss of network;
- task completion and deadlines survive only after explicit save;
- stale cached facts visibly require recheck;
- offline action-state transitions are deterministic and tested at the exact
  expiry boundary;
- quick exit clears in-app sensitive state while honestly stating which browser
  or operating-system traces the application cannot remove;
- export and clear-data tests cover storage denial, quota failure, malformed old
  versions, and migration.

### Phase 9 — accessibility, comprehension, and operational readiness

**Purpose:** prove that the tool works for stressed people, not only in static
markup and unit tests.

**Automated work:**

- browser interaction tests for keyboard order, focus recovery, modal/dock
  semantics, touch, zoom, reflow, persistence, offline use, and interrupted flows;
- automated accessibility checks plus manual screen-reader passes;
- 44px minimum primary targets, readable status text, high-contrast/outdoor mode,
  reduced motion, safe-area handling, and 200% text zoom;
- security headers, dependency audit, no-private-data request/log assertions, and
  external-link/referrer tests;
- performance and low-bandwidth budgets for map, plan, and offline packet;
- production health, evidence-refresh failure, and stale-content alarms.

**Usability work:**

1. Recruit at least five Russian-first participants for fictional urgent and
   planned-departure scenarios.
2. Test on ordinary phones and at least one constrained/poor connection.
3. Ask each participant to identify a plausible route, explain the blockers,
   prepare every traveller, find the next three actions, state the next legal
   deadline, and recover from one simulated failure.
4. Treat these misunderstandings as release blockers:
   - browsable is interpreted as safe to act on;
   - one checked fact is interpreted as a checked route;
   - missing child information is interpreted as child eligibility;
   - application availability is interpreted as approval;
   - a fare observation is interpreted as guaranteed transport;
   - a partial cost is interpreted as complete;
   - a cached plan is interpreted as current;
   - a nominal stay is interpreted as permission to work, study, or reside.
5. Exercise false-open, source-unavailable, changed-law, bad-deployment,
   lost-device, offline, and emergency-contact incidents with named owners.
6. Re-run the current pilot scorecard and complete-manifest evaluator after all
   integrated gates pass. Record the evidence release, both origin variants,
   household envelope, maturity window, remaining non-blocking uncertainty,
   owner decision, and rollback target in an independent first-route activation
   record. A blocked result leaves the route research-only.

**Exit gate:**

- at least four of five participants complete the corridor scenario without
  coaching and correctly explain uncertainty;
- all release-blocking misunderstandings are absent or remediated and retested;
- correction, withdrawal, rollback, and stale/offline behavior are rehearsed;
- the pilot has named content, engineering, incident, and correction owners.
- the first route has a recorded fail-closed pilot-alpha activation decision; no
  decision or owner approval means no activation.

### Phase 10 — prove a second route

**Purpose:** establish that the model is reusable before increasing destination
count.

**Work:**

1. Designate and complete a second route with a meaningfully different route
   shape, preferably
   application-based if the first is visa-free, or vice versa.
2. Reuse the schemas, evaluators, UI, evidence workflow, offline pack, and tests
   without adding destination-specific component branches.
3. Record where the domain model fails and fix the shared model before expansion.
4. Require four successful weekly assurance checkpoints spanning at least 21
   days for every public-beta route. More frequent monitoring is encouraged but
   does not compress this maturity period.

**Exit gate:**

- two different routes, each with both supported origin variants, satisfy the
  same complete-corridor contract;
- route-specific code is confined to versioned content and explicit evaluators;
- monitoring, correction, and emergency contacts have functioning ownership;
- the team can add a new corridor through a documented, repeatable process.

### Phase 11 — expand routes three through five

**Purpose:** reach public-beta breadth without lowering the vertical completion
standard proven by the first two routes.

**Work:**

1. Designate each research target separately through the current scorecard and
   complete the same requirement manifest, both-origin variants, legal packet,
   departure/fallback packet, first-72-hour packet, household/stay evaluation,
   money packet, safety contacts, offline pack, and invalidation behavior.
2. Run route-specific comprehension scenarios and the shared regression suite for
   every addition.
3. Exercise source withdrawal, operational failure, and emergency-contact change
   for each new jurisdiction before activation.
4. Require four successful weekly assurance checkpoints spanning at least 21
   days per route; frequent three-day monitoring runs do not count as compressed
   weekly maturity cycles.
5. Activate routes independently. A failure in one route must not block updates
   or corrections for the others, and a shared-source failure must identify its
   complete blast radius.

**Exit gate:**

- five routes independently satisfy the complete pilot-route contract;
- every route passes its own vertical, comprehension, incident, ownership, and
  monitoring-maturity gates;
- public-beta readiness is decided from recorded gates, not destination count
  alone.

## 6. How to execute and track this plan

Use one phase status at a time: `not started`, `in progress`, `blocked`, or
`complete`. A phase becomes complete only when every exit-gate statement has
current evidence.

| Package | Depends on | Primary artifact or owned area | Owner roles | Minimum verification | Approval checkpoint |
| --- | --- | --- | --- | --- | --- |
| W0 safety baseline | — | action derivation, current UI safeguards, semantic fixes, accessible list, browser/a11y harness | product engineering + content | focused domain/render/browser/a11y tests; `npm run check` | owner accepts final action-state labels and derivation before user-visible authority changes |
| W1 research target | W0 | refreshed scorecard, requirement manifest, research-target decision | evidence research + product | manifest validation; catalog/run audit; `npm run validate:content` | designation grants no activation authority |
| W2 journey domain | W1 | schemas, source roles, authority policies, invalidation rules | domain engineering + evidence policy | schema fixtures; tamper/cross-jurisdiction tests; typecheck; `npm run check` | owner accepts each new category's authority/freshness policy |
| W3 legal packet | W2 | claims, contracts, proofs, legal evaluator and incident fixtures | evidence research + domain engineering | monitor/evaluate/validate; focused legal tests; incident drills; `npm run check` | relaxing or broadened conclusions require a reviewed new revision |
| W4 task UX | W2 + W3 | urgency and stage UI, operational summary, accessible navigation | product design + frontend engineering | keyboard/focus/touch/EN-RU/browser tests; `npm run check` | copy and interaction review before calling any item actionable |
| W5 departure/72h | W2 + W3 | both-origin itineraries, fallback, first-72-hour guidance | operational research + frontend/domain engineering | observation validation; failure branches; browser tests; `npm run check` | no booking, payment, or external submission authority |
| W6 household/stay | W2 + W3 | profile evaluator, per-traveller readiness, deadline engine | domain engineering + evidence research | boundary/property fixtures; invalidation tests; `npm run check` | no widening beyond the alpha household without a versioned owner decision |
| W7 money | W2 + W3 + W5 | both-origin costs, money evaluator, resilience view | cost research + domain/frontend engineering | range/currency/missing-data tests; `npm run check` | money never changes legal readiness; non-travel cost research may start while W5 runs, but W7 cannot complete first |
| W8 local/offline | W4-W7 | versioned storage, export, offline pack, quick exit | frontend engineering + privacy/security review | offline/storage/migration/clear/export/privacy tests; `npm run check` | no server storage or notifications without separate approval |
| W9 assurance | W0-W8 | integrated E2E, usability evidence, runbooks, named ownership, first-route activation record | product + accessibility + operations | full automated gate; user scenarios; scorecard/manifest reevaluation; incident rehearsals | pilot activation, recruitment, deployment, and production operation each require owner approval |
| W10 second route | W9 | second complete route and both origin variants | all relevant roles | same complete manifest and maturity gates as route one | independent activation decision |
| W11 routes 3-5 | W10 | three independently complete routes | all relevant roles | per-route vertical, incident, comprehension, and 21-day maturity gates | independent activation and public-beta decision |

Every work package must define rollback or invalidation before activation. Content
rollback preserves superseded history; evidence failure demotes the affected
fact/route; schema migrations preserve or safely reject older local state; UI
rollback must not re-expose an instruction whose authority was withdrawn.

For each implementation slice:

1. Name the phase, user outcome, exact files/contracts in scope, and excluded
   work before editing.
2. Record the baseline catalog release, authoritative run, `git status`, and
   relevant tests. Preserve unrelated worktree changes.
3. Make one reviewable vertical change. Do not combine source research,
   authority-policy changes, shared schema changes, and broad UI redesign in one
   opaque patch.
4. Add or update tests for the user-visible contract and the unsafe failure mode,
   not only the successful rendering.
5. Run focused checks while iterating and the complete repository gate before
   claiming the slice complete.
6. Update this file's starting truth or phase notes only when the recorded state
   materially changes. Keep detailed evidence and incident records in `specs/`.
7. Report `done`, `remaining`, `tests`, `known risks`, and `owner action needed`.

If a phase is blocked by missing official evidence, continue with bounded schema,
test, research-diagnostic, accessibility, or failure-state work that does not
invent the missing fact. Do not lower an exit gate to make the status green.

## 7. Immediate execution queue

Complete these in order before beginning broad new feature work:

- [x] Snapshot `git status`, current catalog/run summaries, and the full test gate.
- [x] Preserve research-only/candidate safety semantics; the redundant top
  banner was later removed while the map-bottom legal disclaimer and fail-closed
  detail states remain.
- [x] Introduce action state and remove implied `Required` authority from incomplete
  route checklists.
- [x] Fix the Türkiye/Kazakhstan semantic mismatch and add cross-subject validation.
- [x] Quarantine unresolved stay rules from deadline generation.
- [x] Replace aggregate `Current and checked` presentation with coverage/blockers.
- [x] Correct child-count wording/evaluation and remove any fabricated profile dates.
- [x] Fix the Moscow/Saint Petersburg origin marker flow.
- [x] Update the scorecard and designate only a research target. Do not select or
   activate a pilot until the existing complete-claim and both-origin cost gate,
   plus the integrated corridor gates in this plan, actually pass.
- [x] Create the Serbia corridor requirement manifest, keep every missing slot in
  its versioned denominator, and record the exact research-target lineage and
  invalidation blast radius without granting action authority.
- [x] Close Stage 3 for research-browser scope by classifying every legal
  residual as an evidence gap, future runtime input, or both; preserve
  `actionReady: false` and request no personal trip data.
- [ ] When an explicit product need exists, define the remaining
  departure/contact/stay/cost schemas and complete one corridor vertically.

## 8. Release levels

### Research browser

- All candidates may be inspected with visible uncertainty.
- No candidate looks like a complete plan.
- No destination-specific action-ready claim is made. Separately labelled general
  preparedness may use its own current authority class.

### Pilot-route alpha

- One complete route works locally for the declared household scope from both
  Moscow and Saint Petersburg as separate corridor variants.
- The action plan, border pack, first 72 hours, stay clock, money range, emergency
  card, local save, and offline export pass their gates.
- Use is supervised and scenario-based; no public deployment claim.

### Closed beta

- Two different legal route shapes pass the complete contract, each with both
  supported origin variants.
- Target users succeed on their own devices.
- Monitoring, correction, incident, and rollback ownership is active.

### Public beta

- At least five complete routes exist.
- Each has passed four successful weekly assurance checkpoints spanning at least
  21 days; more frequent monitoring does not shorten that period.
- Accessibility, comprehension, security, privacy, offline, and operational gates
  pass.
- Methodology, changes, correction contact, limitations, and incident status are
  public.

Deployment, publication, DNS, production maintenance, external notifications,
and user recruitment require separate owner approval. A successful HTTP response
or green build is never a launch criterion.

## 9. Measures of usefulness

- A first-time user can find two research possibilities within two minutes.
- A pilot user can identify the next relevant action within one minute.
- The user can distinguish `Do this`, `Confirm first`, `Not established`, and
  `Blocked` without opening technical evidence.
- Every declared traveller has an independent document/readiness result.
- Every automatic deadline exposes its inputs, counting rule, source revision,
  and uncertainty.
- A saved plan always shows generation time, evidence release, freshness, and
  invalidated items.
- Travel day and emergency information is reachable in at most two deliberate
  actions and remains available offline.
- At least four of five early participants complete the end-to-end scenario and
  correctly explain the largest uncertainty without coaching.
- No private profile is required to browse, and no private input leaves the
  device without deliberate export.

## 10. Work deliberately deferred

- destination expansion before the first pilot route passes both origin variants;
- accounts and server-side personal profiles;
- behavioural analytics, recommendation feeds, social features, and voting;
- universal safety, friendliness, political, moral, or quality-of-life rankings;
- inferred asylum, humanitarian, ancestry, employment, or investment routes;
- automatic booking, form submission, payment, visa application, or legal filing;
- automatic user notifications or subscriptions before privacy and failure-mode
  design;
- a universal `best country` or composite score;
- guarantees of admission, approval, price, housing, work, schooling, health, or
  long-term residence.

## 11. Stop conditions

Stop the affected release or implementation path if:

- incomplete information produces a destination-specific `Do this` instruction;
- one checked fact makes a route appear checked or actionable;
- applicability is inferred across children, jurisdictions, routes, dates, entry
  points, carriers, or catalog releases;
- a contradiction is silently resolved in the favourable direction;
- a legal deadline is calculated from an incomplete or internally inconsistent
  stay rule;
- `no data collected` is presented as `not possible`, `safe`, or zero;
- a cost total hides missing components or observation dates;
- cached information loses its offline/stale warning;
- household, cash, medical, travel-history, or plan data leaves the device without
  a deliberate user export;
- the map, visual placement, filtering, or plan flow makes an option unreachable
  without pointer use or geographic inference;
- an automated semantic change can publish a relaxed action without a new
  revision and full current evidence gate;
- deployment is proposed before the corridor, comprehension, incident, and
  ownership gates pass.
