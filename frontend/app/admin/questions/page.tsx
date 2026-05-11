"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { Question, QuestionListResponse } from "../../lib/question";
import { useRequireAdmin } from "../../lib/useRequireAuth";

const PAGE_SIZE = 20;

export default function QuestionsAdminPage() {
  const ready = useRequireAdmin();
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    const res = await apiFetch(`/api/questions?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as QuestionListResponse;
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function handleDelete(id: number) {
    if (!confirm(`#${id} を削除しますか？`)) return;
    const res = await apiFetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) void load();
  }

  if (!ready) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← ダッシュボード
          </Link>
          <h1 className="mt-1 text-2xl font-bold">問題管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">合計 {total} 問</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/questions/bulk-generate"
            className="rounded border border-purple-300 dark:border-purple-600 px-4 py-2 font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
          >
            Claude で一括生成
          </Link>
          <Link
            href="/admin/questions/import"
            className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2 font-semibold hover:bg-slate-100 dark:bg-slate-700"
          >
            インポート
          </Link>
          <Link
            href="/admin/questions/new"
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            + 新規作成
          </Link>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="問題文を検索..."
          className="flex-1 rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2 hover:bg-slate-100 dark:bg-slate-700"
        >
          検索
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-left">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">問題</th>
            <th className="px-3 py-2">分野</th>
            <th className="px-3 py-2">難易度</th>
            <th className="px-3 py-2">公開</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                読み込み中...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                問題がありません
              </td>
            </tr>
          ) : (
            items.map((q) => (
              <tr key={q.id} className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2 font-mono">{q.id}</td>
                <td className="px-3 py-2">
                  {q.question_text.length > 60
                    ? `${q.question_text.slice(0, 60)}…`
                    : q.question_text}
                </td>
                <td className="px-3 py-2">{q.syllabus_category}</td>
                <td className="px-3 py-2">{q.difficulty}</td>
                <td className="px-3 py-2">{q.is_active ? "○" : "×"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(q.id)}
                    className="ml-3 text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 disabled:opacity-50"
        >
          前へ
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 disabled:opacity-50"
        >
          次へ
        </button>
      </div>
    </main>
  );
}
