"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useRequireAuth";

type Article = {
  id: number;
  title: string;
  syllabus_category: string;
  order_num: number;
};

export default function ReferencePage() {
  const ready = useRequireAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    apiFetch("/api/reference")
      .then((r) => r.json())
      .then((data) => setArticles(data as Article[]))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return null;

  const grouped = articles.reduce<Record<string, Article[]>>((acc, a) => {
    (acc[a.syllabus_category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">参考書コーナー</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        シラバス分野別の解説記事。演習と並行して読むことで理解が深まります。
      </p>

      {loading && <p className="mt-8 text-slate-500 dark:text-slate-400">読み込み中...</p>}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="mt-12 text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg">記事がまだありません</p>
          <p className="mt-2 text-sm">管理者メニューから記事を作成してください。</p>
          <Link
            href="/admin/reference"
            className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            記事管理へ
          </Link>
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="mt-8">
          <h2 className="border-b border-slate-200 dark:border-slate-700 pb-2 text-lg font-semibold dark:text-slate-100">
            {category}
          </h2>
          <ul className="mt-3 space-y-2">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/reference/${a.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
                >
                  <span className="text-blue-500 dark:text-blue-400">📖</span>
                  <span className="font-medium dark:text-slate-100">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
