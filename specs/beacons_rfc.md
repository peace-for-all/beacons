# RFC: Beacons — evidence and map foundations

> **Direction note (2026-09-03):** [`PLAN.md`](../PLAN.md) is the current product
> roadmap. The map remains source-aware, but unchecked or incomplete information
> may now be displayed with an explicit confidence label. Evidence status no
> longer acts as the sole display gate. The roadmap's independent action state,
> corridor manifest, and complete-pilot definition supersede this RFC's older
> “actionable,” “Open now,” and 30-day-ready language. Every current route is
> research-only.

- **Status:** Historical foundation; normative product direction lives in `PLAN.md`
- **Date:** 2026-09-02
- **Product languages:** Russian and English
- **Initial audience:** Households of one or two adults and exactly two school-age children, all travelling on ordinary Russian passports

## 1. Summary

Beacons is a research browser for possible destinations. Its current catalog
does not establish that a household can enter, travel, remain, or settle safely.
The roadmap defines the evidence and operational packets required before any
route can become actionable for a declared corridor and household.

Its primary job is practical: show real temporary options, explain the document gate, separate money requirements from document requirements, and turn a chosen option into a small plan.

Its second job is emotional but must be proven rather than asserted: demonstrate that a passport is not a moral verdict and that some doors remain open.

Beacons is not a country catalogue, a political map, a friendliness ranking, an emigration consultancy, or a promise that a place will become a permanent home.

## 2. Product thesis

The user may arrive with the belief:

> “The whole world is closed to people from here.”

One verified reachable place is a counterexample. The map makes those counterexamples visible.

Beacons distinguishes three ideas that relocation catalogues often collapse:

1. **Document openness:** can the travelling household legally enter and remain for at least 30 days?
2. **Money distance:** how much cash would the household need for a chosen standard of stay?
3. **Longer-term possibility:** could this temporary landing plausibly lead to a sustainable home through an ordinary residence route?

Money may make a beacon distant. It must never visually turn the country’s document gate into personal rejection.

## 3. Target user

The initial user is an exhausted adult who wants an up-to-date contingency option for herself and the people travelling with her. A representative household may have:

- one adult and two school-age children;
- only a few hundred euros available;
- ordinary Russian passports;
- limited English;
- work that may not transfer cleanly between countries;
- little energy for bureaucracy or open-ended research;
- no immediate decision to emigrate, but a strong need to know that leaving would be possible.

The application must not require the user to justify why particular family members are or are not travelling.

### Definition: travelling household

“Family” means the complete group the user intends to keep together during this option. The UI asks only:

- number of travelling adults;
- number and ages of travelling children.

It does not assume a spouse, ask for a family diagram, or expose absent family members. Country-specific documents involving a non-travelling guardian may be shown only when verified and legally relevant.

### Supported v1 household

A supported v1 household contains exactly two children aged 6–17 inclusive and either one or two travelling adults. The age range is a product boundary for “school-age,” not a universal legal definition. The evaluator uses each child’s whole-year age at the intended entry date and evaluates every traveller independently. If no intended entry date is known, the current age may be used only with a provisional result. Dates of birth are never collected.

Every supported v1 traveller uses an ordinary Russian passport. The unpersonalised map remains available to everyone; the application must clearly label a profile outside this envelope as not yet supported rather than silently approximating it.

### Optional large-dog overlay

V1 may model zero, one, or two husky-sized dogs as a separate pet-travel overlay. A user-requested children/dogs count filter may hide map markers only for the current local exploration; it does not create, extinguish, promote, or demote the underlying human Beacon. Child counts use current child-applicability evidence, and dog counts require a current count-specific official rule. Unknown, unsupported, or overdue count evidence fails closed while the filter is active.

A human route may be verified while dog logistics remain not assessed or operationally uncertain. The count filter establishes only that the published numerical ceiling covers the selected number; veterinary documents, permits, prohibited breeds, carrier acceptance, transit restrictions, and accommodation remain separate requirements. Pet requirements use their own evidence and freshness, and plan steps for dogs appear on a separate track. V1 does not promise that a carrier, route, or property will accept large dogs.

