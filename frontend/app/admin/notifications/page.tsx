"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRequireAdmin } from "../../lib/useRequireAuth";

export default function NotificationsPage() {
  const ready = useRequireAdmin();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await apiFetch("/api/notifications/test", { method: "POST" });
      if (res.ok) {
        setTestResult("success");
      } else {
        const detail = await res.text();
        setTestError(`失敗 (${res.status}): ${detail}`);
        setTestResult("error");
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "通信エラー");
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">通知設定</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Discord Webhook を使った通知機能の設定と動作確認ができます。
      </p>

      <section className="mt-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100">Discord Webhook</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            環境変数 <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 py-0.5 text-xs">DISCORD_WEBHOOK_URL</code>{" "}
            にDiscord Webhook URLを設定すると、日次サマリーを受け取れます。
          </p>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 space-y-2">
          <p className="text-sm font-semibold dark:text-slate-200">日次サマリーの自動送信</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            毎日 <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 py-0.5 text-xs">POST /api/notifications/daily-summary</code>{" "}
            を呼び出すことで前日の学習結果をDiscordに送信します。
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            リクエストヘッダーに{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 py-0.5 text-xs">X-Webhook-Secret: &lt;NOTIFICATION_WEBHOOK_SECRET&gt;</code>{" "}
            を含める必要があります。
          </p>
          <div className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
            <pre>{`# cron example (毎朝 9:00 JST = 0:00 UTC)
0 0 * * * curl -s -X POST \\
  -H "X-Webhook-Secret: $NOTIFICATION_WEBHOOK_SECRET" \\
  https://your-domain/api/notifications/daily-summary`}</pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold dark:text-slate-200 mb-2">テスト送信</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Discord Webhook にテストメッセージを送信して設定を確認します。
          </p>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? "送信中..." : "テスト通知を送信"}
          </button>
          {testResult === "success" && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Discordへの送信に成功しました。
            </p>
          )}
          {testResult === "error" && testError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{testError}</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h2 className="text-lg font-semibold dark:text-slate-100">送信されるサマリー例</h2>
        <div className="mt-3 overflow-x-auto rounded bg-slate-900 p-4 text-sm text-slate-100">
          <pre>{`**G検定 日次レポート (2026-05-10)**
昨日の演習: 42 問 / 正解 35 問 (83.3%)
本日のSRS復習待ち: 12 問`}</pre>
        </div>
      </section>
    </main>
  );
}
