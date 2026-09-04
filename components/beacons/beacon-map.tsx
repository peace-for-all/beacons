import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { DepartureOrigin } from "@/lib/domain/departure-links";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { createRegionalMap, MAP_DATASET, MOSCOW_COORDINATES, SAINT_PETERSBURG_COORDINATES } from "@/lib/map/world-map";
import { cameraPoint, ensurePointVisible, INITIAL_MAP_CAMERA, panCamera, type MapCamera, zoomCameraAt } from "@/lib/map/map-camera";
import { layoutMarkerLabels } from "@/lib/map/marker-layout";
import { placeStatus, routeKindLabel } from "./status";

type Props = {
  places: PlaceView[];
  selectedId: string;
  detailOpen: boolean;
  lang: Lang;
  t: Messages;
  camera: MapCamera;
  origin: DepartureOrigin;
  onCameraChange: React.Dispatch<React.SetStateAction<MapCamera>>;
  onSelect: (id: string, activator: HTMLButtonElement) => void;
};
type StageSize = { width: number; height: number };

const INITIAL_STAGE_SIZE: StageSize = { width: 760, height: 620 };
const roundPixel = (value: number) => Math.round(value * 1_000) / 1_000;

function useStageSize() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(INITIAL_STAGE_SIZE);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = stage.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
          setSize({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
        }
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  return { stageRef, size };
}

