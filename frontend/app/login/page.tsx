"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { API_BASE_URL, setToken } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("ユーザー名またはパスワードが違います");
        return;
      }
      const data = (await res.json()) as { access_token: string };
      setToken(data.access_token);
      router.replace("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="mt-1 text-sm text-slate-600">G検定攻略サイト</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium">ユーザー名</span>
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">パスワード</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
