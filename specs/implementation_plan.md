# Beacons implementation and launch plan

> **Direction note (2026-09-03):** [`PLAN.md`](../PLAN.md) is the current product
> roadmap. This document retains useful evidence, domain, and launch engineering
> detail, but its publication-grade display gates and milestone order are
> superseded. Current work must use the roadmap's browsable/actionable split,
> independent action state, corridor manifest, and packet-complete pilot gate.

- **Status:** Historical engineering reference; execution status lives in `PLAN.md`
- **Date:** 2026-09-02
- **Source RFC:** [`specs/beacons_rfc.md`](./beacons_rfc.md)
- **Target:** A responsible public beta, not merely a deployed prototype

## 1. Executive decision

Beacons is viable. The existing Vinext/Vite/Cloudflare Sites application is an adequate technical base, and the MVP does not need accounts, a database, a third-party map, or server-side household profiles.

The main launch risk is evidence operations. A polished interface with an outdated or over-broad entry claim would be worse than a visibly incomplete map. Therefore:

1. Beacon status is derived from claim-level evidence; editors do not toggle it manually.
2. Personalisation annotates and sorts places; it never erases the underlying map.
3. Household readiness, route availability, evidence freshness, and money distance remain separate.
4. Versioned automation extracts and evaluates facts, fails closed on uncertainty, and exposes a traceable proof packet for optional inspection.
5. Public beta requires five current routes and four consecutive successful weekly monitoring cycles.

A focused small team could reach public beta in roughly 8–12 weeks, but source quality, monitoring reliability, and true semantic exceptions—not routine confirmation clicks—will set the real date.

## 2. What “live” means

Beacons has four release levels.

### Team alpha

The semantic model, evaluator, map marker-index experience, and withdrawal controls work with synthetic or prominently non-actionable content. Nothing here is safe to use for travel.

The current repository remains at this research-browser authority level even
when individual facts are current. Current proof supports fact confidence; it
does not authorize destination-specific instructions without the complete
manifest and operational packets in `PLAN.md`.

### Evidence alpha

Two deliberately different real routes are extracted and evaluated end to end. For example, one may be visa-free and one may use an ordinary public application process. The team completes two weekly evidence cycles and incident drills.

### Closed beta

Five routes meet the evidence standard. Emergency and Basic cost models, household evaluation, local save, deliberate export, and the accessible map marker-index experience are complete. Target users test the product on their own devices.

### Public beta

All release gates pass, all five routes have survived four consecutive weekly monitoring cycles, automation and incident owners are named, the correction workflow has been rehearsed, and methodology and changelog pages are public.

“The deployment returned HTTP 200” is not a launch criterion.

## 3. Semantic kernel to settle first

The RFC should be amended before feature implementation to prevent state names from carrying several meanings at once.

### 3.1 Independent state axes

```ts
type EvidenceCondition =
  | "current"
  | "due"
  | "stale"
  | "contradictory"
  | "unavailable"
  | "unknown";

type RouteAvailability =
  | "verified_eligible"
  | "application_route_available"
  | "explicitly_ineligible"
  | "not_established";

type HouseholdReadiness =
  | "ready"
  | "missing_documents"
  | "not_evaluated";
```

Money distance is a fourth, independent result. It never changes document eligibility.

### 3.2 Historical public labels

The labels below are retained for design history and must not be emitted by the
current research browser. Use `Research only`, fact-level evidence condition,
coverage/blockers, and `Confirm first` until the roadmap's activation gates pass.

- Before a household profile exists, show **Verified ordinary route**, **Application route available**, or **Not verified**.
- Show **Open now** only after evaluating every declared adult and child.
- “Application route available” means a current public procedure is operationally available to the applicable user; it does not promise approval or admission.
- Use **Explicitly ineligible** only when a current authoritative source establishes it.
- A place under research is a `PlaceCandidate`. A `Beacon` is a derived mature state, not an editorial checkbox.

This removes the contradiction in calling an unverified place a Beacon and prevents “Buildable” from sounding like guaranteed visa approval.

### 3.3 Requirements that are both legal and monetary

Proof of funds, mandatory insurance, accommodation evidence, onward tickets, and administrative fees may be legal document requirements and costs at the same time. Store them once as structured requirements, then project them into both the route explanation and money model.

## 4. Technical architecture

