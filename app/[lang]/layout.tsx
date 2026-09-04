import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicAssetPath } from "@/lib/deployment";
import { isLang, langs } from "@/lib/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const ru = lang === "ru";
  return {
    title: ru ? "Маяки — исследованные возможности" : "Beacons — researched possibilities",
    description: ru ? "Карта исследованных возможностей с частичными, проверяемыми доказательствами; не инструкция для поездки." : "An evidence-first map of researched possibilities with partial, traceable evidence; not travel instructions.",
    other: { "codex-preview": "development" },
    icons: { icon: publicAssetPath("/favicon.svg"), shortcut: publicAssetPath("/favicon.svg") },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <html lang={lang} className="dark"><body className="antialiased">{children}</body></html>;
}
