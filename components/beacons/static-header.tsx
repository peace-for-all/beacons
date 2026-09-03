import Link from "next/link";
import type { Lang } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/routing";
import { LocaleSwitch } from "./locale-switch";
import { SiteNav } from "./site-nav";

export function StaticHeader({ lang, page }: { lang: Lang; page: string }) {
  return <header className="static-header">
    <Link className="static-brand" href={localizedPath(lang)}>{lang === "ru" ? "МАЯКИ" : "BEACONS"}</Link>
    <SiteNav lang={lang} />
    <LocaleSwitch lang={lang} page={page} />
  </header>;
}
