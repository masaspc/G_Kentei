"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/useRequireAuth";

type ModelBreakdown = {
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cost_usd: string;
};

type PurposeBreakdown = {
  purpose: string;
  calls: number;
  cost_usd: string;
};

type DailyCost = {
  day: string;
  cost_usd: string;
};

type Summary = {
  month_cost_usd: string;
  budget_usd: string;
  budget_used_ratio: number;
  by_model: ModelBreakdown[];
  by_purpose: PurposeBreakdown[];
  daily_30d: DailyCost[];
};

const JPY_PER_USD = 150;

function formatUSD(value: string): string {
  return `$${Number(value).toFixed(4)}`;
}

function formatJPY(value: string): string {
  return `約 ${Math.round(Number(value) * JPY_PER_USD)} 円`;
}

export default function ApiUsagePage() {
  const ready = useRequireAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const res = await apiFetch("/api/api-usage/summary");
      if (res.ok) setSummary((await res.json()) as Summary);
    })();
  }, [ready]);

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Claude API 利用状況</h1>

      {!summary ? (
        <p className="mt-6">読み込み中...</p>
      ) : (
        <>
          <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">今月の利用額</h2>
            <p className="mt-2 text-3xl font-bold">
              {formatUSD(summary.month_cost_usd)}{" "}
              <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                / 予算 {formatUSD(summary.budget_usd)}
              </span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatJPY(summary.month_cost_usd)} / 予算{" "}
              {formatJPY(summary.budget_usd)}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full ${
                  summary.budget_used_ratio >= 1
                    ? "bg-red-500"
                    : summary.budget_used_ratio >= 0.8
                      ? "bg-orange-500"
                      : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(100, summary.budget_used_ratio * 100)}%`,
                }}
              />
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">モデル別</h2>
            {summary.by_model.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">利用なし</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-left">
                  <tr>
                    <th className="py-1 pr-3">モデル</th>
                    <th className="py-1 pr-3">呼出数</th>
                    <th className="py-1 pr-3">入力</th>
                    <th className="py-1 pr-3">出力</th>
                    <th className="py-1 pr-3">キャッシュ</th>
                    <th className="py-1 pr-3">コスト</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_model.map((m) => (
                    <tr key={m.model} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-1 pr-3 font-mono">{m.model}</td>
                      <td className="py-1 pr-3">{m.calls}</td>
                      <td className="py-1 pr-3">{m.input_tokens}</td>
                      <td className="py-1 pr-3">{m.output_tokens}</td>
                      <td className="py-1 pr-3">{m.cached_input_tokens}</td>
                      <td className="py-1 pr-3">{formatUSD(m.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">用途別</h2>
            {summary.by_purpose.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">利用なし</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {summary.by_purpose.map((p) => (
                  <li key={p.purpose}>
                    <span className="font-mono">{p.purpose}</span>: {p.calls} 回 ·
                    {" "}
                    {formatUSD(p.cost_usd)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">過去 30 日の日次推移</h2>
            {summary.daily_30d.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">利用なし</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {summary.daily_30d.map((d) => (
                  <li key={d.day}>
                    {d.day}: {formatUSD(d.cost_usd)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
