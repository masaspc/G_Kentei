"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { useRequireAdmin } from "../../../lib/useRequireAuth";

type Plan = {
  syllabus_category: string;
  subcategory: string;
  question_type: "single" | "multi" | "true_false" | "fill_blank";
  difficulty: 1 | 2 | 3;
};

// scripts/seed-questions.sh と同じ 12 サブカテゴリ x 3 タイプ
const SUB_CATEGORIES: { subcategory: string; syllabus_category: string }[] = [
  { subcategory: "AI概論・人工知能とは", syllabus_category: "機械学習の基礎" },
  { subcategory: "機械学習の手法", syllabus_category: "機械学習の基礎" },
  { subcategory: "ディープラーニングの概要", syllabus_category: "ディープラーニングの基礎" },
  { subcategory: "CNN・画像認識", syllabus_category: "ディープラーニングの基礎" },
  { subcategory: "RNN・自然言語処理", syllabus_category: "ディープラーニングの基礎" },
  { subcategory: "Transformer・大規模言語モデル", syllabus_category: "ディープラーニングの応用" },
  { subcategory: "生成AI・拡散モデル", syllabus_category: "ディープラーニングの応用" },
  { subcategory: "AI倫理・公平性", syllabus_category: "AI倫理・社会実装" },
  { subcategory: "AIの法律・ガイドライン", syllabus_category: "AI倫理・社会実装" },
  { subcategory: "AIプロジェクトの進め方", syllabus_category: "AI社会実装" },
  { subcategory: "確率・統計の基礎", syllabus_category: "数学基礎" },
  { subcategory: "線形代数の基礎", syllabus_category: "数学基礎" },
];

const PRESETS: { type: Plan["question_type"]; difficulty: Plan["difficulty"] }[] = [
  { type: "single", difficulty: 1 },
  { type: "single", difficulty: 2 },
  { type: "true_false", difficulty: 2 },
];

type LogEntry = {
  index: number;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  message?: string;
};

type GenerateResponse = {
  question_text: string;
  question_type: string;
  choices: unknown[];
  correct_answer: unknown;
  explanation: string | null;
  tags: string[];
};

type ModelChoice = "sonnet" | "haiku";

