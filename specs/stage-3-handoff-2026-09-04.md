# Stage 3 closure handoff — 2026-09-04

## Scope and authority

- Route: `route.serbia-visa-free-30`
- Corridor: `corridor.serbia-belgrade.alpha.v1`
- Departure window: 11 September 2026 through 4 January 2027, inclusive
- Stage: closed for research-browser scope; the legal packet is not action-ready
- Authority: research and implementation only
- Public outcome ceiling: `Confirm first` / `Plan with verification`
- Machine closure: `closed_research_scope` on 2026-09-04 with
  `actionReady: false`

Do not turn the collected evidence, operational observations, or successful
automation runs into booking advice or `Do this` authority. All current legal
authority policies retain `mayEmitDoThis: false`.

## Frozen state to resume from

- Branch and base commit: `main` at `b792e90`
- Catalog release: `m11-beg-entry-point-evidence`
- Authoritative automation run:
  `automation.20260904070540602.ad8439e212b9.be6521a92b41`
- Matching monitoring run: `monitor.20260904070540602.ad8439e212b9`
- Automation result: 36 supported claims, 32 withheld claims, 52 proof packets
- Catalog: 37 sources, 68 claims, 7 routes, 7 places, 54 fragment monitors,
  37 contracts, 44 observation runs, and 24 automation runs
- Manifest: 60 slots total, 59 required and 1 optional; 6 current,
  18 incomplete, 0 contradictory, and 36 missing
- Legal subset: 6 current, 5 incomplete, 0 contradictory, and 0 missing

The worktree is intentionally very dirty and contains the full uncommitted
Stage 0–3 implementation plus other existing work. Do not reset, restore, or
mass-format it. Review and commit only deliberately selected files.

## What is implemented

### Departure-window observations

`content/journey-guidance.json` contains four short-lived, structured schedule
observations within the planning window:

- Moscow direct: Air Serbia JU131, SVO–BEG, 11 September 2026, 185 minutes
- Moscow fallback: Turkish Airlines TK412 and TK1079, VKO–IST–BEG,
  16 September 2026, 940 minutes
- Saint Petersburg direct: Air Serbia JU125, LED–BEG,
  11 September 2026, 180 minutes
- Saint Petersburg fallback: Turkish Airlines TK400 and TK1081, LED–IST–BEG,
  23 September 2026, 535 minutes

These are future timetable observations recorded on 4 September 2026. They are
`scheduled`, not `observed_operating`, expire after 24 hours, and contain no
fare assertion. The Istanbul candidates remain conditional on a single ticket,
exact segments, airside continuity, and through-checked baggage for the actual
booking.

The schema and validation in `lib/domain/journey-guidance.ts` cover the
planning window, itinerary role, observation scope, entry point, booking
structure, timezone-aware segments, duration, operating state, segment
continuity, transfer consistency, and evidence bindings.

### Transit evidence and case evaluation

The catalog release adds `airport_transit_rule` and the current claim
`claim.serbia-turkiye-airside-transit`. It is supported by independent official
Türkiye MFA and Migration Management lineages. The fact says only that no
transit visa is required while a passenger remains in the airport transit area
and that document checks may still occur.

That evidence moved both origin-specific legal transit slots from missing to
incomplete. It does not prove that a particular booking remains airside, that
baggage is checked through, or that a landside passenger has permission to
enter Türkiye.

`lib/domain/legal-packet-evaluator.ts` now validates airside versus
landside/self-transfer cases, ticket structure, baggage handling, and any
required transit-country entry permission. It also checks every expected adult
and child for funds and registration coverage without inventing household
pooling or family batching.

### BEG entry-point evidence

The active 3 September 2026 Serbia/Montenegro AIP now supplies the missing
official chain. Its Serbia immigration section says entry and departure occur
at border stations under the border-control, foreigners, and travel-document
laws. Its aerodrome-conditions section says an airport may be used for
international air transport only when the state-border conditions exist and a
Government act defines the international crossing. Its current aerodrome index
then identifies `BEOGRAD/Nikola Tesla` (`LYBE`, commercial code `BEG`) as
`INTL-NTL` with scheduled international use.