## 4. Desired user outcome

The map is the first experience. No questionnaire may block it.

The following remains a future outcome, not a description of the current build:

1. “These real options currently exist for my travelling household.”
2. “I understand which documents make each door open.”
3. “I understand the approximate money needed for 30 days under different modes.”
4. “I can see the gap between my current money and a chosen option.”
5. “I have one small plan for making that option more executable.”

Building an option is explicitly not the same as deciding to leave.

## 5. Core domain model

### 5.1 Beacon

A **Beacon** is a derived mature state for a place where an ordinary Russian-passport travelling household has a documented ordinary route to lawful entry and a lawful stay of at least 30 days. A place being researched is a **Place candidate**, not an unverified Beacon.

A route may have one of these evidence-backed availability conclusions:

- **Verified ordinary route:** current evidence establishes a qualifying route before a household profile is evaluated;
- **Application route available:** current evidence establishes that an ordinary public procedure is operationally available, without promising approval or admission;
- **Explicitly ineligible:** a current authoritative source establishes ineligibility;
- **Not established:** the system lacks sufficiently current, complete primary-source evidence.

**Open now** is a separate household-readiness result. It may be shown only after every declared adult and child has been evaluated and their declared documents satisfy a verified route.

“Closed” should be used only when a current authoritative source explicitly establishes that the household is ineligible. Lack of research is never rendered as rejection.

Evidence condition, route availability, household readiness, and money distance are independent state axes. No single status field may collapse them.

### 5.2 Ordinary route

A route is ordinary when a typical family can use a public procedure based on commonplace documents and normal administrative fees.

Ordinary routes may include:

- visa-free entry;
- visa on arrival;
- public electronic visa;
- ordinary visitor visa with a public application process.

The following cannot light a Beacon:

- investment or purchased citizenship;
- exceptional-talent adjudication;
- ancestry the user has not declared;
- lotteries;
- prior elite employment;
- a job offer not already held;
- asylum or humanitarian protection inferred from a generic profile.

These may appear later as clearly conditional Home routes, never as evidence that a temporary door is open.

### 5.3 Home

A **Home** is a different object from a Beacon. It represents a documented longer-term residence route with family, work, schooling, and renewal implications.

A place may be:

- a Beacon only;
- a Home candidate only after additional conditions are met;
- both a Beacon and a plausible Home.

Visually, Beacons pulse; Homes use a steady warm area or stable icon.

### 5.4 Hub

A **Hub** is a place that is useful because it connects onward to other places. Istanbul is the motivating example: transport connectivity can make a place strategically useful even when a direct route from the user’s origin to a final destination is absent.

Transport information creates graph edges; it is not a filter that removes a legal Beacon.

The resulting topology may be:

`origin → Beacon/Hub → Beacon → possible Home`

### 5.5 Plan

A **Plan** is a short ordered path that makes one selected Beacon more executable. It may include:

- documents to obtain or renew;
- evidence that remains to be verified;
- minimum money gap;
- optional reserve target;
- one next action suitable for the user’s urgency.

A Plan must not imply that selecting a Beacon constitutes a decision to move.

## 6. Separate gates from information

### 6.1 Document gate

Document eligibility is the only hard gate for Beacon status.

At minimum, the data model must support:

- ordinary passport nationality;
- required passport type and validity;
- visa requirement and application type;
- maximum lawful initial stay;
- required entry documents stated by primary sources;
- applicability to adults and children;
- authoritative source URL;
- source publisher;
- date checked;
- effective date or expiry date when stated;
- evidence status: verified, contradictory, stale, unavailable, or unknown.

### 6.2 Money distance

Money is calculated independently and never changes legal Beacon status.

For a selected household and mode:

`money gap = max(0, required cash range − cash available)`

The UI must show ranges rather than false precision.

