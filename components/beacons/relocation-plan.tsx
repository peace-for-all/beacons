"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { MemberTravelChecklist } from "@/lib/domain/travel-document-checklist";
import type { RelocationPhase, RelocationPhaseId, RelocationTask } from "@/lib/domain/relocation-plan";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { DocumentChecklist, formatMemberChecklistsForCopy, writeChecklistToClipboard } from "./document-checklist";

function phaseTitle(phase: RelocationPhase, t: Messages) {
  if (phase.id === "prepare_local") return t.prepareLocalTitle;
  if (phase.id === "arrange_remote") return t.arrangeRemoteTitle;
  return t.afterArrivalTitle;
}

function phasePosition(phase: RelocationPhase, t: Messages) {
  if (phase.id === "prepare_local") return t.prepareLocalPosition;
  if (phase.id === "arrange_remote") return t.arrangeRemotePosition;
  return t.afterArrivalPosition;
}

function taskStatus(task: RelocationTask, t: Messages) {
  if (task.status === "planning") return t.planningStep;
  if (task.status === "required") return t.routeRequirement;
  return "";
}

function uniqueSources(task: RelocationTask) {
  return [...new Map(task.sources.map((source) => [source.url, source])).values()];
}

function formatPhaseForCopy(phase: RelocationPhase, members: MemberTravelChecklist[], t: Messages) {
  const tasks = phase.tasks.flatMap((task) => {
    const status = taskStatus(task, t);
    return [
      `☐ [${task.timing}] ${task.text}${status ? ` — ${status}` : ""}`,
      ...task.notes.map((note) => `  ${t.checklistNote}: ${note}`),
      ...uniqueSources(task).map((source) => `  ${t.checklistSource}: ${source.url}`),
    ];
  });
  if (phase.id === "prepare_local") tasks.push("", t.documentChecklistTitle, formatMemberChecklistsForCopy(members, t));
  return [`${phaseTitle(phase, t)}`, ...tasks].join("\n");
}

export function formatRelocationPlanForCopy(destination: string, phases: RelocationPhase[], members: MemberTravelChecklist[], t: Messages) {
  return [
    `${destination} — ${t.relocationPlanTitle}`,
    ...phases.flatMap((phase, index) => ["", `${index + 1}. ${formatPhaseForCopy(phase, members, t)}`]),
  ].join("\n");
}

export function RelocationPlan({ place, phases, members, lang, t }: { place: PlaceView; phases: RelocationPhase[]; members: MemberTravelChecklist[]; lang: Lang; t: Messages }) {
  const [copied, setCopied] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<RelocationPhaseId>(phases[0]?.id ?? "prepare_local");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => new Set());
  const destination = `${place.city[lang]}, ${place.country[lang]}`;
  const copy = async (id: string, text: string) => {
    try {
      await writeChecklistToClipboard(text);
      setCopied(id);
    } catch {
      setCopied("error");
    }
  };
  const setTaskComplete = (taskId: string, complete: boolean) => {
    const key = `${place.id}:${taskId}`;
    setCompletedTasks((current) => {
      const next = new Set(current);
      if (complete) next.add(key);
      else next.delete(key);
      return next;
    });
  };
  return <section className="relocation-plan" aria-labelledby="relocation-plan-title">
    <div className="relocation-plan-heading"><div><h3 id="relocation-plan-title">{t.relocationPlanTitle}</h3><p>{t.relocationPlanNotice}</p></div><button className="icon-copy-button" type="button" aria-label={t.copyFullPlan} title={t.copyFullPlan} onClick={() => copy("all", formatRelocationPlanForCopy(destination, phases, members, t))}>{copied === "all" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
    <Tabs className="relocation-stage-tabs" value={selectedPhaseId} onValueChange={(value) => setSelectedPhaseId(value as RelocationPhaseId)}>
      <div className="relocation-stage-prompt"><strong>{t.relocationStageQuestion}</strong><span>{t.relocationStageHint}</span></div>
      <TabsList className="relocation-stage-list" aria-label={t.relocationStageQuestion}>{phases.map((phase, phaseIndex) => <TabsTrigger key={phase.id} className="relocation-stage-trigger" value={phase.id} data-stage-choice={phase.id}>
        <span className="relocation-stage-number">{phaseIndex + 1}</span><span className="relocation-stage-copy"><strong>{phasePosition(phase, t)}</strong><small>{phaseTitle(phase, t)}</small></span>
      </TabsTrigger>)}</TabsList>
      {phases.map((phase, phaseIndex) => {
        const completedCount = phase.tasks.filter((task) => completedTasks.has(`${place.id}:${task.id}`)).length;
        return <TabsContent key={phase.id} className="relocation-phase" value={phase.id} data-phase={phase.id}>
          <div className="relocation-phase-heading"><span>{phaseIndex + 1}</span><div><small>{t.actionsForThisStage}</small><h4>{phaseTitle(phase, t)}</h4><p>{t.stageProgress.replace("{done}", String(completedCount)).replace("{total}", String(phase.tasks.length))}</p></div><button className="icon-copy-button" type="button" aria-label={`${t.copyPhase}: ${phaseTitle(phase, t)}`} title={`${t.copyPhase}: ${phaseTitle(phase, t)}`} onClick={() => copy(phase.id, formatPhaseForCopy(phase, members, t))}>{copied === phase.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
          <ul className="relocation-task-list">{phase.tasks.map((task, taskIndex) => {
            const checkboxId = `${place.id}-${phase.id}-task-${taskIndex + 1}`;
            const checked = completedTasks.has(`${place.id}:${task.id}`);
            const status = taskStatus(task, t);
            return <li key={task.id}><label htmlFor={checkboxId}><input id={checkboxId} type="checkbox" checked={checked} onChange={(event) => setTaskComplete(task.id, event.currentTarget.checked)} /><span><small>{task.timing}</small>{task.text}</span></label>{status && <span className={`relocation-task-status ${task.status}`}>{status}</span>}{task.notes.map((note) => <p key={note}>{note}</p>)}{task.sources.length > 0 && <span className="relocation-task-sources">{uniqueSources(task).map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" aria-label={`${t.officialSources} ${index + 1}: ${source.publisher}`}>[{index + 1}]</a>)}</span>}</li>;
          })}</ul>
          {phase.id === "prepare_local" && <DocumentChecklist place={place} members={members} lang={lang} t={t} nested />}
        </TabsContent>;
      })}
    </Tabs>
    <p className="relocation-copy-status" role="status" aria-live="polite">{copied === "error" ? t.checklistCopyFailed : copied ? t.checklistCopied : ""}</p>
  </section>;
}
