"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/useRequireAuth";

type Article = {
  id: number;
  title: string;
  syllabus_category: string;
  order_num: number;
  content: string;
  is_published: boolean;
};

export default function AdminReferencePage() {
  const ready = useRequireAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    apiFetch("/api/reference/admin")
      .then((r) => r.json())
      .then((data) => setArticles(data as Article[]))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleDelete(id: number) {
    if (!confirm("この記事を削除しますか？")) return;
    const res = await apiFetch(`/api/reference/${id}`, { method: "DELETE" });
    if (res.ok) setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← ダッシュボード
          </Link>
          <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">参考書管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">合計 {articles.length} 記事</p>
        </div>
        <Link
          href="/admin/reference/new"
          className="inline-block rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + 新規作成
        </Link>
      </div>

      {loading && <p className="mt-8 text-slate-500 dark:text-slate-400">読み込み中...</p>}

      {!loading && articles.length === 0 && (
        <p className="mt-8 text-slate-500 dark:text-slate-400">記事がまだありません。</p>
      )}

      {!loading && articles.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-left">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">タイトル</th>
                <th className="px-3 py-2">分野</th>
                <th className="px-3 py-2">本文</th>
                <th className="px-3 py-2">公開</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                  <td className="px-3 py-2 max-w-xs">
                    {a.title.length > 40 ? `${a.title.slice(0, 40)}…` : a.title}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{a.syllabus_category}</td>
                  <td className="px-3 py-2">
                    <span className={a.content ? "text-green-600" : "text-slate-400"}>
                      {a.content ? `${a.content.length}字` : "未作成"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      a.is_published
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                      {a.is_published ? "公開" : "非公開"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/reference/${a.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      編集
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(a.id)}
                      className="ml-3 text-red-600 hover:underline dark:text-red-400"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