The 30-day estimate contains:

- outbound travel;
- accommodation;
- food;
- essential local transport;
- mandatory insurance or administrative payments, where applicable.

V1 travel-cost origins are Moscow and Saint Petersburg, with Moscow selected by default. Every travel observation identifies its origin. A missing Saint Petersburg estimate is shown as not estimated, never inferred from Moscow and never treated as zero. Origin changes money distance and transport context only; it cannot change route availability or Beacon status.

The emergency/return reserve is displayed separately. It is information, not a gate.

### 6.3 Stay modes

Users choose a cost mode. Mode changes the money estimate, not the map of document-open doors.

#### Emergency

- lawful basic roof;
- basic food;
- essential local transport;
- minimum unavoidable fees.

This may be uncomfortable. The product must not moralise: sometimes noodles are better than no option.

#### Basic

- modest private family accommodation;
- ordinary groceries;
- normal local movement;
- essential setup expenses.

#### Soft landing

- Basic mode;
- additional setup costs;
- more flexible accommodation;
- modest breathing room.

#### Optional reserve

Shown separately for every mode. It may include emergency travel, return travel, medical contingencies, or an additional number of days. The methodology must be visible.

### 6.4 Context that must not become a flaky gate

The following may be useful information, but must not remove a Beacon:

- a particular direct flight operating this week;
- anecdotal reports from other families;
- subjective friendliness;
- current popularity;
- social-media sentiment;
- a single landlord, employer, shelter, or transport provider;
- volatile price observations.

Where shown, these fields need a date, source type, uncertainty label, and graceful expiry.

## 7. Map and interaction design

### 7.1 First viewport

The first viewport shows the map immediately, with:

- all currently verified Beacons;
- visually distinct Open now, Buildable, and Not yet verified states;
- a simple EN/RU language switch;
- a visible “checked on” date;
- a short statement: “A passport records an origin. It is not a moral verdict.”

The map must not begin with a marketing hero or lengthy intake form.

The home route has no persistent destination list. Its single semantic marker
collection is the non-geographic destination index: every place remains a named
native button reachable by keyboard, with its evidence state exposed in the
accessible name and in the detail sheet.

### 7.2 Progressive personalisation

The user may optionally add a supported v1 profile with:

- one or two travelling adults;
- exactly two travelling children, each aged 6–17;
- whether every traveller has a valid ordinary travel passport;
- existing visas or residence permits;
- Moscow or Saint Petersburg as the travel-cost origin, defaulting to Moscow;
- available cash;
- Emergency, Basic, or Soft landing mode;
- urgency: now, within 7 days, within 30 days, or building an option;
- zero, one, or two large dogs as an optional, separate logistics overlay.

These inputs produce an overlay. They do not erase the underlying world of open doors.

Profession, language ability, education, savings rate, and employment are deferred until the user asks about Home paths.

### 7.3 Beacon detail

Selecting a Beacon shows:

- exact document route;
- lawful stay duration;
- which declared household documents satisfy it;
- missing commonplace documents;
- 30-day cost ranges by mode;
- optional reserve;
- current money gap;
- source links and checked dates;
- known unknowns;
- hub/onward connections as information;
- a button to build an option plan.

### 7.4 Plan builder

The Plan view uses three horizons:

- **Can do without spending:** gather, scan, verify, translate, or request documents;
- **Can build:** money target and ordinary administrative steps;
- **Ready option:** the smallest fully evidenced path for the travelling household.

It ends with exactly one suggested next action. The user may reveal later actions, but the initial view must not become an exhaustive bureaucracy checklist.

## 8. Public meaning without propaganda

The application has two audiences:

1. Russian-passport families seeking options;
2. outside observers who may otherwise collapse people into the actions of a state.

The product should not claim to know why a country maintains an open route, whether everyone there is welcoming, or whether “the world” holds one unified moral position.

Its public argument is narrower and evidence-based:

