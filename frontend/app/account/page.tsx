"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "../lib/api";
import { useMe } from "../lib/useRequireAuth";

export default function AccountPage() {
  const me = useMe();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!me) return null;

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    if (newPw.length < 6) {
      setError("新しいパスワードは 6 文字以上必要です");
      return;
    }
    if (newPw !== confirmPw) {
      setError("確認用パスワードが一致しません");
      return;
    }
    setSaving(true);
    const res = await apiFetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    setSaving(false);
    if (!res.ok) {
      const detail = await res.text();
      setError(`更新失敗 (${res.status}): ${detail.slice(0, 120)}`);
      return;
    }
    setMessage("パスワードを変更しました");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">アカウント設定</h1>

      <section className="mt-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">ユーザー名</dt>
          <dd className="col-span-2 dark:text-slate-200">{me.username}</dd>
          <dt className="text-slate-500 dark:text-slate-400">役割</dt>
          <dd className="col-span-2 dark:text-slate-200">
            {me.role === "admin" ? "管理者 (admin)" : "一般ユーザー (user)"}
          </dd>
        </dl>
      </section>

      <section className="mt-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="text-sm font-semibold dark:text-slate-200">パスワード変更</h2>
        <div className="mt-3 space-y-3">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="現在のパスワード"
            className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="新しいパスワード (6文字以上)"
            className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="新しいパスワード (確認)"
            className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "更新中..." : "変更"}
          </button>
        </div>
      </section>
    </main>
  );
}
