import Link from "next/link";
import type { Lang } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/routing";

export function LocaleSwitch({ lang, page = "", onNavigate }: { lang: Lang; page?: string; onNavigate?: () => void }) {
  const targetLang: Lang = lang === "ru" ? "en" : "ru";
  const label = lang === "ru" ? "Switch to English" : "Переключить на русский";
  return <div className="language-switch" aria-label={label}>
    <Link href={localizedPath(targetLang, page)} onClick={onNavigate}>{targetLang.toUpperCase()}</Link>
  </div>;
}