Keep the first release static-first and local-first.

```text
Versioned authored content
  -> Zod validation and publish projection
  -> pure evaluators (freshness, route, household, money, plan)
  -> map + accessible list + detail + optional profile overlay
  -> static Cloudflare Sites deployment
```

### 4.1 Platform choices

- Preserve the current Vinext/Vite/Cloudflare Sites stack and lockfile.
- Keep D1 and R2 disabled for the MVP.
- Do not add authentication, profile APIs, analytics, remote fonts, or third-party map tiles.
- Use the existing SVG map for five destinations and provide an equal list view.
- Use installed Zod, React Hook Form, shadcn primitives, and Lucide.
- Use React state/context or a feature reducer until shared state complexity demonstrates a need for another library.
- Compute freshness from UTC time at runtime and during CI. Do not bake a reassuring status permanently into a deployment.

### 4.2 Suggested repository layout

```text
app/
  page.tsx                         server shell/content loader
  methodology/page.tsx
  changes/page.tsx

components/beacons/
  beacons-app.tsx                  client orchestration
  beacon-map.tsx
  beacon-list.tsx                  accessible equivalent to map
  beacon-detail.tsx
  evidence-panel.tsx
  household-profile.tsx
  money-overlay.tsx
  plan-builder.tsx

lib/domain/
  types.ts
  schemas.ts                       authored-content schemas
  freshness.ts                     pure, clock-injected
  route-evaluator.ts               pure per-traveller evaluation
  money.ts                         pure range calculations
  plan.ts                          deterministic plan generation
  publish.ts                       removes drafts/internal notes

lib/profile/
  storage.ts                       versioned schema and migrations

lib/i18n/
  en.ts
  ru.ts
  parity.ts

content/
  sources/
  claims/
  routes/
  places/
  costs/
  changes/

scripts/
  validate-content.mjs
  check-i18n.mjs
  check-freshness.mjs

tests/
  domain/
  content/
  components/
  e2e/
```

The current hardcoded records in `app/[lang]/page.tsx` become research candidates, not automatically supported production Beacons.

### 4.3 Core records

- `SourceRecord`: stable ID, original title, authority, jurisdiction, URL, source language, retrieval time, reachability, content fingerprint or archived-snapshot reference.
- `EvidenceClaim`: one normalized assertion, structured value, applicability, criticality, source references, effective dates, revision, and superseded claim.
- `EvidenceProofPacket`: exact bounded passage and locator, source observation and artifact hashes, structured fact/applicability hashes, extractor provenance, policy version, and optional immutable snapshot.
- `EvidenceDecision`: claim revision, automation outcome, publication effect, proof-packet references, freshness window, reason codes, and append-only report provenance.
- `DocumentRoute`: route kind, structured stay rule, requirements, child applicability, operational availability, and claim references.
- `Place`: identity, coordinates, route references, unknowns, and optional transport edges.
- `CostObservation`: origin, destination city, household, observation dates/season, currency and rate date, inclusions, range, source, and methodology.
- `HouseholdProfile`: versioned device-local input.
- `ChangeRecord`: semantic before/after values, sources, reason, producer provenance, content revision, and rollback target.

A single `permittedStayDays` number is insufficient. The stay rule must express per-entry limits, rolling windows such as N days in M days, registration deadlines, extensions, and conditions.

## 5. Evidence publication system

### 5.1 Minimum critical claims for a mature route

At least one ordinary route must have current primary evidence for:

- nationality and ordinary-passport applicability;
- route kind and operational availability;
- initial lawful-stay rule;
- passport-validity rule;
- application and entry documents;
- adult and minor applicability, including verified age conditions;
- entry-point or application-location restrictions;
- mandatory insurance, funds, accommodation, fees, or onward-ticket rules;
- effective and expiry dates when stated.

One directly supporting authoritative primary source is the minimum for each critical claim. Two URLs count as independent only when their publisher entity, publication chain, and origin lineage are genuinely distinct. Ambiguous or high-impact interpretations should use a second independent official chain where one exists.

Facts require a complete automated proof packet before they can support publication.
Deterministic extraction is preferred. Bounded model extraction may be used when
model identity, version, inputs, structured output, cited passage, and agreement
policy are recorded. Exact continuity of the fact, applicability, passage, and
surrounding context may renew support automatically. Extractor agreement is not
source independence, and disagreement fails closed rather than being resolved by majority confidence.

