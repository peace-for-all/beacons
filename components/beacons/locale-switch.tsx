import Link from "next/link";
import type { Lang } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/routing";

export function LocaleSwitch({ lang, page = "" }: { lang: Lang; page?: string }) {
  return <div className="language-switch" aria-label={lang === "ru" ? "Язык" : "Language"}>
    <Link aria-current={lang === "en" ? "page" : undefined} className={lang === "en" ? "active" : ""} href={localizedPath("en", page)}>EN</Link>
    <Link aria-current={lang === "ru" ? "page" : undefined} className={lang === "ru" ? "active" : ""} href={localizedPath("ru", page)}>RU</Link>
  </div>;
}