export function BeaconMap({ places, selectedId, detailOpen, lang, t, camera, origin: departureOrigin, onCameraChange, onSelect }: Props) {
  const { stageRef, size } = useStageSize();
  const map = useMemo(() => createRegionalMap(size.width, size.height), [size]);
  const originCoordinates = departureOrigin === "LED" ? SAINT_PETERSBURG_COORDINATES : MOSCOW_COORDINATES;
  const origin = map.project(originCoordinates);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistance = useRef<number | null>(null);
  const screenPoints = useMemo(() => new Map(places.map((place) => [place.id, cameraPoint(map.project(place.coordinates), camera, size.width, size.height)])), [camera, map, places, size]);
  const originPoint = cameraPoint(origin, camera, size.width, size.height);
  const captionClearance = size.width < 360 ? 190 : size.width < 768 ? 160 : 68;
  const labelLayouts = useMemo(() => new Map(layoutMarkerLabels(
    places.map((place) => ({ id: place.id, ...screenPoints.get(place.id)! })), size.width, size.height, { labelWidth: size.width < 768 ? 118 : 176, labelHeight: 42, edgePadding: size.width < 768 ? 12 : 8, obstacles: [{ left: size.width - 64, top: 0, width: 64, height: 178 }, { left: 0, top: size.height - captionClearance, width: size.width, height: captionClearance }] },
  ).map((layout) => [layout.id, layout])), [captionClearance, places, screenPoints, size]);
  const zoom = (factor: number) => onCameraChange((current) => zoomCameraAt(current, factor, { x: size.width / 2, y: size.height / 2 }, size.width, size.height));
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    onCameraChange((current) => zoomCameraAt(current, factor, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, size.width, size.height));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.18); }
    else if (event.key === "-") { event.preventDefault(); zoom(1 / 1.18); }
    else if (event.key === "Home" || event.key === "0") { event.preventDefault(); onCameraChange(INITIAL_MAP_CAMERA); }
    else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? [0, 40] : event.key === "ArrowDown" ? [0, -40] : event.key === "ArrowLeft" ? [40, 0] : [-40, 0];
      onCameraChange((current) => panCamera(current, delta[0], delta[1], size.width, size.height));
    }
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, a")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      lastPinchDistance.current = Math.hypot(first.x - second.x, first.y - second.y);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      onCameraChange((current) => panCamera(current, event.clientX - previous.x, event.clientY - previous.y, size.width, size.height));
      return;
    }
    // Browser pinch zoom remains available; custom dragging only tracks one pointer.
  };
  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    lastPinchDistance.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    onCameraChange((current) => zoomCameraAt(current, 1.18, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, size.width, size.height));
  };

  return <section className="atlas" aria-labelledby="map-title">
    <h2 className="sr-only" id="map-title">{t.mapTitle}</h2><p className="sr-only" id="map-instructions">{t.mapInstructions}</p>
    <div className={`map-stage ${detailOpen ? "detail-open" : ""}`} data-surface="map" ref={stageRef} tabIndex={0} onWheel={onWheel} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} onDoubleClick={onDoubleClick} aria-label={t.mapTitle} aria-describedby="map-instructions">
      <div className="map-camera" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
      <svg className="map-grid" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        <defs>
          <radialGradient id="sea" cx="52%" cy="40%" r="72%"><stop offset="0%" stopColor="#17344c" stopOpacity=".78" /><stop offset="100%" stopColor="#07131f" stopOpacity=".3" /></radialGradient>
          <filter id="coast-glow"><feGaussianBlur stdDeviation="1.4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#sea)" />
        <path className="map-graticule" d={map.graticulePath} />
        <path className="map-land" d={map.landPath} />
        <path className="map-borders" d={map.borderPath} />
        {places.map((place) => <path className={`route-line ${selectedId === place.id ? "active" : ""}`} d={map.routePath(place.coordinates, originCoordinates)} key={`route.${place.id}`} />)}
      </svg>
      </div>
      <svg className="marker-leaders" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        {[...labelLayouts.values()].flatMap((layout) => layout.leader ? [<line key={layout.id} {...layout.leader} />] : [])}
      </svg>
      <div className="marker-index" role="list">
      {places.map((place) => {
        const point = screenPoints.get(place.id)!;
        const label = labelLayouts.get(place.id)!;
        const status = placeStatus(place, t);
        const unlit = place.publicationState !== "published" || place.evidenceState !== "supported";
        const routeLabel = place.routes[0] ? routeKindLabel(place.routes[0].kind, t) : status;
        return <div role="listitem" key={place.id}><button type="button" className={`beacon-marker ${selectedId === place.id ? "active" : ""} ${unlit ? "candidate" : ""}`} style={{ left: roundPixel(point.x), top: roundPixel(point.y) }} data-place-id={place.id} data-status={place.evidenceState} aria-haspopup="dialog" aria-expanded={detailOpen && selectedId === place.id} aria-controls="beacon-detail" aria-label={`${place.city[lang]}, ${place.country[lang]} — ${routeLabel}; ${status}`} onFocus={() => onCameraChange((current) => ensurePointVisible(current, map.project(place.coordinates), size.width, size.height))} onClick={(event) => onSelect(place.id, event.currentTarget)}><span className="beacon-core"><MapPin size={12} aria-hidden="true" /></span></button>{label.visible && <span className="beacon-label" style={{ left: roundPixel(label.labelX), top: roundPixel(label.labelY) }}><strong>{place.city[lang]}</strong><small>{routeLabel}</small></span>}</div>;
      })}
      </div>
      <div className="origin" style={{ left: roundPixel(originPoint.x), top: roundPixel(originPoint.y) }}><span className="origin-dot" /><p>{t.youAreHere}<br /><small>{departureOrigin === "LED" ? t.originSaintPetersburg : t.originMoscow}</small></p></div>
      <div className="map-controls" aria-label={t.mapControls}><button type="button" aria-label={t.zoomIn} onClick={() => zoom(1.18)}><Plus aria-hidden="true" /></button><button type="button" aria-label={t.zoomOut} onClick={() => zoom(1 / 1.18)}><Minus aria-hidden="true" /></button><button type="button" aria-label={t.resetMap} onClick={() => onCameraChange(INITIAL_MAP_CAMERA)}><RotateCcw aria-hidden="true" /></button></div>
      <p className="map-caption">{t.mapLegalNote} {t.mapCaption} <a href={MAP_DATASET.source}>{t.mapDataSource}</a></p>
    </div>
  </section>;
}
