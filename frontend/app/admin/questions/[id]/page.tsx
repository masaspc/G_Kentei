"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { Question, QuestionInput } from "../../../lib/question";
import { useRequireAdmin } from "../../../lib/useRequireAuth";
import { QuestionForm } from "../_components/QuestionForm";

export default function EditQuestionPage() {
  const ready = useRequireAdmin();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [question, setQuestion] = useState<Question | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || Number.isNaN(id)) return;
    (async () => {
      const res = await apiFetch(`/api/questions/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        setQuestion((await res.json()) as Question);
      }
    })();
  }, [ready, id]);

  async function generateExplanation() {
    setGenerating(true);
    setGenerationError(null);
    const res = await apiFetch(`/api/questions/${id}/generate-explanation`, {
      method: "POST",
    });
    setGenerating(false);
    if (!res.ok) {
      const detail = await res.text();
      setGenerationError(`生成に失敗しました (${res.status}): ${detail}`);
      return;
    }
    setQuestion((await res.json()) as Question);
  }

  async function handleSubmit(input: QuestionInput) {
    const res = await apiFetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`更新に失敗しました (${res.status}): ${detail}`);
    }
    router.push("/admin/questions");
  }

  if (!ready) return null;
  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p>問題が見つかりません。</p>
        <Link href="/admin/questions" className="text-blue-600 hover:underline">
          一覧へ戻る
        </Link>
      </main>
    );
  }
  if (!question) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/questions" className="text-sm text-blue-600 hover:underline">
        ← 問題一覧
      </Link>
      <h1 className="mt-1 text-2xl font-bold">問題編集 #{question.id}</h1>

      <NoteSection questionId={question.id} />

      <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Claude で解説を生成</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Haiku 4.5 を呼び出して explanation を上書きします
              {question.explanation_source &&
                ` (現在: ${question.explanation_source})`}
            </p>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={generateExplanation}
            className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm font-semibold hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成する"}
          </button>
        </div>
        {generationError && (
          <p className="mt-2 text-sm text-red-600">{generationError}</p>
        )}
      </div>

      <div className="mt-6">
        <QuestionForm
          initial={question}
          submitLabel="更新"
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}

function NoteSection({ questionId }: { questionId: number }) {
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`/api/questions/${questionId}/note`);
      if (res.ok) {
        const data = (await res.json()) as { note: string | null };
        setNote(data.note ?? "");
      }
      setLoaded(true);
    })();
  }, [questionId]);

  async function save() {
    setSaving(true);
    await apiFetch(`/api/questions/${questionId}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setSaving(false);
  }

  if (!loaded) return null;
  return (
    <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
      <p className="text-sm font-semibold">自分用メモ</p>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-2 block w-full rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-2 rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-semibold hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "メモを保存"}
      </button>
    </div>
  );
}
