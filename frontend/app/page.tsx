"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "./components/ThemeToggle";
import { apiFetch, clearToken, getToken } from "./lib/api";
import { DashboardStats } from "./lib/stats";

type Me = { username: string };

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

      const statsRes = await apiFetch("/api/stats/dashboard");
      if (statsRes.ok) setStats((await statsRes.json()) as DashboardStats);
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

  const maxDaily = stats
    ? Math.max(1, ...stats.daily_7d.map((d) => d.attempts))
    : 1;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">G検定攻略サイト</h1>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <ThemeToggle />
          <span className="hidden sm:inline">{me.username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            ログアウト
          </button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            試験まで
          </p>
          <p className="mt-2 text-4xl font-bold text-blue-600">{daysLeft} 日</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">2026年7月4日</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            SRS復習対象
          </p>
          <p className="mt-2 text-4xl font-bold">
            {stats?.due_today ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">本日復習が必要な問題</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            学習ストリーク
          </p>
          <p className="mt-2 text-4xl font-bold">
            {stats?.streak_days ?? "—"} 日
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">連続学習日数</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            累計回答数
          </p>
          <p className="mt-2 text-3xl font-bold">
            {stats?.total_attempts ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            登録問題 {stats?.total_questions ?? "—"} 問
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            累計正答率
          </p>
          <p className="mt-2 text-3xl font-bold">
            {stats ? (stats.overall_accuracy * 100).toFixed(1) : "—"}%
          </p>
        </div>
      </section>

      {stats && stats.daily_7d.length > 0 && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-sm font-semibold">直近7日の回答数</p>
          <div className="mt-3 flex items-end gap-2">
            {stats.daily_7d.map((d) => (
              <div key={d.day} className="flex-1 text-center">
                <div
                  className="mx-auto w-full rounded-t bg-blue-500"
                  style={{
                    height: `${Math.max(4, (d.attempts / maxDaily) * 80)}px`,
                  }}
                  title={`${d.day}: ${d.correct}/${d.attempts}`}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {d.day.slice(5)}
                </p>
                <p className="text-xs font-mono">{d.attempts}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats && stats.weak_categories.length > 0 && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-sm font-semibold">弱点分野トップ 3</p>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.weak_categories.map((c) => (
              <li
                key={c.category}
                className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1"
              >
                <span>{c.category}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {(c.accuracy * 100).toFixed(1)}% ({c.correct}/{c.attempts})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/practice"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">一問一答演習</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">分野・難易度を選んで演習</p>
        </Link>
        <Link
          href="/exam"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">模擬試験</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">本番形式 145問・100分</p>
        </Link>
        <Link
          href="/stats/heatmap"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">弱点ヒートマップ</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            分野 × 難易度の正答率
          </p>
        </Link>
        <Link
          href="/stats/progress"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">学習進捗</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">過去60日の推移と累計</p>
        </Link>
        <Link
          href="/glossary"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">用語集・チートシート</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">用語と定義の検索・管理</p>
        </Link>
        <Link
          href="/admin/questions"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">問題管理</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">問題の作成・編集・削除</p>
        </Link>
        <Link
          href="/admin/api-usage"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">Claude API 利用状況</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">今月のコストと予算</p>
        </Link>
        <Link
          href="/admin/export"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">エクスポート</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">学習履歴を CSV で保存</p>
        </Link>
        <Link
          href="/reference"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">参考書コーナー</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">シラバス分野別の解説記事</p>
        </Link>
        <Link
          href="/admin/notifications"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">通知設定</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Discord Webhook 日次サマリー</p>
        </Link>
      </section>
    </main>
  );
}
