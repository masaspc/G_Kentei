"use client";

import { FormEvent, useState } from "react";

export type ArticleFormData = {
  title: string;
  syllabus_category: string;
  content: string;
  order_num: number;
  is_published: boolean;
};

type Props = {
  initial?: Partial<ArticleFormData>;
  submitLabel: string;
  onSubmit: (data: ArticleFormData) => Promise<void>;
};

export function ArticleForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [syllabusCategory, setSyllabusCategory] = useState(initial?.syllabus_category ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [orderNum, setOrderNum] = useState(initial?.order_num ?? 0);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({ title, syllabus_category: syllabusCategory, content, order_num: orderNum, is_published: isPublished });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium dark:text-slate-200">タイトル</span>
        <input
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium dark:text-slate-200">シラバス分野</span>
        <input
          required
          type="text"
          value={syllabusCategory}
          onChange={(e) => setSyllabusCategory(e.target.value)}
          placeholder="例: 機械学習の基礎"
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium dark:text-slate-200">本文 (Markdown)</span>
        <textarea
          rows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Markdown で記述できます。Claude で自動生成することもできます。"
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2 font-mono text-sm dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium dark:text-slate-200">表示順</span>
        <input
          type="number"
          value={orderNum}
          onChange={(e) => setOrderNum(Number(e.target.value))}
          className="mt-1 block w-24 rounded border border-slate-300 dark:border-slate-600 px-3 py-2 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        <span className="text-sm font-medium dark:text-slate-200">公開する</span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
