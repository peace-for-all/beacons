# Phase 3 legal-packet status — 2026-09-03

- **Route:** `route.serbia-visa-free-30`
- **Corridor:** `corridor.serbia-belgrade.alpha.v1`
- **Authority:** research and implementation only
- **Phase state:** in progress; not legal-packet current
- **Catalog release:** `m11-beg-entry-point-evidence`
- **Authoritative run:** `automation.20260904070540602.ad8439e212b9.be6521a92b41`
- **Manifest:** 6 current, 18 incomplete, 0 contradictory, 36 missing
- **Legal slots:** 6 current, 5 incomplete, 0 contradictory, 0 missing

## Implemented in this slice

- `legal-packet-evaluator.ts` derives packet, slot, household, and per-traveller
  state independently. It consumes the versioned corridor manifest and the
  authoritative evidence run instead of trusting a route label.
- Every adult and both children are evaluated separately. Passport absence and
  expiry, accompaniment, a filed departure objection, notarized consent for an
  unaccompanied child, custody/guardianship uncertainty, and relationship
  evidence cannot be cleared by another traveller's result.
- `legal-time.ts` calculates only complete structured calendar-day rules. It
  handles inclusive entry/exit dates, prior-stay windows, exact registration
  instants, and IANA timezone validation. Working-day rules, missing arrival
  dates, and exceptions without machine-readable effects remain not evaluated.
- Missing entry-point evidence now remains `not_evaluated`; absence no longer
  means eligible.
- Current legal manifest labels require the relevant semantic fact set for
  nationality/passport scope, passport presence/validity, authorization,
  transit/entry points, border documents, stay/registration, and exact route
  provenance.
- Executable drills cover route withdrawal, source loss, claim revision drift,
  deleted legal slots, cross-jurisdiction proof, origin mismatch, and unknown
  transit.

## Primary-source findings promoted through automation

The latest 2026-09-03 evidence run used the official Serbian Ministry of
Interior Law on Foreigners consolidation, Serbian MFA pages, Welcome to Serbia,
three official Russian prosecutor guidance pages, and the current consolidated
Federal Law 114-FZ hosted by the Russian Foreign Ministry's consular department.

- Law on Foreigners Article 15(1) lists a valid travel document, sufficient
  means, onward/transit eligibility, and travel medical insurance among entry
  gates.
- Article 16(4) counts both the entry day and exit day as days of stay.
- Article 17 requires a valid travel document for departure.
- Article 111 assigns registration within 24 hours to the accommodation
  provider or host, and to the traveller when neither arrangement applies.
- The exact MFA wording supports a return flight ticket that may be requested,
  not a generic onward-ticket requirement.
- The insurance contract applies the controlling Law on Foreigners refusal
  ground while retaining and monitoring the MFA's lower-precedence
  recommendation and EUR 20,000 wording.
- The Serbian MFA general-entry page says foreign minors do not need parental
  consent to enter Serbia, but that statement does not decide Russian departure,
  custody, transit, or carrier requirements.
- Federal Law 114-FZ and independent prosecutorial guidance now jointly support
  the valid-document rule, accompaniment with one legal representative when no
  applicable objection exists, notarized consent for an unaccompanied child,
  objection scope and withdrawal, and court resolution of a dispute.
- The child-document claim now encodes the operative own-valid-document rule
  for Serbia. The 20 January 2026 birth-certificate notice is not used because
  it concerns five treaty destinations rather than Serbia.

These facts passed bounded extraction, monitoring, contracts, current-release
binding, and proof-packet generation. They do not make the full legal packet
current: household facts about representative authority and child-level funds
remain case-specific and unresolved, and BEG's route-specific legal entry-point
scope is not established.

## Remaining exit blockers

1. Confirm whether each fallback booking is a single airside itinerary with
   through-checked baggage for every traveller.
2. Resolve registration exceptions, child-level funds allocation,
   representative authority, and any remaining minor-document requirements
   without broadening the evidence.
3. Supply the household's per-traveller case declarations and recover the
   currently unavailable host-registration guidance lineage.

Until all three blockers are cleared, Phase 3 stays in progress and corridor
readiness remains no higher than `Plan with verification`.

## 2026-09-04 continuation

- Minor case inputs now distinguish a parent, adoptive parent, guardian, or
  custodian; a confirmed-absent objection from an unchecked or unknown
  objection; and guardian/custodian authority evidence from general
  relationship evidence. Contradictory input combinations fail schema
  validation.
- An unchecked objection, missing guardian/custodian authority evidence, and a
  missing relationship document remain `not_evaluated`. The latter two are not
  labelled missing border documents because the reviewed sources do not
  establish a general border-carry rule for them.
