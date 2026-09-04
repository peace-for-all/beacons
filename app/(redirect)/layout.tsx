import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Маяки",
  description: "Карта возможных путей к новой жизни, основанная на доказательствах.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru" className="dark"><body className="antialiased">{children}</body></html>;
}
