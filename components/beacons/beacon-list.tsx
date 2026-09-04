import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { placeStatus, routeKindLabel } from "./status";

type Props = {
  places: PlaceView[];
  selectedId: string;
  detailOpen: boolean;
  lang: Lang;
  t: Messages;
  onSelect: (id: string, activator: HTMLButtonElement) => void;
};

export function BeaconList({ places, selectedId, detailOpen, lang, t, onSelect }: Props) {
  return <section className="place-list" aria-labelledby="list-title" data-surface="list">
    <h2 id="list-title" className="eyebrow">{t.listTitle}</h2>
    <div role="list">
      {places.map((place) => {
        const route = place.routes[0];
        const routeLabel = route ? routeKindLabel(route.kind, t) : t.notEstablished;
        return <div role="listitem" key={place.id}>
          <button type="button" className={selectedId === place.id ? "selected" : ""} data-place-id={place.id} data-status={place.evidenceState} aria-haspopup="dialog" aria-expanded={detailOpen && selectedId === place.id} aria-controls="beacon-detail" onClick={(event) => onSelect(place.id, event.currentTarget)}>
            <span className="list-marker" aria-hidden="true" />
            <span><strong>{place.city[lang]}</strong><small>{place.country[lang]} · {routeLabel} · {placeStatus(place, t)}</small></span>
          </button>
        </div>;
      })}
    </div>
  </section>;
}
