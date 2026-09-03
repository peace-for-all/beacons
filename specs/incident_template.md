# Beacons incident record

Copy this file for each incident. Preserve the faulty content/code revision.

## Classification

- Incident ID:
- Severity: `S1 | S2 | availability`
- Detected at (UTC):
- Detected by:
- Incident owner:
- Status: `open | contained | corrected | closed`

### Severity guide

- **S1:** a human route falsely appears open, private household data leaves the browser, or evidence integrity is compromised.
- **S2:** a material cost error, incomplete child detail, misleading translation, broken supporting source, or non-critical stale information.
- **Availability:** the application or an essential evidence surface is unavailable.

## Affected surface

- Route/place/claim IDs:
- App release ID:
- Content release ID:
- Languages affected:
- First potentially affected publication:
- Last known-good app/content revisions:

## User impact

- What could a user have believed or done?
- Which supported household scenarios were affected?
- Could an exported plan contain the bad information?
- Why direct notification is or is not possible:

## Immediate containment

- [ ] Withdraw or demote the affected route/field.
- [ ] Publish a bilingual notice if users may have acted.
- [ ] Freeze related publishing.
- [ ] Preserve sources, fingerprints, logs, and faulty revision.
- [ ] Roll back only to a revision whose evidence is still current.
- [ ] Re-evaluate claims sharing the source, extractor, contract, or evaluator behavior.

Containment timestamp and operator:

## Investigation

- Timeline:
- Trigger:
- Root cause:
- Why automated gates did not stop it:
- Which proof, policy, source, extractor, or evaluator invariant was missing:
- Related claims/routes checked:

## Correction

- Corrected structured value:
- New or changed sources:
- Regression tests:
- Replacement proof packet IDs:
- Automation run, policy, extractor, and evaluator versions:
- Proof-chain validation time:
- Corrected release IDs:
- Public RU/EN correction links:

## Follow-up

- Preventive changes and owners:
- Due dates:
- Evidence handbook/process changes:
- Monitoring or drill changes:
- Closed at (UTC):
- Closure operator:
