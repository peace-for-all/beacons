import { notFound } from "next/navigation";
import { BeaconsApp } from "@/components/beacons/beacons-app";
import { catalog } from "@/lib/content/catalog";
import { corridorRequirementByRoute } from "@/lib/content/corridor-requirements";
import { latestEvidenceAutomationRun } from "@/lib/content/evidence-automation";
import { householdMobility } from "@/lib/content/household-mobility";
import { journeyGuidance } from "@/lib/content/journey-guidance";
import { projectCatalog } from "@/lib/domain/catalog-view";
import { summarizeDepartureReadiness } from "@/lib/domain/departure-readiness";
import { isLang, langs } from "@/lib/i18n/routing";

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const asOf = new Date().toISOString();
  const places = projectCatalog(catalog, asOf, latestEvidenceAutomationRun);
  const readinessByPlace = Object.fromEntries(places.map((place) => {
    const manifest = corridorRequirementByRoute.get(place.routes[0]?.id ?? "");
    const readinessContext = { operationalRecords: journeyGuidance.operationalRecords, sources: catalog.sources, asOf };
    return [place.id, {
      MOW: summarizeDepartureReadiness(manifest, "moscow", readinessContext),
      LED: summarizeDepartureReadiness(manifest, "saint_petersburg", readinessContext),
    }];
  }));
  return <BeaconsApp places={places} readinessByPlace={readinessByPlace} mobilityRules={householdMobility.rules} asOf={asOf} lang={lang} />;
}
