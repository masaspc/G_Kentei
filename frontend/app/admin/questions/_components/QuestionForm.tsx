"use client";

import { FormEvent, useState } from "react";

import {
  ExplanationSource,
  QuestionInput,
  QuestionType,
} from "../../../lib/question";

type Props = {
  initial?: Partial<QuestionInput>;
  submitLabel: string;
  onSubmit: (input: QuestionInput) => Promise<void>;
};

function joinLines(values: unknown[]): string {
  return values.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n");
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function QuestionForm({ initial, submitLabel, onSubmit }: Props) {
  const [questionText, setQuestionText] = useState(initial?.question_text ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(
    initial?.question_type ?? "single",
  );
  const [choicesText, setChoicesText] = useState(
    initial?.choices ? joinLines(initial.choices) : "",
  );
  const [correctAnswerText, setCorrectAnswerText] = useState(
    initial?.correct_answer !== undefined
      ? JSON.stringify(initial.correct_answer)
      : "0",
  );
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [explanationSource, setExplanationSource] = useState<
    ExplanationSource | ""
  >(initial?.explanation_source ?? "");
  const [referenceLinksText, setReferenceLinksText] = useState(
    initial?.reference_links ? initial.reference_links.join("\n") : "",
  );
  const [syllabusCategory, setSyllabusCategory] = useState(
    initial?.syllabus_category ?? "",
  );
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [difficulty, setDifficulty] = useState<number>(initial?.difficulty ?? 2);
  const [tagsText, setTagsText] = useState(
    initial?.tags ? initial.tags.join(", ") : "",
  );
  const [source, setSource] = useState(initial?.source ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let correctAnswer: unknown;
    try {
      correctAnswer = JSON.parse(correctAnswerText);
    } catch {
      setError("正解は有効なJSONで入力してください (例: 0, [0,2], true, \"答え\")");
      return;
    }

    const input: QuestionInput = {
      question_text: questionText,
      question_type: questionType,
      choices: splitLines(choicesText),
      correct_answer: correctAnswer,
      explanation: explanation || null,
      explanation_source: explanationSource === "" ? null : explanationSource,
      reference_links: splitLines(referenceLinksText),
      syllabus_category: syllabusCategory,
      subcategory: subcategory || null,
      difficulty,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      source: source || null,
      is_active: isActive,
    };

    setPending(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium">問題文</span>
        <textarea
          required
          rows={4}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">形式</span>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="single">単一選択</option>
            <option value="multi">複数選択</option>
            <option value="true_false">○×</option>
            <option value="fill_blank">穴埋め</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">難易度</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value={1}>1 (易)</option>
            <option value={2}>2 (中)</option>
            <option value={3}>3 (難)</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">選択肢 (1行に1つ)</span>
        <textarea
          rows={4}
          value={choicesText}
          onChange={(e) => setChoicesText(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">
          正解 (JSON: <code>0</code>, <code>[0,2]</code>, <code>true</code>, <code>&quot;答え&quot;</code>)
        </span>
        <input
          type="text"
          required
          value={correctAnswerText}
          onChange={(e) => setCorrectAnswerText(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">シラバス分野</span>
          <input
            type="text"
            required
            value={syllabusCategory}
            onChange={(e) => setSyllabusCategory(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">サブ分野</span>
          <input
            type="text"
            value={subcategory ?? ""}
            onChange={(e) => setSubcategory(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">解説</span>
        <textarea
          rows={4}
          value={explanation ?? ""}
          onChange={(e) => setExplanation(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">解説ソース</span>
          <select
            value={explanationSource}
            onChange={(e) =>
              setExplanationSource(e.target.value as ExplanationSource | "")
            }
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">(未設定)</option>
            <option value="manual">manual</option>
            <option value="claude_haiku">claude_haiku</option>
            <option value="claude_sonnet">claude_sonnet</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">出典</span>
          <input
            type="text"
            value={source ?? ""}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">参考リンク (1行に1つ)</span>
        <textarea
          rows={3}
          value={referenceLinksText}
          onChange={(e) => setReferenceLinksText(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">タグ (カンマ区切り)</span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-sm font-medium">公開する</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
