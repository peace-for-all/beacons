import type { Lang } from "./messages";

export const langs = ["en", "ru"] as const;

export function isLang(value: string): value is Lang {
  return langs.includes(value as Lang);
}

export function localizedPath(lang: Lang, page = "") {
  return `/${lang}${page}`;
}
