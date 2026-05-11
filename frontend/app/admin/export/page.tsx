"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRequireAdmin } from "../../lib/useRequireAuth";

const EXPORTS = [
  { path: "study-logs.csv", label: "学習履歴 (study_logs)" },
  { path: "srs-states.csv", label: "SRS 状態 (srs_states)" },
  { path: "questions.csv", label: "問題 (questions)" },
  { path: "terms.csv", label: "用語 (terms)" },
  { path: "api-usage.csv", label: "API 利用ログ (api_usage_logs)" },
  { path: "exam-sessions.csv", label: "模試セッション (exam_sessions)" },
  { path: "question-notes.csv", label: "問題メモ (question_notes)" },
];

export default function ExportPage() {
  const ready = useRequireAdmin();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadOne(path: string) {
    setError(null);
    setPending(path);
    try {
      const res = await apiFetch(`/api/export/${path}`);
      if (!res.ok) {
        setError(`ダウンロード失敗 (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = path;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPending(null);
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">エクスポート</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        各データセットを CSV (UTF-8 BOM) でダウンロードします。Excel /
        Google Sheets / バックアップ用途。
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-2">
        {EXPORTS.map((e) => (
          <li
            key={e.path}
            className="flex items-center justify-between rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-4 py-3"
          >
            <span>{e.label}</span>
            <button
              type="button"
              onClick={() => void downloadOne(e.path)}
              disabled={pending !== null}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending === e.path ? "取得中..." : "ダウンロード"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
