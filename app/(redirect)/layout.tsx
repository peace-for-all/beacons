import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Beacons",
  description: "An evidence-first map of viable paths to a new life.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body className="antialiased">{children}</body></html>;
}
