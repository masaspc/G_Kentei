"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "../lib/api";
import {
  PracticeQuestion,
  SessionCondition,
  SessionRecord,
  SrsRating,
  StudyAnswerResponse,
  StudySessionResponse,
} from "../lib/study";
import { useRequireAuth } from "../lib/useRequireAuth";

type Mode = "setup" | "loading" | "answering" | "judged" | "done";

export default function PracticePage() {
  const ready = useRequireAuth();

  const [mode, setMode] = useState<Mode>("setup");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<number | "">("");
  const [condition, setCondition] = useState<SessionCondition>("all");
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [answerStart, setAnswerStart] = useState<number>(Date.now());
  const [judgement, setJudgement] = useState<StudyAnswerResponse | null>(null);
  const [selected, setSelected] = useState<unknown>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const res = await apiFetch("/api/questions/categories");
      if (res.ok) setCategories((await res.json()) as string[]);
    })();
  }, [ready]);

  if (!ready) return null;

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMode("loading");
    const body = {
      category: category || null,
      difficulty: difficulty === "" ? null : Number(difficulty),
      condition,
      limit,
    };
    const res = await apiFetch("/api/study/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(`セッション開始に失敗しました (${res.status})`);
      setMode("setup");
      return;
    }
    const data = (await res.json()) as StudySessionResponse;
    if (data.items.length === 0) {
      setError("条件に一致する問題がありません");
      setMode("setup");
      return;
    }
    setQuestions(data.items);
    setRecords([]);
    setIndex(0);
    setJudgement(null);
    setSelected(null);
    setAnswerStart(Date.now());
    setMode("answering");
  }

  async function submitAnswer(answer: unknown) {
    if (mode !== "answering") return;
    const question = questions[index];
    const elapsed = Date.now() - answerStart;
    const res = await apiFetch("/api/study/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.id,
        selected_answer: answer,
        response_time_ms: elapsed,
      }),
    });
    if (!res.ok) {
      setError(`回答送信に失敗しました (${res.status})`);
      return;
    }
    const result = (await res.json()) as StudyAnswerResponse;
    setSelected(answer);
    setJudgement(result);
    setRecords((prev) => [...prev, { question, selected: answer, result }]);
    setMode("judged");
  }

  async function evaluate(rating: SrsRating) {
    if (!judgement) return;
    const question = questions[index];
    await apiFetch("/api/study/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.id,
        self_evaluation: rating,
        study_log_id: judgement.study_log_id,
      }),
    });
    goNext();
  }

  function goNext() {
    if (index + 1 >= questions.length) {
      setMode("done");
      return;
    }
    setIndex((i) => i + 1);
    setJudgement(null);
    setSelected(null);
    setAnswerStart(Date.now());
    setMode("answering");
  }

  function restart() {
    setQuestions([]);
    setRecords([]);
    setIndex(0);
    setJudgement(null);
    setSelected(null);
    setMode("setup");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <h1 className="mt-1 text-2xl font-bold">一問一答演習</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {mode === "setup" && (
        <form className="mt-6 space-y-4" onSubmit={startSession}>
          <label className="block">
            <span className="text-sm font-medium">分野</span>
            <input
              type="text"
              list="categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="(空で全分野)"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">難易度</span>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="">指定なし</option>
                <option value={1}>1 (易)</option>
                <option value={2}>2 (中)</option>
                <option value={3}>3 (難)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">出題条件</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as SessionCondition)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="all">すべて</option>
                <option value="unanswered">未回答のみ</option>
                <option value="srs_due">SRS復習対象のみ</option>
                <option value="bookmarked">ブックマーク済のみ</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">出題数</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value={10}>10 問</option>
              <option value={20}>20 問</option>
              <option value={50}>50 問</option>
              <option value={100}>100 問</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            演習開始
          </button>
        </form>
      )}

      {mode === "loading" && <p className="mt-6">問題を取得中...</p>}

      {(mode === "answering" || mode === "judged") && (
        <Session
          questions={questions}
          index={index}
          mode={mode}
          selected={selected}
          judgement={judgement}
          onSubmit={submitAnswer}
          onNext={goNext}
          onEvaluate={evaluate}
        />
      )}

      {mode === "done" && <Summary records={records} onRestart={restart} />}
    </main>
  );
}

