"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { ExamResult } from "../../../lib/exam";
import { useRequireAuth } from "../../../lib/useRequireAuth";

const PASS_THRESHOLD = 0.7;

export default function ExamResultPage() {
  const ready = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    if (!ready || Number.isNaN(id)) return;
    (async () => {
      const res = await apiFetch(`/api/exam/${id}/result`);
      if (res.ok) setResult((await res.json()) as ExamResult);
    })();
  }, [ready, id]);

  if (!ready) return null;
  if (!result) return <p className="px-6 py-10">読み込み中...</p>;

  const passed = result.accuracy >= PASS_THRESHOLD;
  const minutes = Math.floor(result.elapsed_seconds / 60);
  const seconds = result.elapsed_seconds % 60;
  const avgSeconds = result.elapsed_seconds / Math.max(1, result.total_questions);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">模試結果 #{result.exam_session_id}</h1>

      <section
        className={`mt-6 rounded-lg border p-6 ${
          passed
            ? "border-green-300 bg-green-50"
            : "border-orange-300 bg-orange-50"
        }`}
      >
        <p className="text-sm font-semibold">
          {passed ? "合格ライン到達 (70%以上)" : "合格ライン未達 (70%未満)"}
        </p>
        <p className="mt-2 text-4xl font-bold">
          {result.correct_count} / {result.total_questions}{" "}
          <span className="text-base font-normal">
            ({(result.accuracy * 100).toFixed(1)}%)
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          所要時間 {String(minutes).padStart(2, "0")}:
          {String(seconds).padStart(2, "0")} ・ 1問あたり平均{" "}
          {avgSeconds.toFixed(1)} 秒
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">分野別正答率</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b border-slate-200 text-left">
            <tr>
              <th className="py-1 pr-3">分野</th>
              <th className="py-1 pr-3">正答 / 出題</th>
              <th className="py-1 pr-3">正答率</th>
            </tr>
          </thead>
          <tbody>
            {result.by_category.map((c) => (
              <tr key={c.category} className="border-b border-slate-100">
                <td className="py-1 pr-3">{c.category}</td>
                <td className="py-1 pr-3 font-mono">
                  {c.correct} / {c.attempts}
                </td>
                <td className="py-1 pr-3">
                  {((c.correct / Math.max(1, c.attempts)) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">誤答問題</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {result.items
            .filter((i) => !i.is_correct)
            .map((i) => (
              <li
                key={i.question_id}
                className="rounded border border-slate-100 p-3"
              >
                <p className="font-semibold">
                  #{i.question_id} ・ {i.syllabus_category} ・ 難易度{" "}
                  {i.difficulty}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{i.question_text}</p>
                <p className="mt-2 text-xs">
                  あなたの解答:{" "}
                  <span className="font-mono">
                    {JSON.stringify(i.selected_answer)}
                  </span>
                </p>
                <p className="text-xs">
                  正解:{" "}
                  <span className="font-mono">
                    {JSON.stringify(i.correct_answer)}
                  </span>
                </p>
                {i.explanation && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                    {i.explanation}
                  </p>
                )}
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
