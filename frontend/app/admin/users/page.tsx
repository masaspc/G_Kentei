"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRequireAdmin } from "../../lib/useRequireAuth";

type User = {
  id: number;
  username: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
};

export default function UsersAdminPage() {
  const me = useRequireAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pwUserId, setPwUserId] = useState<number | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/users");
    if (res.ok) setUsers((await res.json()) as User[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  async function handleCreate() {
    setCreateError(null);
    if (newUsername.trim() === "" || newPassword.length < 6) {
      setCreateError("ユーザー名と 6 文字以上のパスワードが必要です");
      return;
    }
    const res = await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        is_active: true,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      setCreateError(`作成失敗 (${res.status}): ${detail.slice(0, 120)}`);
      return;
    }
    setShowCreate(false);
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    void load();
  }

  async function handleToggleActive(u: User) {
    const res = await apiFetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (res.ok) void load();
  }

  async function handleDelete(u: User) {
    if (!confirm(`${u.username} を削除します。学習履歴も全て消えます。よろしいですか？`)) return;
    const res = await apiFetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) void load();
    else alert(`削除失敗: ${await res.text()}`);
  }

  async function handlePasswordReset() {
    if (pwUserId === null) return;
    setPwError(null);
    if (pwValue.length < 6) {
      setPwError("6 文字以上必要です");
      return;
    }
    const res = await apiFetch(`/api/users/${pwUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwValue }),
    });
    if (!res.ok) {
      setPwError(`更新失敗 (${res.status}): ${await res.text()}`);
      return;
    }
    setPwUserId(null);
    setPwValue("");
  }

  if (!me) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold dark:text-slate-100">ユーザー管理</h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          {showCreate ? "閉じる" : "+ 新規ユーザー"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        非 admin ユーザーは学習機能のみ利用可能。問題・参考書は全ユーザーで共有、学習履歴はユーザーごとに記録されます。
      </p>

      {showCreate && (
        <section className="mt-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="text-sm font-semibold dark:text-slate-200">新規ユーザー作成</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="ユーザー名"
              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="パスワード (6文字以上)"
              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="user">user (一般)</option>
              <option value="admin">admin (管理者)</option>
            </select>
          </div>
          {createError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{createError}</p>
          )}
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            作成
          </button>
        </section>
      )}

      <div className="mt-6 overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">ユーザー名</th>
              <th className="px-3 py-2 text-left">役割</th>
              <th className="px-3 py-2 text-left">状態</th>
              <th className="px-3 py-2 text-left">作成日</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  読み込み中...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 font-mono">{u.id}</td>
                  <td className="px-3 py-2">
                    {u.username}
                    {u.id === me.id && (
                      <span className="ml-2 text-xs text-slate-500">(あなた)</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.role === "admin" ? (
                      <span className="rounded bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                        admin
                      </span>
                    ) : (
                      "user"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.is_active ? (
                      <span className="text-green-700 dark:text-green-400">有効</span>
                    ) : (
                      <span className="text-slate-500">無効</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-3 py-2 space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPwUserId(u.id);
                        setPwValue("");
                        setPwError(null);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      パスワード変更
                    </button>
                    {u.id !== me.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(u)}
                          className="text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          {u.is_active ? "無効化" : "有効化"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(u)}
                          className="text-red-600 hover:underline"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pwUserId !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={() => setPwUserId(null)}
        >
          <div
            className="w-full max-w-sm rounded bg-white dark:bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold dark:text-slate-100">
              パスワード変更 (ID #{pwUserId})
            </h3>
            <input
              type="password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="新しいパスワード (6文字以上)"
              className="mt-3 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2"
            />
            {pwError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pwError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPwUserId(null)}
                className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                className="rounded bg-blue-600 px-3 py-1 text-white"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
