"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "../lib/api";
import { ExamQuestion, ExamStartResponse } from "../lib/exam";
import { useRequireAuth } from "../lib/useRequireAuth";

type Mode = "setup" | "loading" | "active" | "submitting";

export default function ExamPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("setup");
  const [examSessionId, setExamSessionId] = useState<number | null>(null);
  const [items, setItems] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [totalQuestions, setTotalQuestions] = useState(145);
  const [timeLimit, setTimeLimit] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (mode !== "active") return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const left = Math.max(0, timeLimit - elapsed);
      setRemaining(left);
      if (left === 0) {
        void submit();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, timeLimit]);

  const submit = useCallback(async () => {
    if (!examSessionId || mode === "submitting") return;
    setMode("submitting");
    const elapsedSeconds = Math.min(
      timeLimit,
      Math.floor((Date.now() - startedAtRef.current) / 1000),
    );
    const payload = {
      exam_session_id: examSessionId,
      elapsed_seconds: elapsedSeconds,
      answers: items.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] ?? null,
      })),
    };
    const res = await apiFetch("/api/exam/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError(`採点に失敗しました (${res.status})`);
      setMode("active");
      return;
    }
    router.push(`/exam/${examSessionId}/result`);
  }, [examSessionId, mode, timeLimit, items, answers, router]);

  if (!ready) return null;

  async function start() {
    setError(null);
    setMode("loading");
    const res = await apiFetch("/api/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total_questions: totalQuestions }),
    });
    if (!res.ok) {
      setError(`模試を開始できません (${res.status})`);
      setMode("setup");
      return;
    }
    const data = (await res.json()) as ExamStartResponse;
    setExamSessionId(data.exam_session_id);
    setItems(data.items);
    setTimeLimit(data.time_limit_seconds);
    setRemaining(data.time_limit_seconds);
    setAnswers({});
    setFlags({});
    setIndex(0);
    startedAtRef.current = Date.now();
    setMode("active");
  }

  function setAnswer(questionId: number, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleFlag(questionId: number) {
    setFlags((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  const current = items[index];
  const answeredCount = Object.keys(answers).filter((id) =>
    items.some((q) => q.id === Number(id)),
  ).length;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  if (mode === "setup" || mode === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ダッシュボード
        </Link>
        <h1 className="mt-1 text-2xl font-bold">模擬試験</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          本番再現: 145問・100分・中断不可。開始すると即座にタイマーが動き出します。
        </p>

        <div className="mt-6 rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
          <label className="block">
            <span className="text-sm font-medium">問題数</span>
            <input
              type="number"
              min={1}
              max={200}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="mt-1 block w-32 rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
            />
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={start}
            disabled={mode === "loading"}
            className="mt-4 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === "loading" ? "準備中..." : "模試開始"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">残り時間</p>
          <p
            className={`text-2xl font-bold ${
              remaining <= 300 ? "text-red-600" : ""
            }`}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            解答済 / 全問
          </p>
          <p className="text-2xl font-bold">
            {answeredCount} / {items.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `${items.length - answeredCount}問が未解答です。提出しますか？`,
              )
            ) {
              void submit();
            }
          }}
          disabled={mode === "submitting"}
          className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mode === "submitting" ? "採点中..." : "提出する"}
        </button>
      </header>

      <section className="mt-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          問題 {index + 1} / {items.length} ・ {current.syllabus_category} ・ 難易度{" "}
          {current.difficulty}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-lg">{current.question_text}</p>

        <div className="mt-4">
          <ExamAnswerInput
            question={current}
            value={answers[current.id]}
            onChange={(v) => setAnswer(current.id, v)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm hover:bg-slate-100 dark:bg-slate-700 disabled:opacity-50"
          >
            ← 前へ
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => Math.min(items.length - 1, i + 1))
            }
            disabled={index === items.length - 1}
            className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm hover:bg-slate-100 dark:bg-slate-700 disabled:opacity-50"
          >
            次へ →
          </button>
          <button
            type="button"
            onClick={() => toggleFlag(current.id)}
            className={`rounded border px-3 py-1 text-sm ${
              flags[current.id]
                ? "border-yellow-400 bg-yellow-100 dark:bg-yellow-900"
                : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {flags[current.id] ? "見直しフラグ済" : "見直しフラグ"}
          </button>
        </div>
      </section>

      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          問題一覧
        </p>
        <div className="mt-2 grid grid-cols-10 gap-1 sm:grid-cols-15">
          {items.map((q, i) => {
            const answered = answers[q.id] !== undefined;
            const flagged = flags[q.id];
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-8 rounded text-xs font-mono ${
                  i === index
                    ? "bg-blue-600 text-white"
                    : answered
                      ? flagged
                        ? "bg-yellow-300"
                        : "bg-blue-100 dark:bg-blue-900"
                      : flagged
                        ? "bg-yellow-100 dark:bg-yellow-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ExamAnswerInput({
  question,
  value,
  onChange,
}: {
  question: ExamQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const choices = (question.choices ?? []).map((c) => String(c));

  if (question.question_type === "single") {
    return (
      <div className="space-y-2">
        {choices.map((choice, idx) => {
          const selected = value === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(idx)}
              className={`block w-full rounded border px-3 py-2 text-left ${
                selected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:bg-slate-700"
              }`}
            >
              {idx + 1}. {choice}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.question_type === "multi") {
    const arr = Array.isArray(value) ? (value as number[]) : [];
    return (
      <div className="space-y-2">
        {choices.map((choice, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 rounded border border-slate-300 dark:border-slate-600 px-3 py-2 hover:bg-slate-100 dark:bg-slate-700"
          >
            <input
              type="checkbox"
              checked={arr.includes(idx)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...arr, idx].sort((a, b) => a - b)
                    : arr.filter((v) => v !== idx),
                )
              }
            />
            <span>
              {idx + 1}. {choice}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (question.question_type === "true_false") {
    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 rounded border px-4 py-3 text-lg font-semibold ${
            value === true
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:bg-slate-700"
          }`}
        >
          ○
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded border px-4 py-3 text-lg font-semibold ${
            value === false
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:bg-slate-700"
          }`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="解答を入力"
      className="block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
    />
  );
}
