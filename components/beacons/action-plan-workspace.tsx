"use client";

import { Check, Copy, ExternalLink, FileText, House, Luggage, MapPinned, Plane } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildFirstStayChecks, buildPackingList, type PracticalChecklistItem } from "@/lib/domain/departure-action-plan";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { DepartureOrigin, departureLinks } from "@/lib/domain/departure-links";
import type { HouseholdCountProfile } from "@/lib/domain/household-eligibility";
import type { RelocationPhase } from "@/lib/domain/relocation-plan";
import type { MemberTravelChecklist } from "@/lib/domain/travel-document-checklist";
import { formatStructuredFact } from "@/lib/i18n/format";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { DocumentChecklist, formatMemberChecklistsForCopy, writeChecklistToClipboard } from "./document-checklist";
import { formatRelocationPlanForCopy, RelocationPlan } from "./relocation-plan";
import { routeKindLabel } from "./status";

type ModuleId = "where" | "documents" | "pack" | "travel" | "stay";

function checklist({ items, checked, onChange, t }: { items: PracticalChecklistItem[]; checked: Set<string>; onChange: (id: string, value: boolean) => void; t: Messages }) {
  return <ul className="action-checklist">{items.map((item) => <li key={item.id}>
    <label><input type="checkbox" checked={checked.has(item.id)} onChange={(event) => onChange(item.id, event.currentTarget.checked)} /><span>{item.text}</span></label>
    {item.status !== "confirm" && <small className={item.status}>{t.planningStep}</small>}
  </li>)}</ul>;
}

function linesForChecklist(title: string, items: PracticalChecklistItem[], checked: Set<string>, t: Messages) {
  return [title, ...items.map((item) => `${checked.has(item.id) ? "☑" : "☐"} ${item.text}${item.status !== "confirm" ? ` — ${t.planningStep}` : ""}`)].join("\n");
}

export function formatDepartureActionPlan({ destination, route, stay, uncertainty, members, packing, firstStayChecks, checked, origin, airport, phases, t }: {
  destination: string; route: string; stay: string; uncertainty: string; members: MemberTravelChecklist[]; packing: PracticalChecklistItem[]; firstStayChecks: PracticalChecklistItem[]; checked: Set<string>; origin: string; airport: string; phases: RelocationPhase[]; t: Messages;
}) {
  return [
    `${destination} — ${t.actionPlanTitle}`,
    "",
    `1. ${t.actionWhere}`,
    `${t.actionPlanDestination}: ${destination}`,
    `${t.actionPlanRoute}: ${route}`,
    `${t.actionPlanStay}: ${stay}`,
    `${t.actionPlanBlocker}: ${uncertainty}`,
    "",
    `2. ${t.actionDocuments}`,
    formatMemberChecklistsForCopy(members, t),
    "",
    `3. ${linesForChecklist(t.actionPack, packing, checked, t)}`,
    "",
    `4. ${t.actionTravel}`,
    `${origin} → ${airport}`,
    "",
    `5. ${t.actionFirstStay}`,
    linesForChecklist(t.actionFirstStay, firstStayChecks, checked, t),
    "",
    t.actionPlanCandidateNotice,
    "",
    formatRelocationPlanForCopy(destination, phases, members, t),
  ].join("\n");
}

