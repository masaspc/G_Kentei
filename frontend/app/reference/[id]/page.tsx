"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/useRequireAuth";

type Article = {
  id: number;
  title: string;
  syllabus_category: string;
  content: string;
  order_num: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export default function ArticlePage() {
  const ready = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ready) return;
    apiFetch(`/api/reference/${params.id}`).then(async (res) => {
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) setArticle((await res.json()) as Article);
    });
  }, [ready, params.id]);

  if (!ready) return null;

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-slate-600 dark:text-slate-400">記事が見つかりません。</p>
        <Link href="/reference" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
          一覧へ戻る
        </Link>
      </main>
    );
  }

  if (!article) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-slate-500 dark:text-slate-400">読み込み中...</p></main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:underline">ダッシュボード</Link>
        <span>/</span>
        <Link href="/reference" className="hover:underline">参考書</Link>
        <span>/</span>
        <span className="truncate max-w-40">{article.title}</span>
      </nav>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-blue-600 dark:text-blue-400">{article.syllabus_category}</p>
          <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">{article.title}</h1>
        </div>
        <Link
          href={`/admin/reference/${article.id}`}
          className="shrink-0 rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          編集
        </Link>
      </div>

      {article.content ? (
        <article className="prose-custom mt-8">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </article>
      ) : (
        <p className="mt-8 text-slate-500 dark:text-slate-400">
          まだ本文がありません。
          <Link href={`/admin/reference/${article.id}`} className="ml-1 text-blue-600 hover:underline dark:text-blue-400">
            Claude で生成する
          </Link>
        </p>
      )}

      <div className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-400">
        最終更新: {new Date(article.updated_at).toLocaleDateString("ja-JP")}
      </div>
    </main>
  );
}