### 5.2 Evidence workflow

1. Record a destination and hypothesised route as a candidate.
2. Decompose the route into critical claims.
3. Capture primary sources, exact locators, applicability, original language, and dates.
4. Produce a structured conclusion and explicit unknowns with extractor provenance.
5. Create an immutable proof packet connecting fact and applicability hashes to exact bounded passages, locators, observations, and policy.
6. Render RU and EN explanations from the same structured value and versioned templates.
7. Run evaluator fixtures for adults, children, missing declarations, date boundaries, contradictory evidence, and proof-chain failures.
8. Run a complete action-eligible automation evaluation for the catalog revision.
9. Publish the immutable content and decision revision only if every gate passes.
10. Monitor critical claims weekly; unchanged exact matches renew automatically and changed or uncertain evidence produces a blocking diagnostic packet.

People may operate the pipeline, inspect proofs, or change versioned source and
policy configuration through code review. They do not attest individual facts,
and an approval action cannot override a missing or failed evidence gate.

### 5.3 Authoritative automation and proof trace

Store source observations separately from immutable claim revisions. Each observation records the final URL, redirect chain, response status, content type, raw and normalized hashes, cited-fragment and context hashes, fetcher/extractor versions, and observation time. Each source names a publisher entity, publication chain, origin lineage, and precedence.

Progress on 2026-09-02: source records now identify publisher entities, publication chains, origin lineages, explicit independence groups, derivations, precedence, expected content types, and redirect allowlists. The local monitor fetches all nine allow-listed official sources with public-address checks, per-hop redirect validation, time and size bounds, MIME checks, deterministic fingerprints, and seventeen exact-fragment locators. Its versioned report is visible at `/monitoring`.

The evidence-automation bridge is live locally. Sixteen claim-specific contracts
pin structured fact and applicability hashes to observed official passages.
`npm run evidence:evaluate` joins the latest complete monitoring run to those
contracts and appends one decision per claim. The initial run reports sixteen
exact continuities, ten claims needing contract or extractor work, and two
recorded conflicts. The public `/reviews` proof surface displays these machine
states and their trace paths; it is not an approval queue.

Contracts are intentionally one claim at a time even when two claims cite the
same source sentence. Search remains a separate discovery process: it may
propose an official URL, but it cannot add evidence, change a claim, or publish
a route. New URLs require explicit publisher/origin/independence metadata and
must be fetched through the hardened monitor. Agent assistance is confined to
bounded discovery and extraction that produces the same provenance-bearing
proof packet as deterministic code. Changed or relaxing conclusions require a
new claim revision and a complete action-eligible run; they never inherit an older decision.

The implementation is deliberately conservative:

- an exact, complete proof chain may establish or renew automated support;
- one controlling source may suffice only when the claim-specific policy permits it; otherwise the configured number of independent official lineages is required;
- multiple extractors reading one publication never count as independent sources;
- any authoritative conflict, relevant change, failed parse, broken proof link, or insufficient current support blocks renewal;
- restrictive or unresolved changes demote automatically;
- relaxing changes require a new claim revision and a fresh complete evaluation before promotion.

Community reports are a later operational signal. “Source broken,” “portal unavailable,” or “experience differed” may trigger a refetch or warning, but votes never establish legal truth. This feature waits for moderation, abuse prevention, and privacy design.

Before each contract becomes action-eligible, it needs content-aware extraction
for its media type, source-specific volatile-chrome rules, complete-run action
atomicity, proof-packet validation, and adequate monitor history. The evaluator
requires every pinned source to succeed and match; one unchanged page cannot hide
a required-source failure or applicability change. The remaining high-value
modeling fixes are Serbia continuous-stay semantics, Serbia child travel-document
alternatives, India passport-validity basis, India application-window scope, and
India tourist-purpose decomposition.

### 5.4 Freshness and demotion

- **Current:** checked within 8 days.
- **Due:** days 9–14; visible with warning, but not newly promotable.
- **Stale:** after day 14; automatically demotes the route.
- A passed explicit expiry date demotes immediately.
- Conflicting authoritative sources mark a claim contradictory and demote immediately.
- An unavailable primary source demotes the route if no other current primary support exists.
- A detected content change marks the claim `changed`; a critical restrictive or unresolved change is quarantined immediately.