`claim.serbia-entry-beg` binds those three passages as one official AIP
lineage. It establishes only the general entry point. It does not establish
admission for a particular traveller, operation of a flight, or satisfaction
of passport, visa-exemption, funds, insurance, accommodation, return-ticket,
carrier, or transit conditions. The active AIP edition and applicable NOTAM
still need rechecking before travel.

The first recorded `m11` acquisition retained a transient parse failure for the
immigration page and was not used as the baseline. The lower-concurrency retry
matched all three fragments exactly. Both origin-specific legal transit and
entry-point inventory slots are now current; booking-level transit remains a
separate runtime case check.

### Household legal inputs

The evaluator distinguishes parent, adoptive parent, guardian, and custodian;
confirmed-absent, present, unchecked, and unknown departure objections; and
guardian/custodian authority evidence from general relationship evidence.
Contradictory declarations fail validation.

`lib/domain/legal-time.ts` implements exact calendar-day and 24-hour
registration calculations. Paid accommodation, private host, and self-arranged
address select the responsible party. Unknown or inconsistent arrangements
fail closed.

### Monitoring behavior

`scripts/monitor-evidence.mjs` accepts `--concurrency` from 1 through 10. Keep
failed and partial runs: they are append-only evidence, not disposable test
output. The latest run recovered the host-registration lineage. Three Russian
prosecutor pages changed surrounding context while their required sentences
remained exact; the inspected baselines are now pinned in the version-4
contracts.

## Verification completed

The current worktree passed the complete repository gate:

- content validation and freshness
- household-mobility and English/Russian consistency checks
- lint and TypeScript checks
- production build
- all 14 unit-test files, 139 tests, including Stage 3 classification, automatic
  reopening for missing or contradictory legal slots, and action-readiness
  honesty checks
- Playwright/axe browser suite, 8 of 8 tests, including explicit assertions
  that the map occupies the initial desktop and mobile viewport
- `git diff --check`

The first browser attempt hit the sandbox's local port-bind `EPERM`; the same
built suite passed when run with permission to bind the test port. Treat that
error as an environment restriction unless the unrestricted run also fails.

A local visual check found and fixed an app-shell grid regression that pushed
the map below the fold. The shell now assigns explicit rows to the header and
remaining map viewport. The duplicate visible `All destinations` /
`Все направления` strip and the redundant top research-only notice were
removed; the existing map-bottom legal disclaimer remains, and all seven
destinations remain keyboard-accessible map buttons. Desktop and 360 by 697
phone renders show the map, markers, origin, filters, and controls immediately.
On a physical Samsung SM-A225F, mobile marker labels now
stay inside the map and clear its legal caption; crowded or offscreen labels are
suppressed while their named marker buttons remain available. The filter X
closes instead of clearing, the filter and project menus are mutually exclusive,
and static project pages use the same compact 63 CSS-pixel mobile header and
project-menu control.

## Stage 3 closure classification

The legal subset has 6 current and 5 incomplete slots, with no missing,
contradictory, or unclassified slot. The incomplete state does not mean that
implementation should continue speculatively. Every residual is now classified
as reusable evidence work, future runtime input, or both.

| Legal slot | Scope | Evidence gap | Future runtime input |
| --- | --- | --- | --- |
| Origin departure requirements | Moscow | No | Actual travellers, documents, representative roles, custody and objection state |
| Origin departure requirements | Saint Petersburg | No | Actual travellers, documents, representative roles, custody and objection state |
| Minor documents | Shared | No established generic border-carry rule for relationship or representative-authority documents | Actual representative and case evidence |
| Border supporting requirements | Shared | No established child-specific or household-pooled interpretation of the funds rule | Actual per-traveller funds coverage |
| Stay counting and registration | Shared | No established family-batching rule or complete exception set | Actual accommodation arrangement and responsible party |

