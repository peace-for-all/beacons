"use client";

import { GitCompareArrows, SlidersHorizontal, X } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages";
import { DEFAULT_DEPARTURE_WINDOW, type DepartureOrigin, type DepartureWindow } from "@/lib/domain/departure-links";

export type RouteFilter = "all" | "visa_free" | "application";
export type ConfidenceFilter = "all" | "checked" | "attention";

export function MapToolbar({
  t, total, shown, routeFilter, confidenceFilter, adultCount, childrenCount, dogCount, origin, departureWindow, pinnedCount, open,
  onOpenChange, onRouteFilter, onConfidenceFilter, onAdultCount, onChildrenCount, onDogCount, onOrigin, onDepartureWindow, onClear, onCompare,
}: {
  t: Messages;
  total: number;
  shown: number;
  routeFilter: RouteFilter;
  confidenceFilter: ConfidenceFilter;
  adultCount: number;
  childrenCount: number;
  dogCount: number;
  origin: DepartureOrigin;
  departureWindow: DepartureWindow;
  pinnedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRouteFilter: (filter: RouteFilter) => void;
  onConfidenceFilter: (filter: ConfidenceFilter) => void;
  onAdultCount: (count: number) => void;
  onChildrenCount: (count: number) => void;
  onDogCount: (count: number) => void;
  onOrigin: (origin: DepartureOrigin) => void;
  onDepartureWindow: (window: DepartureWindow) => void;
  onClear: () => void;
  onCompare: () => void;
}) {
  const count = t.showingOptions.replace("{shown}", String(shown)).replace("{total}", String(total));
  const pinned = t.pinnedCount.replace("{count}", String(pinnedCount));
  return <div className="map-toolbar" aria-label={t.browseOptions}>
    <div className="map-toolbar-buttons">
      <button type="button" className={open ? "active" : ""} aria-expanded={open} aria-controls="map-filter-panel" onClick={() => onOpenChange(!open)}><SlidersHorizontal aria-hidden="true" />{t.filters}<span>{shown}</span></button>
      <button type="button" disabled={pinnedCount === 0} onClick={onCompare}><GitCompareArrows aria-hidden="true" />{pinnedCount > 0 ? pinned : t.compareOptions}</button>
    </div>
    {open && <div className="map-filter-panel" id="map-filter-panel">
      <div className="map-filter-heading"><strong>{t.filters}</strong><button type="button" aria-label={t.closeFilters} onClick={() => onOpenChange(false)}><X aria-hidden="true" /></button></div>
      <label>{t.routeFilter}<select value={routeFilter} onChange={(event) => onRouteFilter(event.target.value as RouteFilter)}><option value="all">{t.allRoutes}</option><option value="visa_free">{t.visaFreeOnly}</option><option value="application">{t.applicationOnly}</option></select></label>
      <label>{t.confidenceFilter}<select value={confidenceFilter} onChange={(event) => onConfidenceFilter(event.target.value as ConfidenceFilter)}><option value="all">{t.anyConfidence}</option><option value="checked">{t.checkedOnly}</option><option value="attention">{t.needsAttention}</option></select></label>
      <fieldset className="household-count-filters"><legend>{t.householdCounts}</legend>
        <label>{t.numberOfAdults}<select value={adultCount} onChange={(event) => onAdultCount(Number(event.target.value))}>{[1, 2].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
        <label>{t.numberOfChildren}<select value={childrenCount} onChange={(event) => onChildrenCount(Number(event.target.value))}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count === 0 ? t.none : count}</option>)}</select></label>
        <label>{t.numberOfDogs}<select value={dogCount} onChange={(event) => onDogCount(Number(event.target.value))}>{[0, 1, 2].map((count) => <option key={count} value={count}>{count === 0 ? t.none : count}</option>)}</select></label>
      </fieldset>
      <p className="household-filter-note">{t.householdCountNote}</p>
      <label>{t.departureOrigin}<select value={origin} onChange={(event) => onOrigin(event.target.value as DepartureOrigin)}><option value="MOW">{t.originMoscow}</option><option value="LED">{t.originSaintPetersburg}</option></select></label>
      <label>{t.departureWindow}<select value={departureWindow} onChange={(event) => onDepartureWindow(event.target.value as DepartureWindow)}><DepartureWindowOptions t={t} /></select></label>
      <p role="status">{count}</p>
      {(routeFilter !== "all" || confidenceFilter !== "all" || adultCount !== 2 || childrenCount > 0 || dogCount > 0 || departureWindow !== DEFAULT_DEPARTURE_WINDOW) && <button type="button" className="clear-filter-button" onClick={onClear}>{t.clearFilters}</button>}
    </div>}
  </div>;
}

export function DepartureWindowOptions({ t }: { t: Messages }) {
  return <><option value="week">{t.departureWindowWeek}</option><option value="month">{t.departureWindowMonth}</option><option value="three_months">{t.departureWindowThreeMonths}</option></>;
}