- a Russian passport does not make every door closed;
- institutions still distinguish an individual traveller from the issuing state;
- these distinctions can be demonstrated with current primary sources.

The evidence is the rhetoric. The map should avoid adversarial copy, guilt, national exceptionalism, or competition over suffering.

## 9. Evidence and freshness

### 9.1 Source hierarchy

For document gates, use sources in this order:

1. destination-country foreign ministry, immigration authority, or official visa portal;
2. destination-country embassy or consulate;
3. binding bilateral agreement or official legal text;
4. secondary source only to locate a primary source, never as sole evidence for a mature Beacon.

Cost data may use multiple recent sources, but every estimate must expose its methodology and observation date.

Each critical claim is recorded independently, with structured applicability,
supporting and contradicting source references, observed and effective dates,
automation provenance, immutable proof packets, and revision history. A proof
packet links the canonical fact and applicability hashes to the exact bounded
passage, source observation and URL, locator, artifact fingerprints, extractor
and policy versions, and observation time. Source records also identify
publisher, publication chain, and derivation lineage: two URLs copied from one
origin count as one source, not two.

The operating model is **authoritative automation with inspectable proofs**.
Deterministic extraction is preferred. A model may perform bounded semantic
extraction when its identity, version, inputs, structured output, and cited
passage are recorded. Extractor agreement does not increase source independence.
A complete policy evaluation may establish or renew support; a relevant change,
conflict, moved or missing locator, parser disagreement, applicability gap, or
relaxing change fails closed and produces a diagnostic packet. People may inspect
and trace any packet, but confirmation is neither required nor accepted as evidence.
Automation may quarantine or demote immediately; it may not silently broaden a route.

### 9.2 Weekly automated monitoring

Important claims are monitored weekly:

- eligibility of ordinary Russian passports;
- permitted stay length;
- entry document requirements;
- e-visa or ordinary application availability;
- important expiry/effective dates;
- longer-term residence claims displayed under Homes;
- broken or contradictory primary sources.

No-change observations are written to the internal audit trail without requiring
a click. A failed fetch or parse never counts as a successful observation.
Material changes produce a bilingual changelog and a diagnostic proof packet;
ambiguous changes conservatively demote the route until a subsequent automated
run can produce complete support.

Community reports are operational signals, not legal votes. “Source broken,” “portal unavailable,” or “my experience differed” can trigger a refetch, warning, or urgent automated evaluation. Popularity cannot establish nationality eligibility, stay length, or required documents.

### 9.3 Freshness state

Each field carries its own freshness metadata. A page-level date alone is insufficient.

Suggested policy:

- **Current:** checked within 8 days;
- **Due:** 9–14 days;
- **Stale:** more than 14 days or past a stated expiry date;
- **Contradictory:** authoritative sources disagree;
- **Unavailable:** the cited primary source cannot be retrieved.

A stale or contradictory document gate cannot remain a mature lit Beacon. It becomes Not yet verified until resolved. Historical facts remain visible in the audit log.

## 10. Internationalisation

Russian and English are first-class product languages.

Requirements:

- all UI copy, explanations, changelogs, and field labels exist in both languages;
- original source titles and language are preserved;
- summaries are translated, not the legal source itself;
- changing language preserves map state and personal inputs;
- the selected language is remembered on the device;
- missing translation fails visibly during development rather than silently falling back in production.

## 11. Privacy

The first version should not require an account.

Household composition, documents, cash, urgency, saved options, and rejected options remain device-local unless the user explicitly exports them.

The system must not collect:

- political opinions;
- reasons for leaving;
- unnecessary names or dates of birth;
- detailed family relationships;
- names, dates of birth, or dog names;
- browsing history for rejected destinations.

An exported Plan includes only the selected Beacon and fields the user chooses to include.

## 12. Non-goals for the first serious version

