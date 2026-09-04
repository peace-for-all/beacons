import { notFound } from "next/navigation";
import { MethodologyPage } from "@/components/beacons/localized-pages";
import { isLang, langs } from "@/lib/i18n/routing";

export function generateStaticParams() { return langs.map((lang) => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { return (await params).lang === "ru" ? { title: "Методика — Маяки" } : { title: "Method — Beacons" }; }
export default async function Page({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; if (!isLang(lang)) notFound(); return <MethodologyPage lang={lang} />; }
