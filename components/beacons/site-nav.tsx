"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { messages, type Lang } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/routing";

const destinations = ["", "/reviews", "/monitoring", "/methodology", "/changes"] as const;

export function SiteNav({ lang, page = "", mobileOpen, onMobileOpenChange }: { lang: Lang; page?: string; mobileOpen?: boolean; onMobileOpenChange?: (open: boolean) => void }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = mobileOpen ?? localOpen;
  const trigger = useRef<HTMLButtonElement>(null);
  const t = messages[lang];
  const changeOpen = useCallback((next: boolean) => {
    setLocalOpen(next);
    onMobileOpenChange?.(next);
  }, [onMobileOpenChange]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { changeOpen(false); trigger.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [changeOpen, open]);
  const links = <>{destinations.map((path, index) => <Link key={path || "map"} href={localizedPath(lang, path)} aria-current={page === path ? "page" : undefined} onClick={() => changeOpen(false)}>{t.nav[index]}</Link>)}</>;
  return <>
    <nav className="site-nav site-nav-desktop" aria-label={t.projectPages}>{links}</nav>
    <div className="site-nav-mobile"><button ref={trigger} type="button" aria-label={t.projectPages} aria-haspopup="menu" aria-expanded={open} aria-controls="project-menu" onClick={() => changeOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>{open && <nav id="project-menu" className="site-nav-menu" aria-label={t.projectPages}>{links}</nav>}</div>
  </>;
}
