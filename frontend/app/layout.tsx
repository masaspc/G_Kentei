import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
