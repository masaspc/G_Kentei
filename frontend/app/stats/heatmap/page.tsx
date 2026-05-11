"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../lib/api";
import { HeatmapCell, HeatmapResponse } from "../../lib/stats";
import { useRequireAuth } from "../../lib/useRequireAuth";

function accuracyColor(accuracy: number, attempts: number): string {
  if (attempts === 0) return "bg-slate-100 dark:bg-slate-700 text-slate-400";
  if (accuracy >= 0.8) return "bg-green-500 text-white";
  if (accuracy >= 0.6) return "bg-green-300";
  if (accuracy >= 0.4) return "bg-yellow-200";
  return "bg-red-300";
}

export default function HeatmapPage() {
  const ready = useRequireAuth();
  const [cells, setCells] = useState<HeatmapCell[]>([]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const res = await apiFetch("/api/stats/heatmap");
      if (res.ok) {
        const data = (await res.json()) as HeatmapResponse;
        setCells(data.cells);
      }
    })();
  }, [ready]);

  const categories = useMemo(() => {
    const set = new Set(cells.map((c) => c.category));
    return Array.from(set).sort();
  }, [cells]);

  const lookup = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const c of cells) {
      map.set(`${c.category}::${c.difficulty}`, c);
    }
    return map;
  }, [cells]);

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">弱点ヒートマップ</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        分野 × 難易度ごとの正答率。色が濃いほど成績が悪い分野です。
      </p>

      {cells.length === 0 ? (
        <p className="mt-6 text-slate-500 dark:text-slate-400">学習履歴がありません。</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">分野</th>
                <th className="px-3 py-2">難易度 1 (易)</th>
                <th className="px-3 py-2">難易度 2 (中)</th>
                <th className="px-3 py-2">難易度 3 (難)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 font-medium">{category}</td>
                  {[1, 2, 3].map((difficulty) => {
                    const cell = lookup.get(`${category}::${difficulty}`);
                    const attempts = cell?.attempts ?? 0;
                    const accuracy = cell?.accuracy ?? 0;
                    return (
                      <td
                        key={difficulty}
                        className={`px-3 py-2 text-center ${accuracyColor(accuracy, attempts)}`}
                      >
                        {attempts === 0 ? (
                          "—"
                        ) : (
                          <span>
                            {(accuracy * 100).toFixed(0)}%
                            <span className="ml-1 text-xs opacity-80">
                              ({cell?.correct}/{attempts})
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        凡例: <span className="rounded bg-red-300 px-2">40%未満</span>{" "}
        <span className="rounded bg-yellow-200 px-2">40-60%</span>{" "}
        <span className="rounded bg-green-300 px-2">60-80%</span>{" "}
        <span className="rounded bg-green-500 px-2 text-white">80%以上</span>
      </p>
    </main>
  );
}
