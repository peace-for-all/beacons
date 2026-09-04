# Pilot source audit — 2026-09-03

- **Scope:** Phase 3 source check for the provisional Serbia and India pilot targets.
- **Result:** neither route is selected or promotable.
- **Method:** live primary-source reading to identify a correction path; this is
  not an automation observation, proof packet, or publication decision.

## Serbia — insurance

| Source | Current relevant statement | Consequence |
| --- | --- | --- |
| [Serbian MFA: General Entry Requirements](https://www.mfa.gov.rs/en/citizens/travel-serbia/general-entry-requirements) | It says health insurance for the stay is *recommended*, with at least EUR 20,000 cover, while also saying border authorities may ask to inspect proof of paid insurance and a policy. | The existing `required` fact is over-broad. The public page supports a `may_be_requested` document requirement, not a universal mandatory-insurance conclusion. |
| [Serbian MFA: Russia visa regime](https://www.mfa.gov.rs/en/citizens/travel-serbia/visa-regime/ruska-federacija) | Ordinary Russian passport holders need no visa for visits up to 30 days. | This supports the route shape only; it does not resolve insurance, passport validity, or child-specific requirements. |

### Required correction path

1. Live review on 2026-09-03 found the current official Ministry of Interior
   English consolidation of the Law on Foreigners. Article 15(1)(6) makes lack
   of travel medical insurance for the intended stay a refusal ground. This
   supports the structured `entry_may_be_refused_if_missing` conclusion; the MFA's
   `recommended` wording remains a consequential presentation conflict that
   must be explained rather than counted as an independent vote.
2. **Completed in `m8-russia-two-lineage-evidence`:** Article 15 and the MFA
   recommendation now have separate bounded fragments. A reviewed contract
   applies controlling-law precedence only while both fragments and hashes stay
   exact; the MFA discrepancy remains visible and monitored.
3. Claim revision 2 records the refusal-ground effect and MFA wording as a
   limitation. The old contradictory revision remains in history, and the
   Serbia corridor remains a non-activated research target.

## India — 30-day e-tourist fee

| Source | Current relevant statement | Consequence |
| --- | --- | --- |
| [India e-Visa country fee table](https://indianvisaonline.gov.in/evisa/images/Etourist_fee_final.pdf) | The central e-Visa table is dated 09 July 2026. Its Russia row lists USD 0 for both 30-day seasonal columns, and notes a 3% bank charge on applicable fees. | It is a current central official source that conflicts with the retained USD 60 claim. |
| [Embassy of India, Moscow: e-tourist visa](https://www.indianembassy-moscow.gov.in/ru/2017-02-27-21-12-52.php) | The page says USD 60 is charged for each tourist, including children; the page reports a 01 September 2026 update. | It is a current official mission page that conflicts with the central table on the same fee question. |

### Required correction path

1. Add a versioned authority policy for this claim: the central e-Visa fee
   table is the controlling fee schedule only if it explicitly covers the same
   e-tourist product, nationality, and effective period as the Moscow page.
2. Capture a fresh bounded fragment from both pages, including the PDF date and
   Russia row, and preserve both source lineages in the new evidence revision.
3. If scope and effective period match, create a new fee-rule revision using the
   central schedule, retain the Moscow source as a contradiction/exception, and
   require a fresh complete automation run. If they cannot be reconciled at the
   structured-fact level, retain `contradictory`.

## Serbia follow-up — household case boundaries (2026-09-04)

| Source | Reviewed boundary | Consequence |
| --- | --- | --- |
| [Serbian MFA: General Entry Requirements](https://www.mfa.gov.rs/en/citizens/travel-serbia/general-entry-requirements) and [Law on Foreigners](https://mup.gov.rs/wps/wcm/connect/9e10bf1d-79ad-4a50-a8c1-76b6afb0d6e9/Law%2Bon%2BForeigners%2B2023.pdf?CVID=pdNziNy&MOD=AJPERES) | The sources state the sufficient-means gate and the MFA's EUR 50-per-day benchmark, but do not state a separate child amount or a household-pooling rule. | Child-level funds allocation remains unknown; no broader claim was promoted. |
| [Law on Foreigners, Article 111](https://mup.gov.rs/wps/wcm/connect/9e10bf1d-79ad-4a50-a8c1-76b6afb0d6e9/Law%2Bon%2BForeigners%2B2023.pdf?CVID=pdNziNy&MOD=AJPERES) and [Welcome to Serbia: registration upon arrival](https://welcometoserbia.gov.rs/registration-upon-arrival) | Paid accommodation and private hosts register the foreigner within 24 hours; a foreigner using neither arrangement registers their own address. The reviewed text does not publish a child/family batching rule. | Runtime input must identify the arrangement before responsibility is calculated; unknown and mismatched responsibility fail closed. |
| [Russian Consular Department: notarised consent for a minor](https://www.kdmid.ru/cons/notary/certification-of-consent-to-the-departure-of-a-minor-citizen-of-the-Russian-Federation/) and [Moscow Prosecutor: legal representatives and objections](https://epp.genproc.gov.ru/ru/proc_77/activity/legal-education/prokuratura-questions/e2010933/) | The official pages identify parents, adoptive parents, guardians, and custodians as legal representatives; the notarial procedure asks a guardian/custodian for proof of authority. | Roles and case evidence can be collected structurally, but the notarial checklist is not evidence of a general border-carry requirement. |

This follow-up is a live source-reading record, not an automation proof packet
or publication decision. The corridor and route authority states are unchanged.

## Serbia follow-up — departure window (2026-09-04)

The owner supplied an inclusive planning window of 11 September 2026 through 4
January 2027. Air Serbia carrier pages exposed dated Moscow–Belgrade and Saint
Petersburg–Belgrade availability inside that window. Secondary schedule pages
provided segment-level direct-service observations. Turkish Airlines exposed
dated origin-to-Belgrade offers for both origins, while its transfer guidance
describes the international-to-international single-ticket path. The Türkiye
MFA states that a transit visa is not required only when the passenger remains
in the airport transit lounge. The Türkiye Presidency of Migration Management
separately states that foreigners using airport transit areas may still undergo
document checks. The `m10-transit-case-evidence` contract pins both passages as
independent official lineages; it does not prove that a particular booking is
airside or that checked baggage continues to Belgrade.

The resulting records are schedule candidates, not booking or operating
guarantees. The Istanbul alternatives require confirmation of one ticket, the
exact segments, airside transfer, and through-checked baggage. A self-transfer
does not inherit that treatment. The repository monitor could fetch the
Turkish Airlines and Türkiye MFA pages but received HTTP 403 from Air Serbia,
ZborDirect, and Flight.info; those manually reviewed observations therefore
expire after 24 hours and remain `Confirm first`.

## Serbia follow-up — BEG entry point (2026-09-04)

The current 3 September 2026 Serbia/Montenegro AIP supplies a bounded official
chain that the earlier airport-operator and context-specific sources did not.
GEN 1.3 says Serbian entry and departure occur at border stations under the
border-control, foreigners, and travel-document laws. AD 1.1 states that an
airport may be used for international air transport only when state-border
conditions exist and a Government act defines the crossing. AD 1.3 identifies
`BEOGRAD/Nikola Tesla` (`LYBE`, commercial code `BEG`) as `INTL-NTL` with
scheduled use.

The three fragments remain one publication lineage, not three independent
authorities. They establish BEG only as a general Serbian entry point. They do
not guarantee admission, establish operation of a particular flight, or clear
any traveller, booking, transit, funds, document, insurance, accommodation, or
return-ticket condition. The active edition and applicable NOTAM must be
rechecked before travel.

## Non-negotiable gate

This audit does not establish costs, child coverage, passport validity, or
operational application eligibility beyond the specific source passages above.
No UI label, route state, evidence decision, or cost observation may change
from this document alone.
