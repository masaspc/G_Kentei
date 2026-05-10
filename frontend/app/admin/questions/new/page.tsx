"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "../../../lib/api";
import { QuestionInput } from "../../../lib/question";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { QuestionForm } from "../_components/QuestionForm";

export default function NewQuestionPage() {
  const ready = useRequireAuth();
  const router = useRouter();

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

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/questions" className="text-sm text-blue-600 hover:underline">
        ← 問題一覧
      </Link>
      <h1 className="mt-1 text-2xl font-bold">新規問題</h1>
      <div className="mt-6">
        <QuestionForm submitLabel="作成" onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
