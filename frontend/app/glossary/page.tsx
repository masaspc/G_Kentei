"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { apiFetch } from "../lib/api";
import { Term, TermInput, TermListResponse } from "../lib/term";
import { useRequireAuth } from "../lib/useRequireAuth";

export default function GlossaryPage() {
  const ready = useRequireAuth();
  const [terms, setTerms] = useState<Term[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await apiFetch(`/api/terms?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as TermListResponse;
      setTerms(data.items);
    }
  }, [search]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function handleDelete(id: number) {
    if (!confirm("削除しますか？")) return;
    const res = await apiFetch(`/api/terms/${id}`, { method: "DELETE" });
    if (res.ok) void load();
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ダッシュボード
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">用語集・チートシート</h1>
        <Link
          href="/glossary/print"
          className="text-sm text-blue-600 hover:underline"
        >
          印刷用ビュー →
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="用語・定義を検索..."
          className="flex-1 rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + 追加
        </button>
      </div>

      {creating && (
        <TermEditor
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}

      {editing && (
        <TermEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      <div className="mt-6 space-y-3">
        {terms.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">用語が登録されていません。</p>
        ) : (
          terms.map((t) => (
            <article
              key={t.id}
              className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{t.term}</h2>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(t.id)}
                    className="text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
              {t.syllabus_category && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.syllabus_category}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm">{t.definition}</p>
              {t.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {t.reference_links.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {t.reference_links.map((link) => (
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
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}

function TermEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Term;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [term, setTerm] = useState(initial?.term ?? "");
  const [definition, setDefinition] = useState(initial?.definition ?? "");
  const [category, setCategory] = useState(initial?.syllabus_category ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [links, setLinks] = useState((initial?.reference_links ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload: TermInput = {
      term,
      definition,
      syllabus_category: category || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      reference_links: links
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    };
    setPending(true);
    const res = await apiFetch(
      initial ? `/api/terms/${initial.id}` : "/api/terms",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setPending(false);
    if (!res.ok) {
      setError(`保存に失敗しました (${res.status})`);
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4"
    >
      <label className="block">
        <span className="text-sm font-medium">用語</span>
        <input
          type="text"
          required
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">定義</span>
        <textarea
          required
          rows={3}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">シラバス分野</span>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">タグ (カンマ区切り)</span>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">参考リンク (1行に1つ)</span>
        <textarea
          rows={3}
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-600 px-3 py-2 font-mono text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "保存中..." : initial ? "更新" : "作成"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2 hover:bg-slate-100 dark:bg-slate-700"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
