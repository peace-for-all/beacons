import Link from "next/link";
import type { Lang } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/routing";

const labels = {
  en: { label: "Project pages", map: "Map", reviews: "Proofs", monitoring: "Monitor", methodology: "Method", changes: "Changes" },
  ru: { label: "Разделы проекта", map: "Карта", reviews: "Доказательства", monitoring: "Мониторинг", methodology: "Методика", changes: "Изменения" },
};

export function SiteNav({ lang }: { lang: Lang }) {
  const text = labels[lang];
  return <nav className="site-nav" aria-label={text.label}>
    <Link href={localizedPath(lang)}>{text.map}</Link>
    <Link href={localizedPath(lang, "/reviews")}>{text.reviews}</Link>
    <Link href={localizedPath(lang, "/monitoring")}>{text.monitoring}</Link>
    <Link href={localizedPath(lang, "/methodology")}>{text.methodology}</Link>
    <Link href={localizedPath(lang, "/changes")}>{text.changes}</Link>
  </nav>;
}