- Covering every country superficially;
- recommending “the best country”;
- country rankings or a composite friendliness score;
- proving safety or social acceptance;
- asylum eligibility assessment;
- automatic legal advice;
- job matching;
- school placement;
- community voting on whether a place is friendly;
- requiring a recent anecdote from another Russian family;
- using transport availability as a document gate;
- treating purchased citizenship or exceptional programmes as ordinary options.

## 13. Data model sketch

```ts
type EvidenceState =
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

type Source = {
  id: string;
  url: string;
  publisher: string;
  publisherEntityId: string;
  publicationChainId: string;
  originEntityId: string;
  independenceGroupId: string;
  derivesFromSourceIds: string[];
  precedence: "controlling_law" | "official_rule" | "official_guidance" | "operational_official" | "secondary";
  sourceLanguage: string;
  retrievedAt: string;
  availability: "reachable" | "unavailable";
};

type EvidenceClaim = {
  id: string;
  subjectId: string;
  fact: StructuredClaimFact;
  applicability: ClaimApplicability;
  criticality: "gate" | "explanation" | "context";
  supportingSourceIds: string[]; // discovery/configuration references, not authority by themselves
  contradictingSourceIds: string[];
  effectiveFrom?: string;
  effectiveUntilExclusive?: string;
  revision: number;
};

type EvidenceDecision = {
  id: string;
  claimId: string;
  claimRevision: number;
  outcome: "supported" | "due" | "insufficient" | "unavailable" | "changed" | "conflicting" | "stale";
  publicationEffect: "allow" | "warn" | "block";
  proofPacketIds: string[];
  policyVersion: string;
  evaluatedAt: string;
  currentUntil: string;
  reasonCodes: string[];
};

type EvidenceProofPacket = {
  id: string;
  claimId: string;
  claimRevision: number;
  factSha256: string;
  applicabilitySha256: string;
  sourceId: string;
  observationId: string;
  observedAt: string;
  locator: string;
  extract: string;
  extractSha256: string;
  rawArtifactSha256: string;
  normalizedArtifactSha256: string;
  extractorId: string;
  extractorVersion: string;
  snapshotRef?: string;
  packetSha256: string;
};

type DocumentRoute = {
  id: string;
  kind: "visa_free" | "visa_on_arrival" | "evisa" | "visitor_visa";
  ordinary: boolean;
  publicationState: "candidate" | "published" | "withdrawn";
  claimIds: string[];
};

type Beacon = {
  placeId: string;
  city: LocalisedText;
  country: LocalisedText;
  coordinates: [number, number];
  routes: DocumentRoute[];
  costModels: Record<StayMode, CostRange>;
  optionalReserve: CostRange;
  hubEdges: HubEdge[];
  unknowns: LocalisedText[];
};

type HouseholdProfile = {
  adults: 1 | 2;
  childAges: [number, number]; // each integer 6–17 in v1
  passports: PassportDeclaration[];
  existingVisas: VisaDeclaration[];
  origin: "moscow" | "saint_petersburg";
  cashAvailable?: Money;
  mode?: "emergency" | "basic" | "soft_landing";
  urgency?: "now" | "7_days" | "30_days" | "building_option";
};

type PetPartyProfile = {
  largeDogCount: 0 | 1 | 2;
};
```

This sketch is illustrative. The executable Zod contracts in `lib/domain/schemas.ts` are normative for implementation. Route truth is derived from claim-level evidence; evidence and sources do not live only on the route as the earlier sketch implied. Stay rules must be structured rather than represented solely by `permittedStayDays`.

## 14. Functional requirements

### FR-1: Immediate map

The user can see verified Beacons before providing personal information.

### FR-2: Stable status semantics

The system never equates unknown, stale, or contradictory evidence with a closed door.

### FR-3: Household evaluation

The document evaluator considers every traveller in the supported envelope: one or two adults and exactly two children aged 6–17.

### FR-4: Independent money overlay

Changing cash or stay mode changes money distance but never document openness.

### FR-5: Explainability

Every displayed status is traceable to field-level evidence and a visible rule.

### FR-6: Option plan

