"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, clearToken, getToken } from "./lib/api";

type Me = { username: string };
type Health = { status: string };

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [health, setHealth] = useState<Health>({ status: "loading" });

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    (async () => {
      const meRes = await apiFetch("/api/me");
      if (!meRes.ok) {
        clearToken();
        router.replace("/login");
        return;
      }
      setMe((await meRes.json()) as Me);

      const healthRes = await apiFetch("/api/health");
      if (healthRes.ok) {
        setHealth((await healthRes.json()) as Health);
      } else {
        setHealth({ status: "error" });
      }
    })();
  }, [router]);

  if (!me) return null;

  const examDate = new Date("2026-07-04");
  const daysLeft = Math.ceil(
    (examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">G検定攻略サイト</h1>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{me.username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">試験まで</h2>
        <p className="mt-2 text-4xl font-bold text-blue-600">残り {daysLeft} 日</p>
        <p className="mt-1 text-sm text-slate-500">2026年7月4日 実施</p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">バックエンド接続</h2>
        <p className="mt-2 font-mono text-sm">status: {health.status}</p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/practice"
          className="block rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50"
        >
          <h3 className="font-semibold">一問一答演習</h3>
          <p className="mt-1 text-sm text-slate-600">分野・難易度を選んで演習</p>
        </Link>
        <Link
          href="/admin/questions"
          className="block rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50"
        >
          <h3 className="font-semibold">問題管理</h3>
          <p className="mt-1 text-sm text-slate-600">問題の作成・編集・削除</p>
        </Link>
      </section>
    </main>
  );
}
