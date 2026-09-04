import { notFound } from "next/navigation";
import { ChangesPage } from "@/components/beacons/localized-pages";
import { isLang, langs } from "@/lib/i18n/routing";

export function generateStaticParams() { return langs.map((lang) => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { return (await params).lang === "ru" ? { title: "Изменения — Маяки" } : { title: "Changes — Beacons" }; }
export default async function Page({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; if (!isLang(lang)) notFound(); return <ChangesPage lang={lang} />; }
