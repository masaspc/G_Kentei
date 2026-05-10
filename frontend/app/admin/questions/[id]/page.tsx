"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { Question, QuestionInput } from "../../../lib/question";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { QuestionForm } from "../_components/QuestionForm";

export default function EditQuestionPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [question, setQuestion] = useState<Question | null>(null);
  const [notFound, setNotFound] = useState(false);

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
