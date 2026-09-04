import { notFound } from "next/navigation";
import { BeaconsApp } from "@/components/beacons/beacons-app";
import { catalog } from "@/lib/content/catalog";
import { latestEvidenceAutomationRun } from "@/lib/content/evidence-automation";
import { householdMobility } from "@/lib/content/household-mobility";
import { projectCatalog } from "@/lib/domain/catalog-view";
import { isLang } from "@/lib/i18n/routing";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const asOf = new Date().toISOString();
  const places = projectCatalog(catalog, asOf, latestEvidenceAutomationRun);
  return <BeaconsApp places={places} mobilityRules={householdMobility.rules} asOf={asOf} lang={lang} />;
}