- Legal-time input now requires the actual registration arrangement. Paid
  accommodation and a private host assign the 24-hour duty to the provider or
  host; a self-arranged address assigns it to the traveller. Unknown or
  inconsistent arrangements fail closed.
- The reviewed Serbian MFA wording and Law on Foreigners do not establish how
  the EUR 50-per-day benchmark is allocated to a child or pooled within a
  household. No child-specific amount was promoted.
- Article 111 and the official registration guidance describe paid
  accommodation, private-host, and self-arranged cases. The reviewed text did
  not publish a child/family batching rule or exception, so the evaluator asks
  for the arrangement rather than inventing one.
- Russian official guidance identifies parents, adoptive parents, guardians,
  and custodians as legal representatives and, for the notarial-consent
  procedure, asks a guardian/custodian for proof of authority. That procedural
  checklist was not generalized into a border-document rule.
- Public registration tasks now render both structured alternatives instead of
  hard-coding the host path. They ask which path applies and require separate
  confirmation for each traveller without claiming an unsupported family-
  batching rule.

## 2026-09-04 departure-window continuation

- The planning window is inclusive: 11 September 2026 through 4 January 2027.
- Moscow and Saint Petersburg now each have a separately sourced direct Air
  Serbia schedule observation and a Turkish Airlines fallback candidate through
  Istanbul. Each record includes the observed departure date, exact segment
  instants, elapsed duration, carrier, transfer point, and BEG entry point.
- A future timetable is recorded as `scheduled`, never as an observed operation.
  The records expire after 24 hours and cannot emit `Do this`.
- The Istanbul alternatives remain candidates until the carrier confirms one
  ticket covering every passenger and segment, an airside transfer, and
  through-checked baggage. Self-transfer is not treated as equivalent.
- Exact household fares, cancellation terms, baggage allowance, accessibility
  support, and route-specific legal proof for BEG and the transit packet remain
  unresolved. The operational observation does not fill the legal transit slot.
- The `m9-departure-window-observations` renewal briefly withheld three Russian
  departure claims after page-context hashes changed. Review confirmed that the
  configured legal sentences still matched exactly on both independent
  lineages; only the pinned context baselines were renewed before re-evaluation.

Child-funds allocation, any general border rule for relationship or authority
documents, booking-specific transit proof, and structured
rendering for the still-missing legal facts remain Phase 3 exit blockers.

## 2026-09-04 transit-case continuation

- A structured airport-transit fact now binds the Turkish Foreign Ministry's
  airside condition and the Presidency of Migration Management's warning that
  passengers in airport transit areas may still undergo document checks. Both
  exact passages have current proof packets from independent official lineages.
- The Moscow and Saint Petersburg legal transit slots moved from `missing` to
  `incomplete`. The fact does not assert that a particular ticket keeps the
  household or checked baggage airside, and it does not establish BEG as a
  legally permitted entry point for this route.
- Two origin-specific guidance items render the same structured rule in English
  and Russian and remain `confirm_first`; the legal authority policy still has
  `mayEmitDoThis: false`.
- The legal case contract now records airside versus landside/self-transfer,
  single-ticket state, through-checked baggage, and transit-country entry
  permission. Contradictory declarations fail schema validation, and a
  landside/self-transfer case with missing entry permission is blocked.
- Funds and registration coverage are checked against every expected adult and
  child identifier. Individual coverage may be confirmed, but household-pooled
  funds remain incomplete because the source does not establish how the EUR 50
  benchmark is allocated to children. Registration means each traveller is
  covered; it does not claim that separate submissions are legally required.
- One bounded refresh could not reach a required host-registration guidance
  source and correctly demoted the affected claim. A later HTTP 200 refresh
  restored both registration lineages. Three Russian prosecutor contexts also
  changed around exact matching sentences; review confirmed the required text
  was unchanged before the version-4 context baselines were pinned.

## 2026-09-04 BEG entry-point continuation

- The active 3 September 2026 official Serbia/Montenegro AIP says Serbian entry
  and departure occur at border stations, states the Government-designation
  condition for international airports, and identifies `BEOGRAD/Nikola Tesla`
  (`LYBE`, commercial code `BEG`) as `INTL-NTL` with scheduled use.
- `claim.serbia-entry-beg` pins those three exact fragments within one official
  AIP lineage. It establishes the general entry point only and expressly does
  not clear a traveller, flight, booking, or any other border condition.
- The first `m11` acquisition retained a transient parse failure and was not
  promoted. The lower-concurrency retry produced three proof packets and a
  current decision.
- Both origin-specific legal transit and entry-point slots are now current.
  Transit case state remains separate: an airside single-ticket itinerary with
  through-checked baggage can pass that case check, while a landside or
  self-transfer itinerary without Turkish entry permission remains blocked.