Machine-readable `remainingKinds` values in the corridor manifest enforce this
classification. The manifest also records `stage3Closure.status` as
`closed_research_scope` while retaining `actionReady: false`. Validation rejects
the closure if a legal slot becomes missing, contradictory, or unclassified, or
if declared action readiness diverges from the legal inventory. The closure
summary is 3 evidence-gap slots, 5 runtime-input slots, and 0 unclassified slots.
`researchClosureReady` is true; `actionReady` is false.

## Stage 3 closure decision

Stage 3 is complete for the research-browser scope. It delivered a complete
legal denominator, evidence-bound claims, fail-closed evaluation, case-input
schemas, incident drills, and explicit residual classifications. It did not
produce booking advice, a current household legal packet, or action authority.

Do not collect household declarations merely to close a roadmap item. The
following inputs are deferred until someone intentionally evaluates a real
journey: party size, passport presence and validity, each child's representative
and objection state, relevant authority evidence, funds allocation,
accommodation arrangement, itinerary choice, and any Istanbul ticket, segment,
airside, or baggage facts. An exact departure day can remain unspecified until
booking-level verification.

Non-legal corridor facts such as fares, cancellation terms, baggage allowance,
accessibility, and wider first-72-hour or money slots remain outside this Stage 3
closure. They are not legal-packet substitutes and should not trigger a new
phase without an explicit product need.

## Reopening rules

1. Reopen reusable legal research only when a named official source or a real
   case exposes a specific unresolved semantic question. Never infer child
   funds, pooled funds, family batching, or a document-carry requirement from
   silence.
2. Request household or booking facts only when a real journey is intentionally
   being evaluated. A direct itinerary avoids a transit case; an Istanbul
   fallback needs the exact ticket, segments, airside state, and baggage
   handling.
3. When changing claims, contracts, or the catalog release, run a fresh monitor
   and evaluator cycle and repin manifest and guidance proof IDs. Validation
   selects the latest eligible automation run, so stale proof links fail.
4. Run the complete repository gate before handing the work onward or proposing
   a commit. Do not start Phase 4 automatically from this closure.

Use Node 22.22.2 from `.nvmrc`:

```bash
nvm use
npm run validate:content
npm run check
```

Only refresh external evidence when the catalog or monitoring question really
requires it, because every attempt appends records and transient failures are
meaningful:

```bash
npm run evidence:monitor -- --concurrency 3
npm run evidence:evaluate -- --monitoring-run <monitoring-run-id>
```

## Primary references for the current legal packet

- [Current Serbia/Montenegro AIP entry and immigration requirements](https://www.smatsa.rs/upload/aip/published/03-Sep-2026-A/2026-09-03-AIRAC/html/eAIP/LY-GEN-1.3-en-GB.html)
- [Current AIP international-aerodrome condition](https://www.smatsa.rs/upload/aip/published/03-Sep-2026-A/2026-09-03-AIRAC/html/eAIP/LY-AD-1.1-en-GB.html)
- [Current AIP aerodrome index identifying LYBE as international](https://www.smatsa.rs/upload/aip/published/03-Sep-2026-A/2026-09-03-AIRAC/html/eAIP/LY-AD-1.3-en-GB.html)
- [Serbian MFA general entry requirements](https://mfa.gov.rs/en/citizens/travel-serbia/general-entry-requirements)
- [Serbian registration guidance](https://welcometoserbia.gov.rs/registration-upon-arrival)
- [Serbian Law on Foreigners](https://mup.gov.rs/wps/wcm/connect/9e10bf1d-79ad-4a50-a8c1-76b6afb0d6e9/Law%2Bon%2BForeigners%2B2023.pdf?CVID=pdNziNy&MOD=AJPERES)
- [Belgrade Airport passport control](https://beg.aero/eng/practical-informations/automatic-passport-reading)
- [Türkiye MFA transit FAQ](https://www.mfa.gov.tr/frequently-asked-questions.en.mfa)
- [Türkiye Migration Management entry guidance](https://en.goc.gov.tr/entry-into-turkey)

No commit, push, deployment, or authority activation is part of this handoff.
