"use client";

import { X } from "lucide-react";
import type { PlaceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { BeaconDetail } from "./beacon-detail";

export function BeaconDetailSheet({
  place,
  lang,
  t,
  onClose,
}: {
  place: PlaceView | null;
  lang: Lang;
  t: Messages;
  onClose: () => void;
}) {
  return <Sheet open={Boolean(place)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side="right" showCloseButton={false} className="beacon-detail-sheet">
      <SheetClose className="detail-sheet-close" aria-label={t.closeDetails}>
        <X aria-hidden="true" />
      </SheetClose>
      {place && <BeaconDetail place={place} lang={lang} t={t} />}
    </SheetContent>
  </Sheet>;
}
