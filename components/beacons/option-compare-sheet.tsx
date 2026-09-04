"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { PlaceView } from "@/lib/domain/catalog-view";
import { departureLinks, type DepartureOrigin } from "@/lib/domain/departure-links";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { CitedFact, FactCitations, makeSourceNumbers } from "./fact-citations";
import { confidenceStatus, routeKindLabel } from "./status";

export function OptionCompareSheet({ places, lang, t, origin, open, onOpenChange, onRemove }: { places: PlaceView[]; lang: Lang; t: Messages; origin: DepartureOrigin; open: boolean; onOpenChange: (open: boolean) => void; onRemove: (id: string) => void }) {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setPhone(query.matches);
    update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update);
  }, []);
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side={phone ? "bottom" : "right"} showCloseButton={false} className="compare-sheet">
    <SheetTitle>{t.comparisonTitle}</SheetTitle><SheetClose className="detail-sheet-close" aria-label={t.closeComparison}><X aria-hidden="true" /></SheetClose>
    <p className="compare-safety-note"><strong>{t.researchOnlyTitle}.</strong> {t.researchOnlyNotice}</p>
    {places.length === 0 ? <p className="compare-empty">{t.comparisonEmpty}</p> : <div className="comparison-scroll"><table><thead><tr><th scope="col">{t.routeSummary}</th>{places.map((place) => <th scope="col" key={place.id}><span>{place.city[lang]}</span><small>{place.country[lang]}</small><button type="button" onClick={() => onRemove(place.id)}>{t.unpinOption}</button></th>)}</tr></thead><tbody>
      <CompareRow label={t.routeKind} values={places.map((place) => { const route = place.routes[0]; const claim = route?.claims.find((item) => item.fact.kind === "route_availability") ?? route?.claims[0]; return route ? <>{routeKindLabel(route.kind, t)}{claim && <FactCitations claim={claim} sourceNumbers={placeSourceNumbers(place)} t={t} />}</> : t.notEstablished; })} />
      <CompareRow label={t.nominalStay} values={places.map((place) => { const claim = place.routes[0]?.claims.find((item) => item.fact.kind === "stay_rule" && !item.actionQuarantine); return claim ? <><CitedFact claim={claim} lang={lang} sourceNumbers={placeSourceNumbers(place)} t={t} /><small className="compare-confirm">{t.checklistConfirm}</small></> : t.notEstablished; })} />
      <CompareRow label={t.routeRequirements} values={places.map((place) => { const requirements = place.routes.flatMap((route) => route.claims).filter((claim) => ["requirement", "application_timing", "entry_restriction", "arrival_registration"].includes(claim.fact.kind)); const sourceNumbers = placeSourceNumbers(place); return requirements.length ? <>{requirements.slice(0, 3).map((claim) => <CitedFact key={claim.id} claim={claim} lang={lang} sourceNumbers={sourceNumbers} t={t} className="summary-fact" />)}<small className="compare-confirm">{t.checklistConfirm}</small></> : t.noRequirementCollected; })} />
      <CompareRow label={t.primaryUncertainty} values={places.map((place) => place.unknowns[0]?.[lang] ?? t.notEstablished)} />
      <CompareRow label={t.informationStatus} values={places.map((place) => coverageStatus(place, t))} />
      <CompareRow label={t.practicalDeparture} values={places.map((place) => { const links = departureLinks(place.id, origin); return links ? <><strong>{t.arrivalAirport}: {links.airport}</strong><br /><a href={links.flightSearch} target="_blank" rel="noreferrer">{t.searchLiveFlights}</a></> : t.departureNotCollected; })} />
      <CompareRow label={t.firstMonthEstimate} values={places.map((place) => { const links = departureLinks(place.id, origin); return links ? <><span>{t.estimateNotCollected}</span><br /><a href={links.costGuide} target="_blank" rel="noreferrer">{t.browseCostGuide}</a></> : t.estimateNotCollected; })} />
    </tbody></table></div>}
  </SheetContent></Sheet>;
}

function CompareRow({ label, values }: { label: string; values: ReactNode[] }) {
  return <tr><th scope="row">{label}</th>{values.map((value, index) => <td key={`${label}.${index}`}>{value}</td>)}</tr>;
}

function placeSourceNumbers(place: PlaceView) {
  const sources = [...new Map(place.routes.flatMap((route) => route.claims).flatMap((claim) => claim.sources).map((source) => [source.id, source])).values()];
  return makeSourceNumbers(sources);
}

function coverageStatus(place: PlaceView, t: Messages) {
  const claims = place.routes.flatMap((route) => route.claims);
  const current = claims.filter((claim) => claim.evidenceCondition === "current").length;
  const unresolved = claims.filter((claim) => claim.evidenceCondition !== "current" || claim.actionQuarantine).length + place.unknowns.length;
  const worst = (["disputed", "source_unavailable", "stale", "sourced_unchecked", "uncorroborated"] as const)
    .find((state) => claims.some((claim) => claim.confidenceState === state));
  return <><strong>{t.coverageSummary.replace("{current}", String(current)).replace("{total}", String(claims.length))}</strong><br /><span>{t.blockerSummary.replace("{count}", String(unresolved))}</span>{worst && <><br /><span>{confidenceStatus(worst, t)}</span></>}</>;
}
