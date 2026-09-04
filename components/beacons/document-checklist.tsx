"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { MemberTravelChecklist, TravelChecklistItem } from "@/lib/domain/travel-document-checklist";
import type { Lang, Messages } from "@/lib/i18n/messages";

function memberLabel(member: MemberTravelChecklist, t: Messages) {
  const kind = member.kind === "adult" ? t.adult : member.kind === "child" ? t.child : t.dog;
  return `${kind} ${member.index}`;
}

function statusLabel(item: TravelChecklistItem, t: Messages) {
  if (item.status === "required") return t.checklistRequired;
  if (item.status === "may_be_requested") return t.checklistMayBeRequested;
  if (item.status === "recommended") return t.checklistRecommended;
  return "";
}

function uniqueSourceUrls(item: TravelChecklistItem) {
  return [...new Map(item.sources.map((source) => [source.url, source])).values()];
}

export function formatMemberChecklistsForCopy(members: MemberTravelChecklist[], t: Messages) {
  return members.flatMap((member) => [
    memberLabel(member, t),
    ...member.items.flatMap((item) => {
      const status = statusLabel(item, t);
      return [
        `☐ ${item.text}${status ? ` — ${status}` : ""}`,
        ...item.notes.map((note) => `  ${t.checklistNote}: ${note}`),
        ...uniqueSourceUrls(item).map((source) => `  ${t.checklistSource}: ${source.url}`),
      ];
    }),
    "",
  ]).join("\n").trimEnd();
}

export function formatChecklistsForCopy(
  destination: string,
  members: MemberTravelChecklist[],
  t: Messages,
) {
  return [
    `${destination} — ${t.documentChecklistTitle}`,
    "",
    formatMemberChecklistsForCopy(members, t),
  ].join("\n");
}

export function DocumentChecklist({ place, members, lang, t, nested = false }: { place: PlaceView; members: MemberTravelChecklist[]; lang: Lang; t: Messages; nested?: boolean }) {
  const [copied, setCopied] = useState("");
  const destination = `${place.city[lang]}, ${place.country[lang]}`;
  const copy = async (id: string, selected: MemberTravelChecklist[]) => {
    try {
      await writeChecklistToClipboard(formatChecklistsForCopy(destination, selected, t));
      setCopied(id);
    } catch {
      setCopied("error");
    }
  };
  const Heading = nested ? "h5" : "h3";
  return <section className={`document-checklists${nested ? " nested" : ""}`} aria-labelledby="document-checklists-title">
    <div className="document-checklists-heading"><div><Heading id="document-checklists-title">{t.documentChecklistTitle}</Heading><p>{t.documentChecklistNotice}</p></div><button className="icon-copy-button" type="button" aria-label={t.copyAllChecklists} title={t.copyAllChecklists} onClick={() => copy("all", members)}>{copied === "all" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
    <div className="member-checklists">{members.map((member) => <article key={member.id} className="member-checklist">
      <div className="member-checklist-heading"><h4>{memberLabel(member, t)}</h4><button className="icon-copy-button" type="button" aria-label={`${t.copyChecklist}: ${memberLabel(member, t)}`} title={`${t.copyChecklist}: ${memberLabel(member, t)}`} onClick={() => copy(member.id, [member])}>{copied === member.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
      <ul>{member.items.map((item, itemIndex) => {
        const checkboxId = `${place.id}-${member.id}-document-${itemIndex + 1}`;
        const status = statusLabel(item, t);
        return <li key={item.id}><label htmlFor={checkboxId}><input id={checkboxId} type="checkbox" /><span>{item.text}</span></label>{status && <span className={`checklist-status ${item.status}`}>{status}</span>}{item.notes.map((note) => <p key={note} className="checklist-note">{note}</p>)}{item.sources.length > 0 && <span className="checklist-sources">{uniqueSourceUrls(item).map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" aria-label={`${t.officialSources} ${index + 1}: ${source.publisher}`}>[{index + 1}]</a>)}</span>}</li>;
      })}</ul>
    </article>)}</div>
    <p className="checklist-copy-status" role="status" aria-live="polite">{copied === "error" ? t.checklistCopyFailed : copied ? t.checklistCopied : ""}</p>
  </section>;
}

export async function writeChecklistToClipboard(text: string, environment?: { clipboard?: { writeText?: (value: string) => Promise<void> }; document?: Document }) {
  const clipboard = environment ? environment.clipboard : navigator.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return;
    } catch { /* Fall through for browsers or contexts that block the modern API. */ }
  }
  const copyDocument = environment?.document ?? document;
  const field = copyDocument.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  copyDocument.body.appendChild(field);
  field.select();
  const copied = copyDocument.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}
