"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "./components/ThemeToggle";
import { apiFetch, clearToken, getToken } from "./lib/api";
import { DashboardStats } from "./lib/stats";

type Me = { username: string };

type StudyTask = {
  title: string;
  description: string;
  reason: string;
  href: string;
  cta: string;
  tone: "blue" | "green" | "orange" | "purple";
};

function practiceHref(params: {
  condition?: string;
  category?: string;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.condition) query.set("condition", params.condition);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));
  return `/practice?${query.toString()}`;
}

function buildTodayTasks(stats: DashboardStats): StudyTask[] {
  const tasks: StudyTask[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const todayAttempts =
    stats.daily_7d.find((d) => d.day === today)?.attempts ?? 0;

  if (stats.due_today > 0) {
    const limit = Math.min(Math.max(stats.due_today, 10), 50);
    tasks.push({
      title: `SRS復習 ${stats.due_today}問`,
      description: "記憶が薄れる前に、復習期限が来た問題を先に片付けます。",
      reason: "本日復習が必要な問題があります",
      href: practiceHref({ condition: "srs_due", limit }),
      cta: "SRS復習を開始",
      tone: "blue",
    });
  }

  const weakest = stats.weak_categories.find((c) => c.accuracy < 0.7);
  if (weakest) {
    tasks.push({
      title: `弱点「${weakest.category}」20問`,
      description: "正答率が低い分野を集中演習して、得点の穴を埋めます。",
      reason: `正答率 ${(weakest.accuracy * 100).toFixed(1)}% (${weakest.correct}/${weakest.attempts})`,
      href: practiceHref({ category: weakest.category, limit: 20 }),
      cta: "弱点演習を開始",
      tone: "orange",
    });
  }

  if (todayAttempts === 0) {
    tasks.push({
      title: "ウォームアップ 10問",
      description: "まずは短い演習で学習ストリークを維持します。",
      reason: "今日はまだ回答記録がありません",
      href: practiceHref({ condition: "all", limit: 10 }),
      cta: "10問だけ解く",
      tone: "green",
    });
  }

  if (stats.total_questions > stats.total_attempts) {
    tasks.push({
      title: "未回答問題 20問",
      description: "未着手の問題を解いて、シラバス全体のカバー率を広げます。",
      reason: `登録 ${stats.total_questions}問 / 累計回答 ${stats.total_attempts}問`,
      href: practiceHref({ condition: "unanswered", limit: 20 }),
      cta: "未回答を解く",
      tone: "purple",
    });
  }

  tasks.push({
    title: "ミニ模試 30問",
    description: "短時間で本番ペースを確認し、時間感覚を鍛えます。",
    reason:
      stats.total_attempts >= 50
        ? "演習量が増えてきたので実戦確認に進めます"
        : "余力がある日に実戦形式へ慣れます",
    href: "/exam?totalQuestions=30",
    cta: "ミニ模試を開始",
    tone: "blue",
  });

  return tasks.slice(0, 4);
}

function taskToneClass(tone: StudyTask["tone"]) {
  switch (tone) {
    case "green":
      return "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40";
    case "orange":
      return "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40";
    case "purple":
      return "border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40";
    default:
      return "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40";
  }
}

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
  const todayTasks = stats ? buildTodayTasks(stats) : [];

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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            2026年7月4日
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            SRS復習対象
          </p>
          <p className="mt-2 text-4xl font-bold">{stats?.due_today ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            本日復習が必要な問題
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            学習ストリーク
          </p>
          <p className="mt-2 text-4xl font-bold">
            {stats?.streak_days ?? "—"} 日
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            連続学習日数
          </p>
        </div>
      </section>

      {todayTasks.length > 0 && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Today&apos;s Plan
              </p>
              <h2 className="text-xl font-bold">今日やるべきこと</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              SRS・弱点・学習量から自動提案
            </p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {todayTasks.map((task, idx) => (
              <article
                key={`${task.title}-${idx}`}
                className={`rounded-lg border p-4 ${taskToneClass(task.tone)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {task.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      理由: {task.reason}
                    </p>
                    <Link
                      href={task.href}
                      className="mt-3 inline-flex rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      {task.cta}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            分野・難易度を選んで演習
          </p>
        </Link>
        <Link
          href="/exam"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">模擬試験</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            本番形式 145問・100分
          </p>
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
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            過去60日の推移と累計
          </p>
        </Link>
        <Link
          href="/glossary"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">用語集・チートシート</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            用語と定義の検索・管理
          </p>
        </Link>
        <Link
          href="/admin/questions"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">問題管理</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            問題の作成・編集・削除
          </p>
        </Link>
        <Link
          href="/admin/api-usage"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">Claude API 利用状況</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            今月のコストと予算
          </p>
        </Link>
        <Link
          href="/admin/export"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">エクスポート</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            学習履歴を CSV で保存
          </p>
        </Link>
        <Link
          href="/reference"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">参考書コーナー</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            シラバス分野別の解説記事
          </p>
        </Link>
        <Link
          href="/admin/notifications"
          className="block rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-slate-700"
        >
          <h3 className="font-semibold">通知設定</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Discord Webhook 日次サマリー
          </p>
        </Link>
      </section>
    </main>
  );
}
