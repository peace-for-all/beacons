# Phase 5 operational-packet status — 2026-09-04

## Slice contract

- Phase: 5, first-72-hour operational contract foundation
- User outcome: expose exactly what must still be collected before the Serbia
  corridor can support arrival and first-72-hour planning
- Baseline commit: `5df3f9d`
- Catalog release: `m11-beg-entry-point-evidence`
- Authoritative run: `automation.20260904070540602.ad8439e212b9.be6521a92b41`
- Authority: research and implementation only

In scope: structured first-72-hour arrangements, operational-contact dialing
and metadata, explicit absence bindings, packet coverage evaluation, content
validation, mutation tests, and documentation.

Excluded: adding or refreshing catalog sources, admitting contact numbers,
selecting accommodation or transport, observing prices or payment methods,
collecting household data, building task-first UI, saving data, deployment, and
any change to `mayEmitDoThis`, publication, pilot, or activation authority.

## Implemented

- `absenceRecordIds` are separate from evidence-bearing claim and operational
  record IDs. A missing record may therefore identify its exact expected
  payloads without improving the slot's inventory state.
- First-72-hour expectations cover primary and fallback accommodation and
  transfers, mobile/voice/offline communication, primary and fallback payment,
  food, medicine, urgent care, child and optional pet needs, trusted-contact
  check-in, and entry/transport/payment/accommodation failure scenarios.
- Operational-contact payloads distinguish E.164 numbers from local short
  codes and require scope, usage, availability, language, copy, call, and
  offline metadata.
- `evaluateFirst72Packet` evaluates all seven required slots and reports exact
  missing subjects, expired and non-observed evidence, the next unresolved
  requirement, packet coverage, and independent action blockers.
- Checked-in Serbia content remains 6 current, 18 incomplete, 0 contradictory,
  and 36 missing slots. First-72-hour coverage is `not_established` and action
  readiness is false.

## Remaining

1. Start a new evidence release only when current official operational facts
   are intentionally admitted.
2. Add monitored official emergency and consular contacts, BEG primary and
   fallback transfers, and urgent-care access facts.
3. Observe accommodation, payment, communication, food, medicine, and the four
   failure branches without inventing provider or household details.
4. Complete both-origin itinerary constraints, fares, baggage, accessibility,
   and operating-state checks before claiming Phase 5 complete.

## Verification

- `npm run validate:content`: 37 sources, 68 claims, 60 manifest slots,
  16 operational records; first-72-hour coverage `not_established` and action
  readiness false
- focused first-72-hour and journey-guidance mutation tests: passed
- `npm run check`: content, freshness, household, EN/RU parity, lint, typecheck,
  production build, 142 unit tests, and 8 Playwright/axe browser tests passed
- `git diff --check`: passed

## Candidate official sources reviewed, not admitted

These URLs were inspected on 2026-09-04 to confirm that the new schemas can
represent likely records. They are research leads only: they are not catalog
sources, proof packets, operational records, or current guidance.

- Serbian Ministry of Interior visitor-safety PDF: publishes police `192`, fire
  `193`, and ambulance `194` for urgent intervention.
  <https://www.mup.gov.rs/wps/wcm/connect/4331209d-e5f1-4f3e-82c8-17cae77c84d3/2024-07-01-projekat%2Bturista%2B-%2Bverzija%2Bna%2Bengleskom.pdf?CVID=p1L0AXD&MOD=AJPERES>
- Consular Department of the Russian MFA: publishes the Russian Embassy in
  Serbia emergency number and distinguishes it from routine consular contacts.
  <https://www.kdmid.ru/docs/serbia/russian-consular-offices/>
- Belgrade Airport: publishes current public-transport routes from BEG, while a
  separate page describes the fixed-price taxi voucher process.
  <https://beg.aero/eng/practical-informations/public-transportation>
  <https://beg.aero/eng/practical-informations/taxi-service>
- National Tourism Organisation of Serbia: publishes emergency-care access and
  high-level mobile connectivity information, but does not establish payment or
  insurance coverage for this household.
  <https://www.serbia.travel/en/service-information-2/>

No commit, push, deployment, publication, or authority activation is described
by this status note.
