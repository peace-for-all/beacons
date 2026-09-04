import { CircleHelp, ExternalLink, MapPin, Plane, WalletCards } from "lucide-react";
import Link from "next/link";
import type { PlaceView } from "@/lib/domain/catalog-view";
import { departureLinks, type DepartureOrigin } from "@/lib/domain/departure-links";
import type { HouseholdCountProfile, HouseholdMobilityRule } from "@/lib/domain/household-eligibility";
import { buildRelocationPlan } from "@/lib/domain/relocation-plan";
import { buildTravelDocumentChecklists } from "@/lib/domain/travel-document-checklist";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { EvidencePanel } from "./evidence-panel";
import { CitedFact, FactCitations, makeSourceNumbers } from "./fact-citations";
import { ActionPlanWorkspace } from "./action-plan-workspace";
import { confidenceStatus, routeKindLabel } from "./status";

export function BeaconDetail({ place, mobilityRule, householdCounts = { adults: 2, children: 0, dogs: 0 }, asOf = new Date().toISOString(), lang, t, origin = "MOW", pinned = false, onTogglePin }: { place: PlaceView; mobilityRule?: HouseholdMobilityRule; householdCounts?: HouseholdCountProfile; asOf?: string; lang: Lang; t: Messages; origin?: DepartureOrigin; pinned?: boolean; onTogglePin?: () => void }) {
  const claims = place.routes.flatMap((route) => route.claims);
  const route = place.routes[0];
  const stay = route?.claims.find((claim) => claim.fact.kind === "stay_rule" && !claim.actionQuarantine);
  const unresolved = [...place.unknowns, ...claims.flatMap((claim) => [
    ...(claim.evidenceCondition !== "current" ? claim.limitations : []),
    ...(claim.actionQuarantine ? [claim.actionQuarantine.reason] : []),
  ])];
  const sources = [...new Map(claims.flatMap((claim) => claim.sources).map((source) => [source.id, source])).values()];
  const sourceNumbers = makeSourceNumbers(sources);
  const orderedClaims = [...claims].sort((left, right) => factPriority(left.fact.kind) - factPriority(right.fact.kind));
  const routeClaim = orderedClaims.find((claim) => claim.fact.kind === "route_availability") ?? orderedClaims[0];
  const beforeDeparture = orderedClaims.filter((claim) => ["requirement", "application_timing", "entry_restriction", "per_traveller_application", "fee_rule"].includes(claim.fact.kind));
  const onArrival = orderedClaims.filter((claim) => claim.fact.kind === "arrival_registration");
  const childClaim = orderedClaims.find((claim) => claim.travellerKinds.includes("child") && claim.fact.kind === "traveller_applicability");
  const showChildren = householdCounts.children > 0;
  const showDogs = householdCounts.dogs > 0;
  const mobilityTitle = [
    showChildren ? `${t.childrenCoverage}: ${householdCounts.children}` : "",
    showDogs ? `${t.dogRules}: ${householdCounts.dogs}` : "",
  ].filter(Boolean).join(" · ");
  const headlineConfidence = route ? worstConfidence(route.claims) : undefined;
  const departure = departureLinks(place.id, origin);
  const documentChecklists = buildTravelDocumentChecklists({ place, mobilityRule, household: householdCounts, lang, asOf });
  const relocationPhases = buildRelocationPlan({ place, household: householdCounts, lang });
  const currentCount = claims.filter((claim) => claim.evidenceCondition === "current").length;
  const blockerCount = claims.filter((claim) => claim.evidenceCondition !== "current").length + place.unknowns.length;
  return <aside className="detail" aria-labelledby="detail-title">
    <div className="detail-title"><span className="place-icon"><MapPin size={20} /></span><div><p>{place.country[lang]}</p><h2 id="detail-title">{place.city[lang]}</h2></div></div>
    <section className="detail-safety-banner" aria-label={t.researchOnlyTitle}><strong>{t.researchOnlyTitle}</strong><p>{t.researchOnlyNotice}</p><p>{t.coverageSummary.replace("{current}", String(currentCount)).replace("{total}", String(claims.length))} · {t.blockerSummary.replace("{count}", String(blockerCount))}</p></section>
    <div className="option-headline"><strong>{route ? routeKindLabel(route.kind, t) : t.notEstablished}</strong>{routeClaim && <FactCitations claim={routeClaim} sourceNumbers={sourceNumbers} t={t} />}{headlineConfidence && <span className={`confidence-pill ${headlineConfidence}`}>{confidenceStatus(headlineConfidence, t)}</span>}{onTogglePin && <button type="button" className={`pin-option ${pinned ? "active" : ""}`} aria-pressed={pinned} onClick={onTogglePin}>{pinned ? t.unpinOption : t.pinOption}</button>}</div>
    <ActionPlanWorkspace place={place} household={householdCounts} members={documentChecklists} phases={relocationPhases} lang={lang} t={t} origin={origin} departure={departure} />
    <details className="research-details"><summary>{t.detailsAndSources}</summary><div className="research-details-body">
    <section className="decision-summary" aria-labelledby="decision-summary-title"><h3 id="decision-summary-title">{t.optionAtGlance}</h3><dl><div><dt>{t.routeKind}</dt><dd>{route ? routeKindLabel(route.kind, t) : t.notEstablished}{routeClaim && <FactCitations claim={routeClaim} sourceNumbers={sourceNumbers} t={t} />}</dd></div><div><dt>{t.nominalStay}</dt><dd>{stay ? <CitedFact claim={stay} lang={lang} sourceNumbers={sourceNumbers} t={t} /> : t.notEstablished}{stay && <FactConfidence confidence={stay.confidenceState} t={t} />}</dd></div><div><dt>{t.beforeDeparture}</dt><dd>{beforeDeparture.length ? beforeDeparture.slice(0, 3).map((claim) => <CitedFact key={claim.id} claim={claim} lang={lang} sourceNumbers={sourceNumbers} t={t} className="summary-fact" />) : t.noRequirementCollected}</dd></div><div><dt>{t.onArrival}</dt><dd>{onArrival.length ? onArrival.map((claim) => <CitedFact key={claim.id} claim={claim} lang={lang} sourceNumbers={sourceNumbers} t={t} className="summary-fact" />) : t.noRequirementCollected}</dd></div>{showChildren && <div data-household-category="children"><dt>{t.childrenCoverage}</dt><dd>{childClaim ? <CitedFact claim={childClaim} lang={lang} sourceNumbers={sourceNumbers} t={t} /> : t.childrenNotChecked}</dd></div>}<div><dt>{t.primaryUncertainty}</dt><dd>{place.unknowns[0]?.[lang] ?? t.notEstablished}</dd></div></dl></section>
    {(showChildren || showDogs) && <section className="mobility-rules" aria-labelledby="mobility-rules-title"><h3 id="mobility-rules-title">{mobilityTitle}</h3><p>{t.mobilityRulesNotice}</p><dl>{showChildren && <div data-household-category="children"><dt>{t.childrenCoverage}</dt><dd>{childClaim?.confidenceState === "current_checked" ? t.childrenCountSupported : t.childrenCountNotEstablished}{childClaim && <FactCitations claim={childClaim} sourceNumbers={sourceNumbers} t={t} />}</dd></div>}{showDogs && <div data-household-category="dogs"><dt>{t.dogRules}</dt><dd>{mobilityRule ? <><strong>{mobilityRule.dogCount.status === "supported" && mobilityRule.dogCount.maximum ? t.dogsUpTo.replace("{count}", String(mobilityRule.dogCount.maximum)) : mobilityRule.dogCount.status === "permit_required" ? t.dogsPermitRequired : t.dogCountNotEstablished}</strong><p>{mobilityRule.summary[lang]}</p>{mobilityRule.requirements.length > 0 && <ul>{mobilityRule.requirements.map((item) => <li key={item.en}>{item[lang]}</li>)}</ul>}{mobilityRule.limitations.map((item) => <p className="mobility-limitation" key={item.en}>{item[lang]}</p>)}<p className="mobility-reviewed">{t.reviewedUntil.replace("{date}", new Date(mobilityRule.reviewAfter).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB"))}</p><span className="mobility-source-links">{mobilityRule.sources.map((source, index) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" aria-label={`${t.officialSources} ${index + 1}: ${source.publisher} — ${source.title}`}><span aria-hidden="true">[{index + 1}]</span><span className="sr-only">{source.publisher} — {source.title}</span></a>)}</span></> : t.dogCountNotEstablished}</dd></div>}</dl></section>}
    <p className="authored-fact-notice">{t.authoredFactNotice}</p>
    <section className="known-facts"><h3>{t.whatWeKnow}</h3><ul>{orderedClaims.map((claim) => <li key={claim.id} data-claim-id={claim.id}><div><strong>{claim.summary[lang]}</strong><p><CitedFact claim={claim} lang={lang} sourceNumbers={sourceNumbers} t={t} /></p>{claim.actionQuarantine && <p className="fact-quarantine"><strong>{t.quarantinedFromPlanning}</strong> {claim.actionQuarantine.reason[lang]}</p>}{claim.limitations.length > 0 && <ul className="fact-notes">{claim.limitations.map((note) => <li key={note.en}>{note[lang]}</li>)}</ul>}</div><FactConfidence confidence={claim.confidenceState} t={t} /></li>)}</ul></section>
    <section className="practical-gaps"><article><Plane aria-hidden="true" /><div><h3>{t.practicalDeparture}</h3>{departure ? <><p>{t.arrivalAirport}: <strong>{departure.airport}</strong>. {t.departureNotCollected}</p><a href={departure.flightSearch} target="_blank" rel="noreferrer">{t.searchLiveFlights}<ExternalLink aria-hidden="true" /></a></> : <p>{t.departureNotCollected}</p>}</div></article><article><WalletCards aria-hidden="true" /><div><h3>{t.firstMonthEstimate}</h3><p>{t.estimateNotCollected}</p>{departure && <a href={departure.costGuide} target="_blank" rel="noreferrer">{t.browseCostGuide}<ExternalLink aria-hidden="true" /></a>}</div></article>{departure && <p className="external-search-notice">{t.externalSearchNotice}</p>}</section>
    {unresolved.length > 0 && <section className="unknowns"><h3><CircleHelp size={15} />{t.whatNeedsChecking}</h3><ul>{unresolved.map((item, index) => <li key={`${item.en}.${index}`}>{item[lang]}</li>)}</ul></section>}
    <section className="source-summary" aria-labelledby="source-summary-title"><h3 id="source-summary-title">{t.sourcesForThisRoute}</h3><p>{t.sourceSummaryNotice}</p>{sources.map((source) => <a key={source.id} className={source.relationship} href={source.url} target="_blank" rel="noreferrer"><span>{source.publisher}<small>{source.originalTitle}</small><small className="source-relationship">{source.relationship === "contradicts" ? t.sourceContradicts : t.sourceSupports}</small></span><ExternalLink size={15} aria-hidden="true" /><span className="sr-only">{t.opensNewTab}</span></a>)}</section>
    <Link className="review-link" href={`/${lang}/reviews#${place.id}`}>{t.openProofs}</Link>
    <details className="technical-evidence"><summary>{t.detailsAndSources}</summary><EvidencePanel claims={claims} lang={lang} t={t} /></details>
    </div></details>
  </aside>;
}

function FactConfidence({ confidence, t }: { confidence: PlaceView["routes"][number]["claims"][number]["confidenceState"]; t: Messages }) {
  return <span className={`fact-confidence ${confidence}`}>{confidenceStatus(confidence, t)}</span>;
}

function factPriority(kind: PlaceView["routes"][number]["claims"][number]["fact"]["kind"]) {
  const order = ["route_availability", "stay_rule", "requirement", "application_timing", "per_traveller_application", "fee_rule", "entry_restriction", "arrival_registration", "traveller_applicability", "nationality_eligibility", "passport_type_eligibility", "qualifying_purpose"];
  return order.indexOf(kind) === -1 ? order.length : order.indexOf(kind);
}

function worstConfidence(claims: PlaceView["routes"][number]["claims"]) {
  const order: PlaceView["routes"][number]["claims"][number]["confidenceState"][] = [
    "disputed", "source_unavailable", "stale", "sourced_unchecked", "uncorroborated", "current_checked",
  ];
  return order.find((state) => claims.some((claim) => claim.confidenceState === state));
}
