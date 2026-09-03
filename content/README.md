# Beacons authored content

`catalog.json` is the structured assertion boundary. Every record is validated
before build and release. Catalog assertions do not publish themselves: a
Beacon is supported only by a current authoritative automation decision whose
proof path is complete.

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

Search is discovery-only. A search result, snippet, ranking, copied URL, or model confidence score is never evidence. New sources must first enter the catalog with explicit authority and lineage, pass the hardened fetcher, and receive a claim-specific extractor and proof-producing contract. Extractor agreement and source independence are separate: several models reading one publication are still one source lineage.
