import { notFound } from "next/navigation";
import { BeaconsApp } from "@/components/beacons/beacons-app";
import { catalog } from "@/lib/content/catalog";
import { latestEvidenceAutomationRun } from "@/lib/content/evidence-automation";
import { projectCatalog } from "@/lib/domain/catalog-view";
import { isLang } from "@/lib/i18n/routing";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const places = projectCatalog(catalog, new Date().toISOString(), latestEvidenceAutomationRun);
  return <BeaconsApp places={places} releaseId={catalog.releaseId} lang={lang} />;
}
