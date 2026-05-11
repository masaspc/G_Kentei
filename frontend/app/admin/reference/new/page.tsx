"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { ArticleForm, ArticleFormData } from "../_components/ArticleForm";

export default function NewArticlePage() {
  const ready = useRequireAuth();
  const router = useRouter();

  async function handleSubmit(data: ArticleFormData) {
    const res = await apiFetch("/api/reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`作成に失敗しました (${res.status}): ${detail}`);
    }
    const created = (await res.json()) as { id: number };
    router.push(`/admin/reference/${created.id}`);
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/reference" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 参考書管理
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">新規記事</h1>
      <div className="mt-6">
        <ArticleForm submitLabel="作成" onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
