"use client";

import { Radio } from "lucide-react";
import { useRef, useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import { messages, type Lang } from "@/lib/i18n/messages";
import { BeaconDetailSheet } from "./beacon-detail-sheet";
import { BeaconList } from "./beacon-list";
import { BeaconMap } from "./beacon-map";
import { LocaleSwitch } from "./locale-switch";
import { SiteNav } from "./site-nav";

export function BeaconsApp({ places, releaseId, lang }: { places: PlaceView[]; releaseId: string; lang: Lang }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastActivator = useRef<HTMLButtonElement | null>(null);
  const t = messages[lang];
  const selected = places.find((place) => place.id === selectedId) ?? null;
  const incomplete = places.filter((place) => place.evidenceState !== "supported").length;
  const supported = places.filter((place) => place.evidenceState === "supported").length;
  const selectPlace = (id: string, activator: HTMLButtonElement) => {
    lastActivator.current = activator;
    setSelectedId(id);
  };
  const closeDetails = () => {
    setSelectedId(null);
    requestAnimationFrame(() => lastActivator.current?.focus());
  };
  return <main className="app-shell" lang={lang}><header className="topbar"><span className="brand-mark"><Radio size={18} /></span><div><p className="brand">{lang === "ru" ? "МАЯКИ" : "BEACONS"}</p><p className="brand-sub">{t.subtitle}</p></div><SiteNav lang={lang} /><div className="topbar-actions"><span className="release">{releaseId}</span><LocaleSwitch lang={lang} /></div></header><div className="workspace"><section className="intro-panel"><p className="eyebrow">{t.scope}</p><h1>{t.title}</h1><p>{t.intro}</p><div className="ethic-note"><strong>{t.noScore}</strong></div><dl className="summary-counts"><div><dt>{supported}</dt><dd>{t.verified}</dd></div><div><dt>{incomplete}</dt><dd>{t.evidenceIncomplete}</dd></div></dl></section><BeaconList places={places} selectedId={selected?.id ?? ""} lang={lang} t={t} onSelect={selectPlace} /><BeaconMap places={places} selectedId={selected?.id ?? ""} lang={lang} t={t} onSelect={selectPlace} /></div><BeaconDetailSheet place={selected} lang={lang} t={t} onClose={closeDetails} /><div className="selection-status" role="status" aria-live="polite">{selected ? `${selected.city[lang]} — ${placeStatusForLiveRegion(selected, t)}` : ""}</div><footer><p>{t.footer}</p><p>{t.footnote}</p></footer></main>;
}

function placeStatusForLiveRegion(place: PlaceView, t: typeof messages.en) {
  if (place.publicationState === "withdrawn") return t.withdrawn;
  if (place.evidenceState === "conflicting") return t.evidenceConflict;
  return place.evidenceState === "supported" ? t.verifiedRoute : t.evidenceIncompleteLong;
}
