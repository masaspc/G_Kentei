"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { ArticleForm, ArticleFormData } from "../_components/ArticleForm";

type Article = {
  id: number;
  title: string;
  syllabus_category: string;
  content: string;
  order_num: number;
  is_published: boolean;
};

export default function EditArticlePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [article, setArticle] = useState<Article | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || Number.isNaN(id)) return;
    apiFetch(`/api/reference/admin`)
      .then((r) => r.json())
      .then((list: Article[]) => {
        const found = list.find((a) => a.id === id);
        if (found) setArticle(found);
      });
  }, [ready, id]);

  async function handleSubmit(data: ArticleFormData) {
    const res = await apiFetch(`/api/reference/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`更新に失敗しました (${res.status}): ${detail}`);
    }
    router.push("/admin/reference");
  }

  async function generateContent() {
    setGenerating(true);
    setGenError(null);
    const res = await apiFetch(`/api/reference/${id}/generate`, { method: "POST" });
    setGenerating(false);
    if (!res.ok) {
      const detail = await res.text();
      setGenError(`生成に失敗しました (${res.status}): ${detail}`);
      return;
    }
    setArticle((await res.json()) as Article);
  }

  if (!ready) return null;
  if (!article) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/reference" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 参考書管理
      </Link>
      <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">記事編集 #{article.id}</h1>

      <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold dark:text-slate-200">Claude で本文を生成</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sonnet 4.6 がタイトル・分野をもとにMarkdown記事を自動作成します
            </p>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={generateContent}
            className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm font-semibold hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成する"}
          </button>
        </div>
        {genError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{genError}</p>}
      </div>

      <div className="mt-6">
        <ArticleForm
          key={article.content}
          initial={article}
          submitLabel="更新"
          onSubmit={handleSubmit}
        />
      </div>

      <div className="mt-4">
        <Link
          href={`/reference/${article.id}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          → 公開ページで確認
        </Link>
      </div>
    </main>
  );
}
