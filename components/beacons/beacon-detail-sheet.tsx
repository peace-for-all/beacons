"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import type { DepartureOrigin } from "@/lib/domain/departure-links";
import type { HouseholdCountProfile, HouseholdMobilityRule } from "@/lib/domain/household-eligibility";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BeaconDetail } from "./beacon-detail";

export function BeaconDetailSheet({
  place,
  mobilityRule,
  householdCounts,
  asOf,
  lang,
  t,
  onClose,
  pinned,
  onTogglePin,
  origin,
}: {
  place: PlaceView | null;
  mobilityRule?: HouseholdMobilityRule;
  householdCounts: HouseholdCountProfile;
  asOf: string;
  lang: Lang;
  t: Messages;
  onClose: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  origin?: DepartureOrigin;
}) {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setPhone(query.matches);
    update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update);
  }, []);
  if (place && !phone) return <div id="beacon-detail" className="beacon-detail-sheet beacon-detail-dock" role="region" aria-label={place.city[lang]}>
    <button type="button" className="detail-sheet-close" aria-label={t.closeDetails} onClick={onClose}>
      <X aria-hidden="true" />
    </button>
    <BeaconDetail place={place} mobilityRule={mobilityRule} householdCounts={householdCounts} asOf={asOf} lang={lang} t={t} origin={origin} pinned={pinned} onTogglePin={onTogglePin} />
  </div>;
  return <Sheet open={Boolean(place)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent id="beacon-detail" side="bottom" showCloseButton={false} className="beacon-detail-sheet">
      {place && <SheetTitle className="sr-only">{place.city[lang]}</SheetTitle>}
      <SheetClose className="detail-sheet-close" aria-label={t.closeDetails}>
        <X aria-hidden="true" />
      </SheetClose>
      {place && <BeaconDetail place={place} mobilityRule={mobilityRule} householdCounts={householdCounts} asOf={asOf} lang={lang} t={t} origin={origin} pinned={pinned} onTogglePin={onTogglePin} />}
    </SheetContent>
  </Sheet>;
}