Any credible report of a restrictive change triggers an out-of-cycle fetch and evaluation. Demotion must be an evidence operation that can ship without an application-code change.

### 5.5 Bilingual rendering and history

- Store the legal value once in structured form; RU and EN prose explain the same value.
- Render gate-critical values through versioned bilingual templates and test their value/applicability parity. Free prose is non-authoritative.
- Preserve original source titles and languages. Label translated titles as translations.
- Keep internal append-only history for changed and unchanged automation decisions.
- Publish a bilingual changelog for eligibility, stay duration, documents, availability, applicability, corrections, and material methodology changes.
- Never erase a bad claim. Supersede it, publish a correction, and preserve the faulty revision for audit.

## 6. Delivery roadmap

### Milestone 0 — semantics and trustworthy baseline

Progress on 2026-09-02: the RFC semantics, domain schemas, clock-injected freshness and human-route evaluators, dog non-interference boundary, empty validated publish catalog, evidence handbook, incident template, Node guard, and complete `npm run check` gate are implemented. The next assurance cut makes automation decisions and traceable proof packets the sole evidence authority.

Work:

- Approve the state model and amend the RFC.
- Initialize or connect real source control; the current `.git` directory is empty, so audit and rollback do not yet exist.
- Clear the pre-existing lint/test failures: effect-driven language state, missing development-preview metadata, and missing expected scrollbar utility output.
- Add `typecheck`, content validation, freshness, i18n parity, and combined `check` scripts.
- Define schemas and fixtures for current, due, stale, contradictory, unavailable, child-conditional, application-available, and explicitly ineligible cases.
- Write the evidence handbook and correction policy.

Exit gate: terminology settled, clean baseline checks, deterministic fixtures, and named automation/incident owners.

### Milestone 1 — one complete vertical Beacon

Work:

- Extract hardcoded content from `app/[lang]/page.tsx`.
- Implement claim schemas, publish projection, runtime freshness, and pure route evaluation.
- Split the page into feature components.
- Render one fully evidenced route through map, list, detail, and evidence views.
- Annotate/sort on personalisation; never remove candidates from the world view.
- Add a one-operation route withdrawal control.

Exit gate: every visible status is explainable from a claim and a passing evaluator test.

### Milestone 2 — prove the model with two route shapes

Progress on 2026-09-02: Serbia visa-free and India e-Visa candidate packets now exercise two distinct route shapes. Public methodology, semantic changelog, in-app proof trace, explicit contradiction, deterministic bilingual rendering, atomic withdrawal, an automation evaluator foundation, and four synthetic incident drills are implemented. The exit gate remains open until both complete automated baselines exist and two real weekly monitoring cycles occur; those events cannot be fabricated or compressed into one day.

Work:

- Implement a second route with materially different mechanics.
- Add field-level dates, applicability, contradictions, and known unknowns.
- Publish methodology and semantic changelog pages.
- Complete two weekly monitoring cycles and rehearse false-open, source-unavailable, mistranslation, and bad-deployment incidents.

Exit gate: two automatically supported routes, including child applicability, with traceable proofs, deterministic RU/EN value parity, and tested demotion.

### Milestone 3 — household and money overlays

Work:

- Add an optional household form that evaluates every adult and child.
- Store only intentionally saved values with a versioned, Zod-validated local schema and migration tests.
- Add Emergency and Basic cost ranges. Defer Soft landing until its methodology is defensible.
- Stretch: add a separate logistics assessment for up to two large dogs; it cannot affect human route or household readiness.
- Record origin, dates/season, household, inclusions, currency/rate date, sources, and uncertainty.
- Show an interval for required cash and gap; keep the optional reserve separate.
- Inventory network requests and verify that household and plan data never leave the browser.

Exit gate: household truth-table tests, storage migrations, cost invariants, and privacy-egress audit pass.

### Milestone 4 — actionable option plan

Work:

- Generate the three horizons from structured requirements.
- Show exactly one initial next action.
- Save locally and provide an obvious “clear my data” action.
- Export Markdown and print-friendly HTML first. Preview every field and exclude sensitive values by default.
- Put generation time, claim-check dates, content revision, and “verify before travel” on every export.

Exit gate: deterministic bilingual plan snapshots and no undeclared private data in exports.

### Milestone 5 — five-Beacon closed beta

