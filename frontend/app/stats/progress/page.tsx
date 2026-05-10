"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { ProgressPoint, ProgressResponse } from "../../lib/stats";
import { useRequireAuth } from "../../lib/useRequireAuth";

export default function ProgressPage() {
  const ready = useRequireAuth();
  const [points, setPoints] = useState<ProgressPoint[]>([]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const res = await apiFetch("/api/stats/progress?days=60");
      if (res.ok) {
        const data = (await res.json()) as ProgressResponse;
        setPoints(data.points);
      }
    })();
  }, [ready]);

  if (!ready) return null;

  const maxAttempts = Math.max(1, ...points.map((p) => p.attempts));
  const maxCumulative = Math.max(1, ...points.map((p) => p.cumulative_attempts));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">学習進捗</h1>
      <p className="text-sm text-slate-600">過去60日の学習量と累計回答数</p>

      {points.length === 0 ? (
        <p className="mt-6 text-slate-500">学習履歴がありません。</p>
      ) : (
        <>
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold">日別回答数</p>
            <div className="mt-3 flex items-end gap-1 overflow-x-auto">
              {points.map((p) => (
                <div key={p.day} className="flex flex-col items-center">
                  <div
                    className="w-3 rounded-t bg-blue-500"
                    style={{
                      height: `${Math.max(2, (p.attempts / maxAttempts) * 120)}px`,
                    }}
                    title={`${p.day}: ${p.correct}/${p.attempts}`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {points[0]?.day} 〜 {points[points.length - 1]?.day}
            </p>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold">累計回答数</p>
            <CumulativeChart points={points} max={maxCumulative} />
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold">直近の日次サマリ</p>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
              {[...points].reverse().map((p) => (
                <li
                  key={p.day}
                  className="flex justify-between border-b border-slate-100 py-1"
                >
                  <span>{p.day}</span>
                  <span className="font-mono">
                    {p.correct}/{p.attempts} (累計 {p.cumulative_attempts})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function CumulativeChart({
  points,
  max,
}: {
  points: ProgressPoint[];
  max: number;
}) {
  const width = 800;
  const height = 200;
  const padding = 30;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const pathPoints = points.map((p, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * innerW;
    const y = padding + innerH - (p.cumulative_attempts / max) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pathPoints.join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 h-48 w-full"
      preserveAspectRatio="none"
    >
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#cbd5e1"
      />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#cbd5e1"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
      />
      <text x={padding} y={padding - 8} className="fill-slate-500 text-xs">
        {max}
      </text>
      <text
        x={padding}
        y={height - padding + 16}
        className="fill-slate-500 text-xs"
      >
        0
      </text>
    </svg>
  );
}