function Session({
  questions,
  index,
  mode,
  selected,
  judgement,
  onSubmit,
  onNext,
  onEvaluate,
}: {
  questions: PracticeQuestion[];
  index: number;
  mode: "answering" | "judged";
  selected: unknown;
  judgement: StudyAnswerResponse | null;
  onSubmit: (answer: unknown) => void;
  onNext: () => void;
  onEvaluate: (rating: SrsRating) => void;
}) {
  const question = questions[index];
  return (
    <section className="mt-6">
      <p className="text-sm text-slate-600">
        {index + 1} / {questions.length} ・ {question.syllabus_category} ・ 難易度{" "}
        {question.difficulty}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-lg">{question.question_text}</p>

      <div className="mt-4">
        <AnswerInput
          question={question}
          disabled={mode === "judged"}
          selected={selected}
          onSubmit={onSubmit}
        />
      </div>

      {mode === "judged" && judgement && (
        <Judgement
          question={question}
          judgement={judgement}
          onNext={onNext}
          onEvaluate={onEvaluate}
        />
      )}
    </section>
  );
}

function AnswerInput({
  question,
  disabled,
  selected,
  onSubmit,
}: {
  question: PracticeQuestion;
  disabled: boolean;
  selected: unknown;
  onSubmit: (answer: unknown) => void;
}) {
  const [multiSelection, setMultiSelection] = useState<number[]>([]);
  const [textValue, setTextValue] = useState("");

  useEffect(() => {
    setMultiSelection([]);
    setTextValue("");
  }, [question.id]);

  const choices = (question.choices ?? []).map((c) => String(c));

  if (question.question_type === "single") {
    return (
      <div className="space-y-2">
        {choices.map((choice, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(idx)}
            className={`block w-full rounded border px-3 py-2 text-left ${
              disabled && selected === idx
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:bg-slate-100 disabled:opacity-60"
            }`}
          >
            {idx + 1}. {choice}
          </button>
        ))}
      </div>
    );
  }

  if (question.question_type === "multi") {
    return (
      <div className="space-y-2">
        {choices.map((choice, idx) => (
          <label
            key={idx}
            className={`flex items-center gap-2 rounded border border-slate-300 px-3 py-2 ${
              disabled ? "opacity-60" : "hover:bg-slate-100"
            }`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={multiSelection.includes(idx)}
              onChange={(e) =>
                setMultiSelection((prev) =>
                  e.target.checked
                    ? [...prev, idx].sort((a, b) => a - b)
                    : prev.filter((v) => v !== idx),
                )
              }
            />
            <span>
              {idx + 1}. {choice}
            </span>
          </label>
        ))}
        <button
          type="button"
          disabled={disabled || multiSelection.length === 0}
          onClick={() => onSubmit(multiSelection)}
          className="mt-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          回答する
        </button>
      </div>
    );
  }

  if (question.question_type === "true_false") {
    return (
      <div className="flex gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(true)}
          className="flex-1 rounded border border-slate-300 px-4 py-3 text-lg font-semibold hover:bg-slate-100 disabled:opacity-60"
        >
          ○
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(false)}
          className="flex-1 rounded border border-slate-300 px-4 py-3 text-lg font-semibold hover:bg-slate-100 disabled:opacity-60"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        disabled={disabled}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        className="block w-full rounded border border-slate-300 px-3 py-2"
        placeholder="解答を入力"
      />
      <button
        type="button"
        disabled={disabled || textValue.trim() === ""}
        onClick={() => onSubmit(textValue.trim())}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        回答する
      </button>
    </div>
  );
}