Work:

- Select five candidates using evidence quality, family applicability, operational availability, and cost reproducibility—not geographic marketing value.
- Complete action-eligible proof packets for every critical claim and confirm each result is reproducible from the same catalog, observations, contracts, and policy versions.
- Finish responsive map-marker/detail behavior and WCAG 2.2 AA testing.
- Run a closed usability beta with approximately 8–12 participants covering Russian-first, limited-English, children, mobile-only, low bandwidth, keyboard, low vision, and screen-reader use.
- Test comprehension with hypothetical profiles or on-device data; do not collect reasons for travel, political views, or family histories.

Exit gate: five current routes, no unresolved contradictions, complete RU/EN, current Emergency/Basic costs, no critical accessibility defects, and users understand the status distinctions.

### Milestone 6 — operational and public beta

Work:

- Complete four consecutive weekly monitoring cycles for all five routes.
- Publish methodology, corrections contact, and bilingual changelog.
- Name automation operator, release owner, and incident contact.
- Add profile-free uptime/error monitoring and document unavoidable hosting logs and retention.
- Rehearse withdrawal, correction, content rollback, and full deployment rollback.
- Deploy through Cloudflare Sites with an immutable app/content release identifier.

Exit gate: every release gate below passes and the editorial team can sustain the workload.

### After public beta

Add Homes, Hub graphing, Soft landing, and richer exports only after the Beacon evidence operation is stable. These features widen the legal, cost, and interaction surface and must not delay a trustworthy core.

## 7. Release gates

Every candidate release must pass:

1. Reproducible lockfile install under Node 22.
2. ESLint and TypeScript.
3. Zod validation of every authored and published record.
4. Referential integrity across places, routes, claims, sources, costs, and changelog.
5. RU/EN key, interpolation, number/date, and structured-value rendering parity.
6. Freshness and explicit-expiry checks.
7. Truth-table tests for every route state and every adult/child combination.
8. Cost range, inclusion, currency, and rate-date invariants.
9. Semantic marker-index and keyboard interaction tests.
10. Production build and rendered-worker smoke tests.
11. Automated accessibility scan plus manual keyboard, screen-reader, zoom/reflow, contrast, reduced-motion, and low-bandwidth checks.
12. Privacy-egress and security-header checks.
13. Complete action-eligible automation decisions and traceable proof packets for every changed critical claim.
14. Zero overdue, stale, contradictory, or unsupported claims behind a lit Beacon.

An HTTP 200 from a source detects reachability only. It never constitutes an evidence decision.

## 8. Privacy, security, and accessibility baseline

### Privacy and security

- No account, profile API, third-party analytics, map SDK, tracker, or automatic request to a cited source in the MVP.
- No profiles, cash, children’s ages, documents, destination history, or plans in URLs, logs, analytics, or telemetry.
- Device-local means browser storage, not encryption; say this plainly.
- Provide storage versioning, migration tests, and a visible clear-data control.
- Preview exports and warn that exported files are outside the app’s protection.
- Render editorial content as text and allow-list source URL schemes.
- Configure CSP, `Referrer-Policy`, `Permissions-Policy`, clickjacking protection, HSTS, and dependency review.
- If offline support is later added, prominently date the snapshot and never hide stale cached evidence.

### Accessibility and comprehension

- The list view must provide everything the map conveys without color, animation, geography, or pointer use.
- Target 44×44px controls where practicable, visible focus, predictable marker/list synchronisation, and focus recovery.
- Associate every control with an accessible name and keep the document language correct after automatic or manual language selection.
- Announce meaningful result changes without rereading the entire detail panel.
- Identify links that open a new tab.
- Test both languages at 320px, 200% and 400% zoom, with keyboard, VoiceOver/NVDA, reduced motion, storage failure, and JavaScript failure where a useful fallback is possible.

A release is blocked if participants mistake unknown for closed, an application route for guaranteed approval, a cost range for available inventory, or a Beacon for a safety or friendliness recommendation.

## 9. Incident and rollback policy

### Severity 1

Examples: a route falsely appears open, private household data leaves the device, or published evidence is compromised.

Response:

1. Immediately withdraw the route or affected feature.
2. Show a bilingual notice when users may have acted on it.
3. Freeze related publishing and preserve the faulty revision.
4. Roll back to the last app/content revision whose evidence is still current.
5. Re-evaluate all claims sharing the source, extractor, contract, or evaluator rule.
6. Publish a correction with scope, dates, and remediation.

