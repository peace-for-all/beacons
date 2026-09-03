import { notFound } from "next/navigation";
import { MonitoringPage } from "@/components/beacons/localized-pages";
import { isLang } from "@/lib/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { return (await params).lang === "ru" ? { title: "Мониторинг доказательств — Маяки" } : { title: "Evidence monitoring — Beacons" }; }
export default async function Page({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; if (!isLang(lang)) notFound(); return <MonitoringPage lang={lang} />; }
