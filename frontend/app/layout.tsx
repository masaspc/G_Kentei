import type { Metadata } from "next";

import "./globals.css";
import { THEME_INIT_SCRIPT } from "./lib/theme";

export const metadata: Metadata = {
  title: "G検定攻略サイト",
  description: "G検定 2026 #4 に向けた個人学習プラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