export default function BulkGeneratePage() {
  const ready = useRequireAdmin();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SUB_CATEGORIES.map((c) => c.subcategory)),
  );
  const [perCategory, setPerCategory] = useState(3);
  const [model, setModel] = useState<ModelChoice>("sonnet");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);
  const abortRef = useRef(false);

  if (!ready) return null;

  function toggle(sub: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  }

  function buildPlans(): Plan[] {
    const presets = PRESETS.slice(0, perCategory);
    const plans: Plan[] = [];
    for (const cat of SUB_CATEGORIES) {
      if (!selected.has(cat.subcategory)) continue;
      for (const p of presets) {
        plans.push({
          syllabus_category: cat.syllabus_category,
          subcategory: cat.subcategory,
          question_type: p.type,
          difficulty: p.difficulty,
        });
      }
    }
    return plans;
  }

  async function run() {
    const plans = buildPlans();
    if (plans.length === 0) return;
    if (
      !confirm(
        `${plans.length} 問を生成します。Claude API を消費するため、月額予算を超える可能性があります。続行しますか？`,
      )
    ) {
      return;
    }

    abortRef.current = false;
    setRunning(true);
    setSucceeded(0);
    setFailed(0);
    setLogs(
      plans.map((p, i) => ({
        index: i,
        label: `[${p.syllabus_category}] ${p.subcategory} / ${p.question_type} 難度${p.difficulty}`,
        status: "pending",
      })),
    );

    let okCount = 0;
    let ngCount = 0;

    for (let i = 0; i < plans.length; i++) {
      if (abortRef.current) {
        setLogs((prev) =>
          prev.map((l, idx) =>
            idx === i || (idx > i && l.status === "pending")
              ? { ...l, status: "failed", message: "中断" }
              : l,
          ),
        );
        ngCount += plans.length - i;
        break;
      }

      const p = plans[i];
      setLogs((prev) =>
        prev.map((l, idx) => (idx === i ? { ...l, status: "running" } : l)),
      );

      try {
        const genRes = await apiFetch("/api/questions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: p.syllabus_category,
            difficulty: p.difficulty,
            question_type: p.question_type,
            model,
          }),
        });
        if (!genRes.ok) {
          const text = await genRes.text();
          throw new Error(`生成失敗 (${genRes.status}): ${text.slice(0, 100)}`);
        }
        const draft = (await genRes.json()) as GenerateResponse;

        const saveRes = await apiFetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_text: draft.question_text,
            question_type: draft.question_type,
            choices: draft.choices,
            correct_answer: draft.correct_answer,
            explanation: draft.explanation,
            explanation_source: model === "haiku" ? "claude_haiku" : "claude_sonnet",
            syllabus_category: p.syllabus_category,
            subcategory: p.subcategory,
            difficulty: p.difficulty,
            tags: draft.tags ?? [],
            reference_links: [],
            source: `Claude ${model === "haiku" ? "Haiku 4.5" : "Sonnet 4.6"} (Web UI 一括生成)`,
            is_active: true,
          }),
        });
        if (!saveRes.ok) {
          const text = await saveRes.text();
          throw new Error(`保存失敗 (${saveRes.status}): ${text.slice(0, 100)}`);
        }

        setLogs((prev) =>
          prev.map((l, idx) => (idx === i ? { ...l, status: "done" } : l)),
        );
        okCount += 1;
        setSucceeded(okCount);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "不明なエラー";
        setLogs((prev) =>
          prev.map((l, idx) =>
            idx === i ? { ...l, status: "failed", message: msg } : l,
          ),
        );
        ngCount += 1;
        setFailed(ngCount);
      }
    }

    setRunning(false);
  }

  const plans = buildPlans();
  const total = plans.length;
  const done = succeeded + failed;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/admin/questions"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 問題管理
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">問題の一括生成</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Claude Sonnet 4.6 でシラバス各分野の問題を自動生成し、そのまま登録します。
        Claude API のコストが発生するため、月額予算に注意してください。
      </p>

      <section className="mt-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <p className="text-sm font-semibold dark:text-slate-200">生成対象分野</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          チェックを外すと対象から除外できます
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SUB_CATEGORIES.map((c) => (
            <label
              key={c.subcategory}
              className="flex items-center gap-2 rounded border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:text-slate-200"
            >
              <input
                type="checkbox"
                disabled={running}
                checked={selected.has(c.subcategory)}
                onChange={() => toggle(c.subcategory)}
              />
              <span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {c.syllabus_category}
                </span>{" "}
                <br />
                {c.subcategory}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm dark:text-slate-200">
          <label className="flex items-center gap-2">
            <span>1分野あたりの問題数:</span>
            <select
              disabled={running}
              value={perCategory}
              onChange={(e) => setPerCategory(Number(e.target.value))}
              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-2 py-1"
            >
              <option value={1}>1問 (4択 難度1)</option>
              <option value={2}>2問 (4択 難度1+2)</option>
              <option value={3}>3問 (4択 難度1+2 ＋ ◯×難度2)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>モデル:</span>
            <select
              disabled={running}
              value={model}
              onChange={(e) => setModel(e.target.value as ModelChoice)}
              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 px-2 py-1"
            >
              <option value="sonnet">Sonnet 4.6 (高品質・高コスト)</option>
              <option value="haiku">Haiku 4.5 (高速・低コスト)</option>
            </select>
          </label>
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            合計 {total} 問を生成
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {model === "haiku"
            ? "Haiku 4.5: Sonnet の約 1/5 程度の単価。多数生成や下書き量産向き。問題品質はやや劣る場合があるため後で確認を。"
            : "Sonnet 4.6: 推奨。本番投入できる品質の問題が期待できる。"}
        </p>
      </section>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={running || total === 0}
          onClick={() => void run()}
          className="rounded bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? `生成中... (${done}/${total})` : `一括生成を開始`}
        </button>
        {running && (
          <button
            type="button"
            onClick={() => {
              abortRef.current = true;
            }}
            className="rounded border border-red-300 dark:border-red-700 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            中断
          </button>
        )}
      </div>

      {logs.length > 0 && (
        <>
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm dark:text-slate-200">
              <span>
                成功 {succeeded} / 失敗 {failed} / 合計 {total}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <section className="mt-4 max-h-96 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {logs.map((l) => (
                <li
                  key={l.index}
                  className="flex items-start gap-2 px-3 py-2 dark:text-slate-200"
                >
                  <span className="w-5 shrink-0">
                    {l.status === "done"
                      ? "✅"
                      : l.status === "failed"
                        ? "⚠️"
                        : l.status === "running"
                          ? "🔄"
                          : "⋯"}
                  </span>
                  <span className="flex-1">
                    <span className="text-xs">{l.label}</span>
                    {l.message && (
                      <span className="block text-xs text-red-600 dark:text-red-400">
                        {l.message}
                      </span>
                    )}
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
