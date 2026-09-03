# Beacons evidence handbook

- **Status:** Active for Milestone 0
- **Date:** 2026-09-02
- **Applies to:** Human entry/stay claims, costs, and optional pet logistics

## Purpose

This handbook turns the RFC’s evidence standard into a repeatable publication process. It is not legal advice. Automation is allowed only within the fail-closed policies below.

The governing rule is simple: no claim may make a human Beacon appear open unless its applicability, current primary support, dates, and automation proof chain are complete. Publication depends on reproducible source observations and versioned policy, never on a confirmation click.

## Components and responsibilities

- **Source discovery:** a search process or agent proposes official sources. Discovery output has no publication authority.
- **Evidence monitor:** fetches allow-listed official sources, records immutable observations, extracts bounded passages, and fingerprints raw, normalized, and extracted content.
- **Claim extractor:** maps observed passages to structured facts and applicability. Deterministic extraction is preferred; model extraction records model, prompt/schema, and version provenance.
- **Corroboration evaluator:** applies explicit authority, precedence, lineage, conflict, and freshness policy. Extractor agreement and source independence are measured separately.
- **Publication evaluator:** derives route state from the latest complete, action-eligible automation run. It may demote automatically and cannot silently broaden applicability.
- **Proof viewer:** presents the fact, decision reasons, passage, locator, live official URL, immutable fingerprints, observation time, and archived snapshot when available.
- **Release operator:** operates the software and may inspect any proof packet, but does not attest individual facts or unblock them by clicking approval.

Every producer is recorded as provenance: component or model identity, version,
run, policy, inputs, and output hash. A person may audit any result and change
the versioned policy or source configuration through the normal code-review
trail, but personal confidence is not evidence and is not a publication gate.

## Source hierarchy

For human entry and stay gates, use:

1. Destination foreign ministry, immigration authority, or official visa portal.
2. Destination embassy or consulate.
3. Official legal text or binding agreement.
4. Secondary sources only to locate primary evidence.

A source being reachable does not prove that a claim is correct. Count independent publication chains and origin entities, not pages or domains. Mirrors and derivative pages remain one lineage. A conflicting equal- or higher-precedence official source blocks the claim regardless of how many lower-precedence pages agree.

Transport operators and cost observations may support transport and money context. They cannot establish human legal eligibility.

## Candidate intake

Before deep research, record:

- proposed place and ordinary route;
- why it may permit at least 30 lawful days;
- known source authority;
- whether adult and child rules appear discoverable;
- whether the public procedure appears operational;
- obvious ambiguity or volatility.

The candidate is not a Beacon and must not be shown as supported.

## Required human-route claim packet

A mature route needs separate structured claims for:

- Russian nationality eligibility;
- ordinary-passport eligibility;
- route availability or current explicit ineligibility;
- structured stay rule;
- passport presence and validity;
- every required entry/application document;
- adult applicability;
- child applicability across the supported 6–17 range, including threshold differences;
- application-origin and entry-point restrictions;
- mandatory insurance, funds, accommodation, fees, and onward travel;
- effective and expiry dates when published.

Application routes also need current evidence that the procedure is operationally available to applicable applicants. A law describing a procedure is not enough by itself.

## Evidence-contract checklist

For every claim:

1. Use a stable semantic claim ID and correct route subject ID.
2. Record the structured fact before explanatory prose.
3. Limit applicability to what the observed source passage actually covers.
4. Pin the exact page, heading, section, JSON pointer, or normalized span.
5. Preserve the original source title, URL, publisher, language, authority, and derivation lineage.
6. Record observation, freshness, effective, and expiry timestamps.
7. Record supporting and contradicting sources separately.
8. Record unknowns instead of filling gaps by inference.
9. Retain only a short bounded extract in the proof packet; fingerprint the complete observed artifact and archive it when permitted.
10. Record fetcher, normalizer, extractor, model, policy, and run versions.

## Automated baseline and changed-evidence evaluation

The evaluator checks:

- source authority and jurisdiction;
- nationality and ordinary-passport scope;
- whether the rule applies to each adult and child age;
- residence/application-location restrictions;
- entry point and carrier limitations;
- stay-window arithmetic and extension assumptions;
- passport-validity basis;
- all mandatory documents and fees;
- exceptions, footnotes, conflicting pages, and effective dates;
- whether an application process is currently operational;
- whether the structured fact can be rendered with the same values and applicability in RU and EN.

Establish the baseline by writing an immutable proof packet containing the
structured fact and applicability fingerprints, cited locator, bounded extract,
surrounding-context fingerprint, source observation, extraction provenance, and
policy version. A claim is supported only if the complete packet validates.

When the cited fact or context changes, a locator moves or disappears,
extractors disagree, a source becomes unavailable, an authoritative conflict
appears, applicability changes, or a conclusion could broaden a route, the
system fails closed. It records `changed`, `unavailable`, `conflicting`, or
`insufficient` with concrete reason codes and presents an automated diagnostic
packet. Agents may discover sources or run bounded semantic extraction to
produce a new proof packet, but they cannot bypass the same policy and traceability gates.

## Freshness policy