### Severity 2

Examples: material cost error, incomplete child detail, misleading translation, broken supporting source, or non-critical stale information.

Demote the affected field, label the uncertainty, correct within the declared response window, and publish a material-change entry.

Every incident record needs an owner, timeline, affected claims, user-impact assessment, corrective tests, and bilingual public note where material. Saved/exported plans must warn that later corrections cannot update them automatically.

## 10. Operational ownership

At minimum:

- **Product/policy owner:** defines supported scope and changes versioned authority, precedence, freshness, and extraction policy through the repository audit trail.
- **Source discovery:** scripts or agents propose sources without publication authority.
- **Evidence automation:** fetches, extracts, compares, evaluates, and writes traceable proof packets and decisions.
- **Proof viewer:** lets any person inspect the structured fact, exact passage, source, fingerprints, provenance, and decision reasons without becoming an approver.
- **Engineering/release owner:** owns evaluators, CI, deployment, and rollback.
- **Incident contact:** can demote claims and publish corrections promptly.

No person is required to attest individual claims. Ambiguous interpretations are
demoted until authoritative evidence and the configured extraction policy produce
a supported result. Qualified legal advice may inform a versioned policy change,
but a disclaimer or opinion does not make an unresolved claim safe.

## 11. Immediate two-week execution backlog

### Week 1: contracts and foundations

1. Connect or initialize Git and establish the evidence-contract and policy-change convention.
2. Amend RFC status semantics and define the initially supported household envelope.
3. Fix current lint/test failures and add typecheck/check scripts.
4. Implement the domain schemas, structured stay rule, and clock-injected freshness evaluator.
5. Create synthetic fixtures and CI checks before importing real claims.
6. Draft the evidence handbook, contract checklist, and incident template.

### Week 2: first vertical route

1. Prepare one candidate route and complete its automated proof chain.
2. Extract the current page into map, list, detail, and evidence components.
3. Render the supported route and candidates from validated content.
4. Implement visible field dates, applicability, unknowns, and immediate demotion.
5. Test semantic marker-index coverage, keyboard use, both languages, and false-open withdrawal.
6. Review the vertical slice with two or three target users before scaling research.

Do not research all five destinations in depth until the first vertical route proves that the schema, automation workflow, and proof interface expose the right facts.

## 12. Decisions and help needed from the project owner

The following decisions unblock execution most effectively:

1. **Initial household envelope — resolved:** one or two adults and exactly two children aged 6–17. Ages are evaluated individually; the range is a product boundary, not a legal definition.
2. **Evidence authority — resolved:** automation retrieves and evaluates facts and publishes traceable proof packets. People may inspect them but are not routine or exceptional claim approvers.
3. **Emergency roof standard:** what minimum lawful, bookable, child-suitable accommodation does Emergency mode represent?
4. **Origin scope — resolved:** Moscow and Saint Petersburg, defaulting to Moscow. Observations are never inferred across origins.
5. **Beta participants:** can we recruit 8–12 target users, including mobile-only and accessibility participants, without collecting sensitive motivations?
6. **Policy consultation:** which qualified sources or advisers may inform future versioned policy changes for legal ambiguity without becoming per-claim approval gates?
7. **Large dogs:** support for up to two husky-sized dogs is a Milestone 3 stretch goal and never changes human eligibility.

The five destinations should be chosen after a short evidence-screening pass. The current Belgrade, Yerevan, and Almaty records are candidates only until they satisfy the complete automated evidence standard.

## 13. Definition of public-beta done

Public beta is ready only when:

- five routes have complete, current, automatically supported critical claims with traceable proof packets;
- every supported adult and child is evaluated explicitly;
- Emergency and Basic costs expose range, methodology, observation date, and uncertainty;
- money never changes legal route status;
- map and list remain available before and after personalisation;
- every status is traceable to visible claim evidence;
- private inputs stay on-device and exports are deliberate;
- both languages are semantically complete;
- no critical accessibility or comprehension defect remains;
- four consecutive weekly evidence cycles have succeeded;
- correction, demotion, incident, and rollback drills have passed;
- all automated release gates are green.

That is the shortest credible path from the current prototype to something people can responsibly rely on.
