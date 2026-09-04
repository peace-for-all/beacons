"use client";

import { Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { DepartureOrigin } from "@/lib/domain/departure-links";
import { evaluateHouseholdCounts, type HouseholdMobilityRule } from "@/lib/domain/household-eligibility";
import { messages, type Lang } from "@/lib/i18n/messages";
import { INITIAL_MAP_CAMERA, type MapCamera } from "@/lib/map/map-camera";
import { BeaconDetailSheet } from "./beacon-detail-sheet";
import { BeaconMap } from "./beacon-map";
import { LocaleSwitch } from "./locale-switch";
import { MapToolbar, type ConfidenceFilter, type RouteFilter } from "./map-toolbar";
import { OptionCompareSheet } from "./option-compare-sheet";
import { SiteNav } from "./site-nav";

export function BeaconsApp({ places, mobilityRules = [], asOf = new Date().toISOString(), lang }: { places: PlaceView[]; mobilityRules?: HouseholdMobilityRule[]; asOf?: string; lang: Lang }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [camera, setCamera] = useState<MapCamera>(INITIAL_MAP_CAMERA);
  const [navOpen, setNavOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [routeFilter, setRouteFilter] = useState<RouteFilter>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [adultCount, setAdultCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [dogCount, setDogCount] = useState(0);
  const [origin, setOrigin] = useState<DepartureOrigin>("MOW");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [pinNotice, setPinNotice] = useState("");
  const lastActivator = useRef<HTMLButtonElement | null>(null);
  const t = messages[lang];
  const mobilityByPlace = useMemo(() => new Map(mobilityRules.map((rule) => [rule.placeId, rule])), [mobilityRules]);
  const selected = places.find((place) => place.id === selectedId) ?? null;
  const visiblePlaces = useMemo(() => places.filter((place) => {
    const route = place.routes[0];
    const routeMatches = routeFilter === "all" || (routeFilter === "visa_free" ? route?.kind === "visa_free" : route?.kind !== "visa_free");
    const claims = place.routes.flatMap((item) => item.claims);
    const confidenceMatches = confidenceFilter === "all" || (confidenceFilter === "checked" ? claims.some((claim) => claim.confidenceState === "current_checked") : claims.some((claim) => claim.confidenceState !== "current_checked"));
    const householdMatches = evaluateHouseholdCounts(place, mobilityByPlace.get(place.id), { adults: adultCount, children: childrenCount, dogs: dogCount }, asOf).eligible;
    return routeMatches && confidenceMatches && householdMatches;
  }), [adultCount, asOf, childrenCount, confidenceFilter, dogCount, mobilityByPlace, places, routeFilter]);
  const pinnedPlaces = pinnedIds.flatMap((id) => { const place = places.find((item) => item.id === id); return place ? [place] : []; });
  const selectPlace = (id: string, activator: HTMLButtonElement) => {
    lastActivator.current = activator;
    setSelectedId(id);
    setDetailOpen(true);
  };
  const closeDetails = () => {
    setDetailOpen(false);
    requestAnimationFrame(() => lastActivator.current?.focus());
  };
  useEffect(() => {
    const raw = window.sessionStorage.getItem("beacons.locale-handoff.v1");
    if (!raw) return;
    window.sessionStorage.removeItem("beacons.locale-handoff.v1");
    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object") return;
      const handoff = value as { selectedId?: unknown; camera?: Partial<MapCamera> };
      const selected = typeof handoff.selectedId === "string" && places.some((place) => place.id === handoff.selectedId) ? handoff.selectedId : null;
      const nextCamera = handoff.camera && [handoff.camera.scale, handoff.camera.x, handoff.camera.y].every((part) => typeof part === "number" && Number.isFinite(part)) ? handoff.camera as MapCamera : null;
      const frame = requestAnimationFrame(() => {
        if (selected) setSelectedId(selected);
        if (nextCamera) setCamera(nextCamera);
      });
      return () => cancelAnimationFrame(frame);
    } catch { /* Invalid device-local handoff starts unselected. */ }
  }, [places]);
  const saveLocaleHandoff = () => {
    try { window.sessionStorage.setItem("beacons.locale-handoff.v1", JSON.stringify({ selectedId, camera })); } catch { /* Navigation remains usable when storage is unavailable. */ }
  };
  const clearFilters = () => { setRouteFilter("all"); setConfidenceFilter("all"); setAdultCount(2); setChildrenCount(0); setDogCount(0); };
  const togglePin = (id: string) => {
    setPinnedIds((current) => {
      if (current.includes(id)) { setPinNotice(""); return current.filter((item) => item !== id); }
      if (current.length >= 3) { setPinNotice(t.pinLimit); return current; }
      setPinNotice(""); return [...current, id];
    });
  };
  return <main className="app-shell" lang={lang}>
    <header className="topbar">
      <a className="brand-home" href={`/${lang}`} aria-label={t.homeLabel}><span className="brand-mark"><Radio size={18} /></span><span className="brand">{lang === "ru" ? "МАЯКИ" : "BEACONS"}</span></a>
      <SiteNav lang={lang} mobileOpen={navOpen} onMobileOpenChange={(open) => { setNavOpen(open); if (open) setFiltersOpen(false); }} />
      <div className="topbar-actions"><LocaleSwitch lang={lang} onNavigate={saveLocaleHandoff} /></div>
    </header>
    <div className="workspace"><h1 className="sr-only">{t.homeHeading}</h1><BeaconMap places={visiblePlaces} selectedId={selected?.id ?? ""} detailOpen={detailOpen} lang={lang} t={t} camera={camera} origin={origin} onCameraChange={setCamera} onSelect={selectPlace} /><MapToolbar t={t} total={places.length} shown={visiblePlaces.length} routeFilter={routeFilter} confidenceFilter={confidenceFilter} adultCount={adultCount} childrenCount={childrenCount} dogCount={dogCount} origin={origin} pinnedCount={pinnedIds.length} open={filtersOpen} onOpenChange={(open) => { setFiltersOpen(open); if (open) setNavOpen(false); }} onRouteFilter={setRouteFilter} onConfidenceFilter={setConfidenceFilter} onAdultCount={setAdultCount} onChildrenCount={setChildrenCount} onDogCount={setDogCount} onOrigin={setOrigin} onClear={clearFilters} onCompare={() => setCompareOpen(true)} />{visiblePlaces.length === 0 && <div className="no-map-results"><p>{t.noMatchingOptions}</p><button type="button" onClick={clearFilters}>{t.clearFilters}</button></div>}</div>
    <BeaconDetailSheet place={detailOpen ? selected : null} mobilityRule={selected ? mobilityByPlace.get(selected.id) : undefined} householdCounts={{ adults: adultCount, children: childrenCount, dogs: dogCount }} asOf={asOf} lang={lang} t={t} origin={origin} onClose={closeDetails} pinned={selected ? pinnedIds.includes(selected.id) : false} onTogglePin={selected ? () => togglePin(selected.id) : undefined} />
    <OptionCompareSheet places={pinnedPlaces} lang={lang} t={t} origin={origin} open={compareOpen} onOpenChange={setCompareOpen} onRemove={togglePin} />
    <div className="selection-status" role="status" aria-live="polite">{pinNotice || (detailOpen && selected ? `${selected.city[lang]} — ${placeStatusForLiveRegion(selected, t)}` : "")}</div>
  </main>;
}

function placeStatusForLiveRegion(place: PlaceView, t: typeof messages.en) {
  if (place.publicationState === "withdrawn") return t.withdrawn;
  if (place.evidenceState === "conflicting") return t.evidenceConflict;
  return place.evidenceState === "supported" ? t.verifiedRoute : t.evidenceIncompleteLong;
}
