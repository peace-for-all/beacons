import { AlertTriangle, CircleHelp, MapPin } from "lucide-react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { EvidencePanel } from "./evidence-panel";
import { placeStatus, routeKindLabel } from "./status";

export function BeaconDetail({ place, lang, t }: { place: PlaceView; lang: Lang; t: Messages }) {
  const claims = place.routes.flatMap((route) => route.claims);
  return <aside className="detail" aria-labelledby="detail-title"><div className="detail-title"><span className="place-icon"><MapPin size={20} /></span><div><p>{place.country[lang]}</p><h2 id="detail-title">{place.city[lang]}</h2></div></div><div className="status-card"><span className="candidate-key" /><div><strong>{placeStatus(place, t)}</strong><small>{place.routes.map((route) => routeKindLabel(route.kind, t)).join(" · ")} · {place.currentAuthoredClaimCount} {t.of} {place.authoredClaimCount} {t.authoredFactsSupported}</small></div></div>{place.evidenceState !== "supported" && <div className="candidate-notice"><AlertTriangle size={18} /><p>{t.candidateNotice}</p></div>}<a className="review-link" href={`/${lang}/reviews#${place.id}`}>{t.openProofs}</a>{place.unknowns.length > 0 && <section className="unknowns"><h3><CircleHelp size={15} />{t.knownUnknowns}</h3><ul>{place.unknowns.map((item) => <li key={item.en}>{item[lang]}</li>)}</ul></section>}<EvidencePanel claims={claims} lang={lang} t={t} /></aside>;
}