- **Current:** through 8 days after the check.
- **Due:** after 8 days through 14 days. An already published route may remain with a warning, but a candidate cannot be promoted.
- **Stale:** after 14 days or at an explicit exclusive-expiry instant.
- **Contradictory:** authoritative evidence conflicts.
- **Unavailable:** no referenced primary support can currently be retrieved.
- **Unknown/insufficient:** support, extraction, or applicability is incomplete.

Stale, contradictory, unavailable, and insufficient critical claims demote the route. A critical restrictive change triggers immediate automated re-evaluation; it does not wait for the weekly cycle.

## Weekly monitoring

For every published route:

1. Fetch each allow-listed critical primary source and record redirects, headers, timestamps, and raw and normalized fingerprints.
2. Re-find the exact cited fragment and its surrounding exception/footnote context.
3. Compare structured fact and applicability fingerprints with the immutable baseline.
4. Check explicit effective/expiry dates and operational availability for application routes.
5. Record an automatic supported/no-change decision, or quarantine and create one diagnostic proof packet.
6. Run the release checks before publication.

The local pipeline runs with `npm run evidence:monitor`, evaluates its evidence
contracts with `npm run evidence:evaluate`, and displays the resulting source
observations and traceable decisions at `/monitoring` and `/reviews`. A successful
fetch means only that an observation was recorded. Publication authority begins
only with a complete, action-eligible decision whose proof chain validates.

A monitoring outage, blocked response, parse failure, or model disagreement never extends freshness. Four consecutive complete weekly cycles are required before public beta; no cycle requires confirmation by a person.

## Corroboration policy

- One current controlling or official source may support a claim only when its claim-specific authority policy allows one lineage and its complete proof packet validates.
- Otherwise, matching independent official publication chains are required by the contract. Two URLs copied from one publisher or origin remain one lineage.
- Exact agreement between the structured fact, applicability, cited fragments, surrounding context, and extraction policy may establish or renew automated support.
- A relevant change, missing proof link, extractor disagreement, or authoritative conflict blocks renewal and produces a diagnostic packet.
- A restrictive or unresolved change may demote automatically. A relaxing change requires a new claim revision and a fresh complete automation run; it never inherits an older decision.
- Legal and operational support remain separate: a valid e-visa rule does not prove its portal is working.

Show reason codes and evidence counts, not a synthetic “97% true” score. Model confidence may prioritize automated investigation but is never legal truth.

## Community reports

Community participation is useful for “link broken,” “portal unavailable,” “unexpected document requested,” “entry refused,” “experience matched,” and explanation helpfulness. Reports may trigger a refetch, visible operational warning, or urgent automated investigation. They never establish or override legal eligibility, permitted stay, or document requirements.

Collect the minimum structured context needed to investigate: event date, entry point when relevant, and adult/child/household scope. Do not collect names, passport numbers, political reasons, or detailed travel history. Voting requires moderation, abuse controls, and privacy review before implementation.

## Bilingual rendering

The structured fact is the single legal value. RU and EN are explanations of it, not independent conclusions.

Gate-critical values are rendered from structured fields through versioned RU
and EN templates. Block publication if the rendered languages differ on:

- dates, durations, age thresholds, numbers, or currencies;
- required versus optional documents;
- applicability or exceptions;
- guaranteed versus application-dependent outcomes;
- status, uncertainty, or freshness.

Keep original source titles visible. Label any translated title as a translation.
Free-text explanation is non-authoritative. Any caveat that can affect eligibility,
documents, timing, or safety must first be represented as structured data.

## Costs and origins

Each observation names Moscow or Saint Petersburg. Moscow is the UI default. Never reuse or infer an observation across origins.

Record household composition, destination city, observation window/season, currency and exchange-rate date, lower and upper bounds, inclusions, methodology, and sources. Missing travel data is “not estimated,” not zero.

Money never changes human route availability. Legally required funds, insurance, accommodation, and fees still appear in both the requirement explanation and cost calculation.

## Large dogs

Up to two husky-sized dogs are an optional separate track. Until pet evidence is implemented, the only honest non-zero result is “not assessed.”

Future pet research must separate:

- border import rules and veterinary documents;
- transit-country rules;
- carrier acceptance and large-animal capacity;
- local transport;
- accommodation feasibility.

Carrier and accommodation observations are volatile and cannot be presented as guaranteed availability. Pet state never changes human route availability, evidence condition, stay result, or household readiness.

## Correction and withdrawal

If a critical claim may be wrong:

1. Demote or withdraw the route immediately.
2. Preserve the published revision and source packet.
3. Identify all routes sharing the source or evaluator rule.
4. Correct the structured claim and add regression tests.
5. Produce a new claim revision and complete proof packets; run the full automated publication gate.
6. Publish a bilingual correction describing scope and dates.
7. Restore the route only after the complete release gate passes.

Never delete an incorrect historical claim. Mark it superseded and retain the rollback trail.

## Design references

- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) — provenance records distinguish entities, activities, agents, and derivation relationships; Beacons uses the same separation between sources, observations, extractors, decisions, and proof packets.
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) — automation roles, ongoing monitoring, uncertainty, and response to failures must be explicit and documented.