function Judgement({
  question,
  judgement,
  onNext,
  onEvaluate,
}: {
  question: PracticeQuestion;
  judgement: StudyAnswerResponse;
  onNext: () => void;
  onEvaluate: (rating: SrsRating) => void;
}) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/bookmarks/ids");
      if (res.ok) {
        const ids = (await res.json()) as number[];
        setBookmarked(ids.includes(question.id));
      }
    })();
  }, [question.id]);

  async function toggleBookmark() {
    const method = bookmarked ? "DELETE" : "POST";
    const res = await apiFetch(
      `/api/questions/${question.id}/bookmark`,
      { method },
    );
    if (res.ok) setBookmarked(!bookmarked);
  }

  return (
    <section
      className={`mt-6 rounded-lg border p-4 ${
        judgement.is_correct
          ? "border-green-300 bg-green-50"
          : "border-red-300 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">
          {judgement.is_correct ? "○ 正解" : "× 不正解"}
        </p>
        <button
          type="button"
          onClick={toggleBookmark}
          className={`rounded border px-3 py-1 text-sm font-semibold ${
            bookmarked
              ? "border-yellow-400 bg-yellow-100 text-yellow-800"
              : "border-slate-300 hover:bg-slate-100"
          }`}
        >
          {bookmarked ? "★ ブックマーク済" : "☆ ブックマーク"}
        </button>
      </div>

      <p className="mt-2 text-sm">
        正解: <span className="font-mono">{formatAnswer(question, judgement.correct_answer)}</span>
      </p>

      {judgement.explanation && (
        <div className="mt-3">
          <p className="text-sm font-semibold">解説</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{judgement.explanation}</p>
        </div>
      )}

      {judgement.reference_links.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">参考リンク</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {judgement.reference_links.map((link) => (
              <li key={link}>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ChatPanel questionId={question.id} />

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold">理解度の自己評価 (SRS)</p>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onEvaluate(0)}
            className="rounded bg-red-100 px-2 py-2 text-sm font-semibold hover:bg-red-200"
          >
            Again
          </button>
          <button
            type="button"
            onClick={() => onEvaluate(1)}
            className="rounded bg-orange-100 px-2 py-2 text-sm font-semibold hover:bg-orange-200"
          >
            Hard
          </button>
          <button
            type="button"
            onClick={() => onEvaluate(2)}
            className="rounded bg-blue-100 px-2 py-2 text-sm font-semibold hover:bg-blue-200"
          >
            Good
          </button>
          <button
            type="button"
            onClick={() => onEvaluate(3)}
            className="rounded bg-green-100 px-2 py-2 text-sm font-semibold hover:bg-green-200"
          >
            Easy
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="text-xs text-slate-500 hover:underline"
        >
          評価をスキップして次へ →
        </button>
      </div>
    </section>
  );
}

type ChatTurn = { role: "user" | "assistant"; content: string };

function ChatPanel({ questionId }: { questionId: number }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory([]);
    setInput("");
    setError(null);
    setOpen(false);
  }, [questionId]);

  async function send() {
    const message = input.trim();
    if (!message) return;
    setError(null);
    setPending(true);
    const userTurn: ChatTurn = { role: "user", content: message };
    const nextHistory = [...history, userTurn];
    setHistory(nextHistory);
    setInput("");

    const res = await apiFetch("/api/chat/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        history,
        user_message: message,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const detail = await res.text();
      setError(`応答に失敗 (${res.status}): ${detail}`);
      return;
    }
    const data = (await res.json()) as { reply: string };
    setHistory([...nextHistory, { role: "assistant", content: data.reply }]);
  }

  return (
    <div className="mt-4 rounded border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
      >
        {open ? "▼" : "▶"} Claudeに質問
      </button>
      {open && (
        <div className="border-t border-slate-200 p-3">
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {history.length === 0 && (
              <p className="text-xs text-slate-500">
                この問題について Claude Sonnet 4.6 に質問できます。
              </p>
            )}
            {history.map((turn, i) => (
              <div
                key={i}
                className={`rounded p-2 text-sm ${
                  turn.role === "user"
                    ? "bg-blue-50"
                    : "bg-slate-100"
                }`}
              >
                <p className="text-xs font-semibold text-slate-500">
                  {turn.role === "user" ? "あなた" : "Claude"}
                </p>
                <p className="whitespace-pre-wrap">{turn.content}</p>
              </div>
            ))}
            {pending && (
              <p className="text-xs text-slate-500">Claude が考えています...</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="この問題について質問..."
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || input.trim() === ""}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              送信
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

function formatAnswer(question: PracticeQuestion, answer: unknown): string {
  if (question.question_type === "single" && typeof answer === "number") {
    const choice = (question.choices ?? [])[answer];
    return `${answer + 1}. ${String(choice ?? "")}`;
  }
  if (question.question_type === "multi" && Array.isArray(answer)) {
    return answer
      .map((idx) => {
        if (typeof idx === "number") {
          const choice = (question.choices ?? [])[idx];
          return `${idx + 1}. ${String(choice ?? "")}`;
        }
        return String(idx);
      })
      .join(" / ");
  }
  if (question.question_type === "true_false") {
    return answer === true ? "○" : "×";
  }
  return typeof answer === "string" ? answer : JSON.stringify(answer);
}

function Summary({
  records,
  onRestart,
}: {
  records: SessionRecord[];
  onRestart: () => void;
}) {
  const correct = records.filter((r) => r.result.is_correct).length;
  const accuracy = records.length === 0 ? 0 : (correct / records.length) * 100;

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">セッション結果</h2>
        <p className="mt-2 text-3xl font-bold">
          {correct} / {records.length}{" "}
          <span className="text-base font-normal text-slate-500">
            ({accuracy.toFixed(1)}%)
          </span>
        </p>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">問題一覧</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {records.map((r, i) => (
            <li key={r.question.id} className="border-b border-slate-100 pb-2">
              <span className="font-mono">
                {i + 1}. {r.result.is_correct ? "○" : "×"}
              </span>{" "}
              {r.question.question_text.slice(0, 80)}
              {r.question.question_text.length > 80 ? "…" : ""}
            </li>
          ))}
        </ul>
      </details>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          もう一度
        </button>
        <Link
          href="/"
          className="rounded border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100"
        >
          ダッシュボードへ
        </Link>
      </div>
    </section>
  );
}
