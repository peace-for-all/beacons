# Beacons authored content

`catalog.json` is the structured assertion boundary. Every record is validated
before build and release. Catalog assertions do not publish themselves: a
Beacon is supported only by a current authoritative automation decision whose
proof path is complete.

`corridor-requirements.json` is the versioned, fail-closed denominator for a
designated research corridor. Its slots remain present when evidence is missing,
and origin-specific slots are repeated independently for Moscow and Saint
Petersburg. A manifest is research allocation only: it cannot publish, promote,
or make a route actionable. `npm run validate:content` rejects a missing,
duplicate, unknown, cross-origin, stale-revision, or falsely current slot.

`journey-guidance.json` contains versioned authority policies, authored
guidance definitions, and operational records. Action state is derived during
validation; content cannot assert `do_this`. Each manifest requirement resolves
to a record-specific authority policy, so a cost or housing observation cannot
satisfy a legal, health, or emergency slot. The current policies deliberately
set `mayEmitDoThis: false` while the corridor remains a research target.

Operational absence is structured. `not_collected` means no observation has
been made; it is not `not_found`, `known_not_operating`, zero, safe, or
unavailable. A manifest binds these through `absenceRecordIds`, separately from
claims and observed `operationalRecordIds`, so recording a precise gap cannot
improve its inventory status. Each absence names the expected structured
payloads, such as primary and fallback transfer, payment, urgent care, or a
failure branch. Moscow and Saint Petersburg observations never transfer. Saved
guidance pins policy, manifest, item, claim, proof, and record revisions and
becomes `recheck` when a dependency or expiry changes.

The first-72-hour evaluator derives `not_established`, `partial`, `current`, or
`blocked` coverage from the complete seven-slot packet, record state, and exact
expiry boundary. Coverage is not action authority: the Serbia packet remains
non-actionable while the corridor is research-only or activation is disabled.
Operational contacts distinguish international numbers from local short codes,
require usage and coverage metadata, and cannot enable click-to-call without a
dial string.

Departure observations pin an inclusive planning window, a dated departure,
every timezone-aware segment, elapsed duration, transfer points, carrier and
entry point. `scheduled` is distinct from `observed_operating`. Multi-source
bindings preserve carrier, transit-rule, and dated-schedule roles separately;
an unconfirmed single-ticket candidate cannot be presented as a self-contained
airside itinerary.

Legal case checks keep the evidence rule separate from the booking facts. A
two-lineage airport-transit rule can describe the airside condition, but the
actual itinerary must still declare transfer mode, single-ticket status,
through-checked baggage, and any needed transit-country entry permission.
Funds and registration coverage are evaluated for every traveller; an
unestablished household-pooling or family-batching rule stays incomplete.

Critical claims require current primary evidence, structured applicability, and
automation provenance. Each decision must be traceable through its contract and
proof packet to the exact observed passage, source URL, source and passage
fingerprints, extractor and policy versions, and observation time. Missing,
changed, ambiguous, contradictory, stale, or untraceable evidence blocks the
affected claim. Draft research notes must not be added to the published catalog.

`evidence-contracts.json` contains one executable, versioned evidence contract
per claim. A contract pins the structured fact, applicability, official-source
fragment, bounded context, authority policy, and automation baseline provenance.
`evidence-decisions.json` is the append-only decision log produced by
`npm run evidence:evaluate`. An action-eligible decision may support publication
only when its complete proof chain validates; a failed or incomplete run never
renews evidence. People may inspect the packets, but a confirmation click is
neither required nor accepted as evidence.

A contradiction remains blocking unless the claim contract contains the narrow
`controlling_law_over_official_guidance` resolution. That resolution must pin an
official legal-text controller and an exact fragment for every contradicting
guidance source. Conflicting guidance stays visible, is monitored on every run,
and never counts toward the contract's independent supporting lineages. A
missing or changed fragment on either side fails closed.

Search is discovery-only. A search result, snippet, ranking, copied URL, or model confidence score is never evidence. New sources must first enter the catalog with explicit authority and lineage, pass the hardened fetcher, and receive a claim-specific extractor and proof-producing contract. Extractor agreement and source independence are separate: several models reading one publication are still one source lineage.

## Display and action authority

Catalog facts may be displayed with an explicit evidence condition even when a
route is incomplete. Display never grants action authority. A corridor manifest
now exists for the Serbia research target, but its presence grants no authority.
Until the exact slot, authority policy, proof packet, scope, and every dependency
pass, route facts remain `confirm_first` or `not_established`; they cannot become
`do_this`, `Required`, or feed an automatic deadline. `actionQuarantine` removes a semantically unresolved
fact from planning projections while retaining the fact and its evidence for
inspection. Source jurisdiction must match the claim's route and place, and
English/Russian claim text must preserve the same numeric values.

## Household count rules

`household-mobility.json` is the smaller, count-specific overlay used by the map's children/dogs filters. A current child-applicability claim can establish only that a selected count is not ruled out; it does not establish child-document or household readiness. Dog records retain the official URL, bilingual rule, requirements, limitations, review time, a mandatory `reviewAfter` deadline, and an exact-text or raw-fingerprint monitoring contract.

Count filters keep unknown or stale destinations visible and label them uncertain; only a confirmed count ceiling that the selected party exceeds removes an option. `npm run evidence:household-refresh` fetches every official source and renews only unchanged evidence, without a confirmation step. Failed or changed sources keep their old deadline and therefore age into uncertainty. The scheduled GitHub Actions workflow runs that renewal plus the main claim monitor every three days and commits the machine-generated evidence state. `npm run check:household-mobility` fails once any review is overdue, so stale evidence cannot pass a release check silently.
