import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { placeStatus } from "./status";

type Props = { places: PlaceView[]; selectedId: string; lang: Lang; t: Messages; onSelect: (id: string, activator: HTMLButtonElement) => void };
export function BeaconList({ places, selectedId, lang, t, onSelect }: Props) {
  return <section className="place-list" aria-labelledby="list-title" data-surface="list"><h2 id="list-title" className="eyebrow">{t.listTitle}</h2>{places.map((place) => <button key={place.id} type="button" className={selectedId === place.id ? "selected" : ""} data-place-id={place.id} data-status={place.evidenceState} aria-pressed={selectedId === place.id} onClick={(event) => onSelect(place.id, event.currentTarget)}><span className="list-marker" /><span><strong>{place.city[lang]}</strong><small>{place.country[lang]} · {placeStatus(place, t)}</small></span></button>)}</section>;
}
