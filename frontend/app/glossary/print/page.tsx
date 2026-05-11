"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../lib/api";
import { Term, TermListResponse } from "../../lib/term";
import { useRequireAuth } from "../../lib/useRequireAuth";

export default function GlossaryPrintPage() {
  const ready = useRequireAuth();
  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const res = await apiFetch("/api/terms");
      if (res.ok) {
        const data = (await res.json()) as TermListResponse;
        setTerms(data.items);
      }
    })();
  }, [ready]);

  const grouped = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of terms) {
      const key = t.syllabus_category ?? "(分類なし)";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [terms]);

  if (!ready) return null;

  return (
    <main className="print-page mx-auto max-w-3xl px-6 py-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/glossary" className="text-sm text-blue-600 hover:underline">
          ← 用語集
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          印刷 / PDF 保存
        </button>
      </div>

      <h1 className="text-3xl font-bold">G検定 用語チートシート</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {new Date().toLocaleDateString("ja-JP")} 時点・登録{terms.length}語
      </p>

      {grouped.length === 0 ? (
        <p className="mt-6 text-slate-500 dark:text-slate-400">用語がありません。</p>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className="mt-6 break-inside-avoid">
            <h2 className="border-b border-slate-300 dark:border-slate-600 pb-1 text-lg font-semibold">
              {category}
            </h2>
            <dl className="mt-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="break-inside-avoid border-b border-slate-100 dark:border-slate-700 py-2"
                >
                  <dt className="font-semibold">{t.term}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm">
                    {t.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { max-width: 100% !important; padding: 0 !important; }
          body { background: white !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}
