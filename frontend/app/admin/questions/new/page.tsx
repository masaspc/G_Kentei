"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "../../../lib/api";
import { QuestionInput, QuestionType } from "../../../lib/question";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { QuestionForm } from "../_components/QuestionForm";

type DraftQuestion = {
  question_text: string;
  question_type: QuestionType;
  choices: string[];
  correct_answer: unknown;
  explanation: string;
  tags: string[];
};

export default function NewQuestionPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<QuestionInput> | null>(null);
  const [genCategory, setGenCategory] = useState("");
  const [genDifficulty, setGenDifficulty] = useState(2);
  const [genType, setGenType] = useState<QuestionType>("single");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  async function handleSubmit(input: QuestionInput) {
    const res = await apiFetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`作成に失敗しました (${res.status}): ${detail}`);
    }
    router.push("/admin/questions");
  }

  async function generateDraft() {
    setGenerationError(null);
    setGenerating(true);
    const res = await apiFetch("/api/questions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: genCategory,
        difficulty: genDifficulty,
        question_type: genType,
      }),
    });
    setGenerating(false);
    if (!res.ok) {
      const detail = await res.text();
      setGenerationError(`生成失敗 (${res.status}): ${detail}`);
      return;
    }
    const data = (await res.json()) as DraftQuestion;
    setDraft({
      question_text: data.question_text,
      question_type: data.question_type,
      choices: data.choices,
      correct_answer: data.correct_answer,
      explanation: data.explanation,
      explanation_source: "claude_sonnet",
      syllabus_category: genCategory,
      difficulty: genDifficulty,
      tags: data.tags,
      reference_links: [],
      subcategory: null,
      source: "Claude Sonnet 4.6",
      is_active: true,
    });
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/questions" className="text-sm text-blue-600 hover:underline">
        ← 問題一覧
      </Link>
      <h1 className="mt-1 text-2xl font-bold">新規問題</h1>

      <section className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold">Claude で下書きを生成</p>
        <p className="text-xs text-slate-600">
          Sonnet 4.6 が生成した内容は必ず確認・修正してから保存してください。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="text"
            value={genCategory}
            onChange={(e) => setGenCategory(e.target.value)}
            placeholder="分野"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <select
            value={genDifficulty}
            onChange={(e) => setGenDifficulty(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={1}>難易度 1 (易)</option>
            <option value={2}>難易度 2 (中)</option>
            <option value={3}>難易度 3 (難)</option>
          </select>
          <select
            value={genType}
            onChange={(e) => setGenType(e.target.value as QuestionType)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="single">単一選択</option>
            <option value="multi">複数選択</option>
            <option value="true_false">○×</option>
            <option value="fill_blank">穴埋め</option>
          </select>
        </div>
        <button
          type="button"
          onClick={generateDraft}
          disabled={generating || genCategory.trim() === ""}
          className="mt-3 rounded border border-slate-300 px-3 py-1 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
        >
          {generating ? "生成中..." : "生成"}
        </button>
        {generationError && (
          <p className="mt-2 text-sm text-red-600">{generationError}</p>
        )}
      </section>

      <div className="mt-6">
        <QuestionForm
          key={draft ? "draft" : "blank"}
          initial={draft ?? undefined}
          submitLabel="作成"
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
