import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { createRegionalMap, MAP_DATASET, MOSCOW_COORDINATES } from "@/lib/map/world-map";
import { INITIAL_MAP_CAMERA, panCamera, zoomCameraAt } from "@/lib/map/map-camera";
import { placeStatus } from "./status";

type Props = { places: PlaceView[]; selectedId: string; lang: Lang; t: Messages; onSelect: (id: string, activator: HTMLButtonElement) => void };
type StageSize = { width: number; height: number };

const INITIAL_STAGE_SIZE: StageSize = { width: 760, height: 620 };

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

export function BeaconMap({ places, selectedId, lang, t, onSelect }: Props) {
  const { stageRef, size } = useStageSize();
  const map = useMemo(() => createRegionalMap(size.width, size.height), [size]);
  const origin = map.project(MOSCOW_COORDINATES);
  const [camera, setCamera] = useState(INITIAL_MAP_CAMERA);
  const zoom = (factor: number) => setCamera((value) => zoomCameraAt(value, factor, { x: size.width / 2, y: size.height / 2 }, size.width, size.height));
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    setCamera((value) => zoomCameraAt(value, factor, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, size.width, size.height));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.18); }
    else if (event.key === "-") { event.preventDefault(); zoom(1 / 1.18); }
    else if (event.key === "Home" || event.key === "0") { event.preventDefault(); setCamera(INITIAL_MAP_CAMERA); }
    else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? [0, 40] : event.key === "ArrowDown" ? [0, -40] : event.key === "ArrowLeft" ? [40, 0] : [-40, 0];
      setCamera((value) => panCamera(value, delta[0], delta[1], size.width, size.height));
    }
  };

  return <section className="atlas" aria-labelledby="map-title">
    <header className="atlas-header"><div><p className="eyebrow" id="map-title">{t.mapTitle}</p><p className="map-count">{places.length} {t.mappedPlaces}</p></div><div className="map-legend"><span className="candidate-key" />{t.evidenceIncompleteLong}</div></header>
    <div className="map-stage" data-surface="map" ref={stageRef} tabIndex={0} onWheel={onWheel} onKeyDown={onKeyDown} aria-label={t.mapTitle}>
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
        {places.map((place) => <path className={`route-line ${selectedId === place.id ? "active" : ""}`} d={map.routePath(place.coordinates)} key={`route.${place.id}`} />)}
      </svg>
      {places.map((place) => {
        const point = map.project(place.coordinates);
        const status = placeStatus(place, t);
        const unlit = place.publicationState !== "published" || place.evidenceState !== "supported";
        const labelLeft = point.x > size.width - 190;
        return <button key={place.id} type="button" className={`beacon-marker ${selectedId === place.id ? "active" : ""} ${unlit ? "candidate" : ""} ${labelLeft ? "label-left" : ""}`} style={{ left: point.x, top: point.y }} data-place-id={place.id} data-status={place.evidenceState} aria-pressed={selectedId === place.id} aria-label={`${place.city[lang]}, ${place.country[lang]} — ${status}`} onClick={(event) => onSelect(place.id, event.currentTarget)}><span className="beacon-core"><MapPin size={12} aria-hidden="true" /></span><span className="beacon-label"><strong>{place.city[lang]}</strong><small>{status}</small></span></button>;
      })}
      <div className="origin" style={{ left: origin.x, top: origin.y }}><span className="origin-dot" /><p>{t.youAreHere}<br /><small>{t.moscow}</small></p></div>
      </div>
      <div className="map-controls" aria-label={t.mapControls}><button type="button" aria-label={t.zoomIn} onClick={() => zoom(1.18)}><Plus aria-hidden="true" /></button><button type="button" aria-label={t.zoomOut} onClick={() => zoom(1 / 1.18)}><Minus aria-hidden="true" /></button><button type="button" aria-label={t.resetMap} onClick={() => setCamera(INITIAL_MAP_CAMERA)}><RotateCcw aria-hidden="true" /></button></div>
      <p className="map-caption">{t.mapCaption} <a href={MAP_DATASET.source}>{t.mapDataSource}</a></p>
    </div>
  </section>;
}