The user can build a plan from one Beacon and receive one immediate action.

### FR-7: Local privacy

Personal inputs and saved options remain local by default.

### FR-8: Bilingual parity

Every release passes automated checks for English/Russian key parity.

### FR-9: Freshness

Weekly automated monitoring can demote stale evidence without deleting history.

### FR-10: Hub graph

Transport links can add onward routes without changing document eligibility.

## 15. Acceptance criteria for MVP

The first useful release is done when:

1. At least five practical Beacons have current primary-source document routes.
2. Each Beacon supports one or two adults and exactly two children aged 6–17, all travelling on ordinary Russian passports.
3. Every Beacon supports Emergency and Basic 30-day cost ranges.
4. Optional reserve is separate from required cash.
5. The user can enter household size, document state, cash, mode, and urgency.
6. The map remains visible before and after personalisation.
7. The user can distinguish Verified ordinary route, Application route available, Open now, Explicitly ineligible, and Not established without a composite score.
8. One Beacon can generate a three-horizon option plan ending in one next action.
9. Russian and English interfaces are complete and preserve state across switching.
10. Field-level evidence dates are visible.
11. Weekly monitoring records no-change observations automatically and produces a bilingual changelog only for meaningful changes.
12. No Beacon depends on purchased citizenship, exceptional status, ancestry, a lottery, or an undeclared job offer.
13. Moscow and Saint Petersburg travel estimates are provenance-separated, with Moscow as the default and missing observations never treated as zero.

Large-dog support is a non-blocking stretch goal for the first public beta. If any dog assessment ships, it must satisfy its own evidence gates and must be proven unable to affect human route status.

## 16. Suggested delivery sequence

### Milestone 1: Trustworthy map kernel

- Extract Beacon data from UI code into a versioned schema.
- Implement field-level evidence and freshness.
- Implement independent evidence, route availability, and household-readiness states.
- Add five deeply researched practical Beacons.
- Preserve current bilingual map experience.

### Milestone 2: Household and money overlay

- Add device-local household profile.
- Add Emergency and Basic cost models.
- Add optional Soft landing mode.
- Calculate money ranges, optional reserve, and money gap independently.
- Stretch: add a separate large-dog logistics overlay for up to two dogs without changing human route status.

### Milestone 3: Actionable option plan

- Generate the three plan horizons.
- Add one-next-action behaviour.
- Allow private save and deliberate export.

### Milestone 4: Beacon, Hub, Home graph

- Add transport edges as non-gating information.
- Introduce steady Home candidates with ordinary residence routes.
- Visualise `here → Beacon/Hub → possible Home` without rankings.

### Milestone 5: Public evidence surface

- Add a concise “Why this map exists” page in Russian and English.
- Add a public methodology and changelog.
- Expose aggregate evidence without exposing household profiles.

## 17. Open questions

1. Which five places qualify as the initial deeply researched Beacons?
2. What concrete standard defines “lawful basic roof” in Emergency mode for households with children?
3. Which cost sources are sufficiently reproducible for weekly updates?
4. What redundancy is required for the scheduled monitor, proof store, and incident operator?
5. What minimum verified child-specific information is required before labelling a Beacon family-practical?
6. When does a transport hub deserve its own map symbol rather than an edge?
7. Should users be able to export an option as PDF, Markdown, or both?

## 18. Product principles

1. **The map comes first.** Hope should not be hidden behind intake.
2. **Evidence, not reassurance.** Every light must earn its glow.
3. **Unknown is honest work remaining.** It is not rejection.
4. **Documents and money are different dimensions.** Never collapse them.
5. **An option is not a decision.** Building one restores agency.
6. **The travelling household is the family.** Do not interrogate its shape.
7. **No nonsense cupboard leakage.** Exceptional routes do not masquerade as ordinary doors.
8. **Depth before dot-count.** Five executable paths beat seventy-two decorative country cards.
9. **A passport records an origin, not a moral verdict.** The interface must preserve that dignity.