export function ActionPlanWorkspace({ place, household, members, phases, lang, t, origin, departure }: {
  place: PlaceView; household: HouseholdCountProfile; members: MemberTravelChecklist[]; phases: RelocationPhase[]; lang: Lang; t: Messages; origin: DepartureOrigin; departure: ReturnType<typeof departureLinks>;
}) {
  const [selected, setSelected] = useState<ModuleId>("where");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [copyState, setCopyState] = useState<"" | "copied" | "error">("");
  const route = place.routes[0];
  const stayClaim = route?.claims.find((claim) => claim.fact.kind === "stay_rule" && !claim.actionQuarantine);
  const destination = `${place.city[lang]}, ${place.country[lang]}`;
  const routeText = route ? routeKindLabel(route.kind, t) : t.notEstablished;
  const stayText = stayClaim ? formatStructuredFact(stayClaim.fact, lang) : t.notEstablished;
  const uncertainty = place.unknowns[0]?.[lang] ?? t.notEstablished;
  const packing = buildPackingList(household, lang);
  const firstStayChecks = buildFirstStayChecks(household, lang);
  const documentCount = members.reduce((total, member) => total + member.items.length, 0);
  const originLabel = origin === "MOW" ? t.originMoscow : t.originSaintPetersburg;
  const airport = departure?.airport ?? t.notEstablished;
  const setCheck = (id: string, value: boolean) => setChecked((current) => {
    const next = new Set(current);
    if (value) next.add(id); else next.delete(id);
    return next;
  });
  const copyPlan = async () => {
    try {
      await writeChecklistToClipboard(formatDepartureActionPlan({ destination, route: routeText, stay: stayText, uncertainty, members, packing, firstStayChecks, checked, origin: originLabel, airport, phases, t }));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  const modules: { id: ModuleId; title: string; summary: string; icon: typeof MapPinned }[] = [
    { id: "where", title: t.actionWhere, summary: destination, icon: MapPinned },
    { id: "documents", title: t.actionDocuments, summary: t.actionDocumentsSummary.replace("{people}", String(members.length)).replace("{items}", String(documentCount)), icon: FileText },
    { id: "pack", title: t.actionPack, summary: t.actionPackSummary.replace("{items}", String(packing.length)), icon: Luggage },
    { id: "travel", title: t.actionTravel, summary: t.actionTravelSummary.replace("{origin}", origin).replace("{airport}", airport), icon: Plane },
    { id: "stay", title: t.actionFirstStay, summary: t.actionFirstStaySummary, icon: House },
  ];
  return <section className="action-plan" aria-labelledby="action-plan-title">
    <div className="action-plan-heading"><div><p className="action-plan-kicker">{t.actionPlanDestination}</p><h3 id="action-plan-title">{t.actionPlanTitle}</h3><p>{t.actionPlanNotice}</p></div><button className="icon-copy-button" type="button" aria-label={t.copyFullPlan} title={t.copyFullPlan} onClick={copyPlan}>{copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
    <p className="action-plan-local-note">{t.actionPlanLocalNote}</p>
    <Tabs value={selected} onValueChange={(value) => setSelected(value as ModuleId)} className="action-module-tabs">
      <span className="sr-only" id="action-module-question">{t.actionPlanModuleQuestion}</span>
      <TabsList className="action-module-list" aria-labelledby="action-module-question">{modules.map((module, index) => {
        const Icon = module.icon;
        return <TabsTrigger key={module.id} value={module.id} className="action-module-trigger" data-action-module={module.id}><span className="action-module-index">{index + 1}</span><Icon aria-hidden="true" /><span><strong>{module.title}</strong><small>{module.summary}</small></span></TabsTrigger>;
      })}</TabsList>
      <TabsContent value="where" className="action-module" data-action-panel="where"><h4>{destination}</h4><dl className="action-summary"><div><dt>{t.actionPlanRoute}</dt><dd>{routeText}</dd></div><div><dt>{t.actionPlanStay}</dt><dd>{stayText}</dd></div><div><dt>{t.actionPlanBlocker}</dt><dd>{uncertainty}</dd></div></dl><p className="action-warning">{t.actionPlanCandidateNotice}</p></TabsContent>
      <TabsContent value="documents" className="action-module" data-action-panel="documents"><DocumentChecklist place={place} members={members} lang={lang} t={t} nested /></TabsContent>
      <TabsContent value="pack" className="action-module" data-action-panel="pack"><h4>{t.actionPack}</h4><p>{t.actionPackNotice}</p>{checklist({ items: packing, checked, onChange: setCheck, t })}</TabsContent>
      <TabsContent value="travel" className="action-module" data-action-panel="travel"><h4>{originLabel} → {airport}</h4><p>{t.actionTravelNotice}</p>{departure && <a className="action-external-link" href={departure.flightSearch} target="_blank" rel="noreferrer">{t.searchLiveFlights}<ExternalLink aria-hidden="true" /></a>}</TabsContent>
      <TabsContent value="stay" className="action-module" data-action-panel="stay"><h4>{t.actionFirstStay}</h4><p>{t.actionFirstStayNotice}</p>{departure && <a className="action-external-link" href={departure.staySearch} target="_blank" rel="noreferrer">{t.actionSearchFirstStay}<ExternalLink aria-hidden="true" /></a>}{checklist({ items: firstStayChecks, checked, onChange: setCheck, t })}</TabsContent>
    </Tabs>
    <details className="action-additional"><summary>{t.actionAdditionalSequence}</summary><p>{t.actionAdditionalSequenceNotice}</p><RelocationPlan place={place} phases={phases} members={members} lang={lang} t={t} nested includeDocuments={false} /></details>
    <p className="action-copy-status" role="status" aria-live="polite">{copyState === "error" ? t.checklistCopyFailed : copyState === "copied" ? t.checklistCopied : ""}</p>
  </section>;
}
