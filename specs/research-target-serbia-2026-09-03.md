# Serbia / Belgrade corridor research-target decision

- **Decision:** concentrate Phase 1 research on the Serbia / Belgrade corridor
- **Authority:** research allocation only; no pilot selection, publication,
  promotion, instruction, or route-readiness authority
- **Manifest:** `corridor.serbia-belgrade.alpha.v1`
- **Catalog release:** `m5-family-entry-evidence`
- **Authoritative run:**
  `automation.20260903094057217.737634512e82.18f376d5a296`
- **Route snapshot:** `route.serbia-visa-free-30`, with the 13 claim revisions
  pinned by the manifest
- **Household envelope:** one or two adults and exactly two children aged 6–17;
  all travellers use ordinary Russian passports
- **Origin variants:** Moscow and Saint Petersburg, assessed independently

## Why this target

The current scorecard gives Serbia the deepest monitored visa-free evidence
slice: 6 of 13 route claims are current, 6 are uncovered, and the insurance
claim is contradictory. The public route shape is smaller than India's
application route, so it is the narrowest useful place to prove the corridor
model. This does not make Serbia safer, easier, open, or preferable.

Transit complexity, transport observability, emergency-information coverage,
and both-origin cost coverage are all currently missing rather than favourable.
The manifest keeps those gaps in the denominator.

## Exact source lineages in the route snapshot

| Source | Publication chain | Independence group | Precedence |
| --- | --- | --- | --- |
| `source.serbia-mfa-russia-visa` | `publication.serbia-mfa-visa-regime` | `lineage.serbia-mfa` | official guidance |
| `source.serbia-mfa-general-entry` | `publication.serbia-mfa-general-entry` | `lineage.serbia-mfa` | official guidance |
| `source.serbia-law-foreigners-2023` | `publication.serbia-law-on-foreigners` | `lineage.serbia-law-on-foreigners` | controlling law |
| `source.serbia-welcome-registration` | `publication.serbia-welcome-registration` | `lineage.serbia-government-portal` | operational official |

The two MFA pages are one independence group and must never be counted as two
independent authorities. The unresolved insurance disagreement remains a
contradiction; source count cannot settle it.

## Gap and work allocation

The versioned manifest is the complete machine-readable inventory. It covers
legal, departure, first-72-hour, stay/exit, safety, money, household, and offline
packets. Each unresolved slot records the required source, schema, extractor,
evaluator, transport, cost, safety, operational, or product work. Missing slots
remain in the denominator even when no corresponding catalog claim exists.

No cost or operational observation may be inferred from the absence of data.
The Moscow and Saint Petersburg variants each require their own itinerary,
transit, fare, operating-state, payment, and cost records.

## Withdrawal and invalidation blast radius

- A changed or withdrawn bound claim invalidates every manifest slot that names
  that claim; it does not silently delete the slot.
- A new catalog release or newer authoritative run invalidates this manifest
  until its release, run, route-claim revisions, and inventory are reviewed and
  versioned together.
- A source-lineage failure demotes all bound claims from that lineage. The two
  Serbian MFA records fail together for independence purposes.
- A route withdrawal suppresses route guidance and selection while retaining
  the manifest, decision, evidence records, and audit history.
- Origin-specific transport or cost failure affects only that origin variant,
  but either failed variant blocks corridor-alpha completion.
- Insurance remains contradictory until a new claim revision and its complete
  current proof packet establish the controlling rule; this decision cannot
  resolve or waive it.

## Selection checkpoint

Pilot selection remains blocked until every required manifest slot passes its
category policy, both origin variants have reproducible current 30-day costs,
the complete incident and validation gates pass, and the owner records the
separate activation decision required by the roadmap.
