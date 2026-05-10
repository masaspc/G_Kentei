"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { API_BASE_URL, getToken } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/useRequireAuth";

type ImportError = { row: number; message: string };
type ImportResult = {
  success: number;
  failed: number;
  errors: ImportError[];
};

const JSON_EXAMPLE = `[
  {
    "question_text": "ディープラーニングの活性化関数として代表的なものは？",
    "question_type": "single",
    "choices": ["ReLU", "線形回帰", "k-means", "ID3"],
    "correct_answer": 0,
    "syllabus_category": "機械学習の基礎",
    "difficulty": 2,
    "explanation": "ReLU は勾配消失問題を緩和し...",
    "explanation_source": "manual",
    "reference_links": ["https://example.com/relu"],
    "tags": ["活性化関数"],
    "is_active": true
  }
]`;

const CSV_EXAMPLE = `question_text,question_type,choices,correct_answer,syllabus_category,subcategory,difficulty,explanation,explanation_source,reference_links,tags,source,is_active
"ディープラーニングの活性化関数として代表的なものは？",single,"[""ReLU"",""線形回帰"",""k-means"",""ID3""]",0,機械学習の基礎,,2,"ReLU は...",manual,"[""https://example.com""]","[""活性化関数""]",,true`;

export default function ImportQuestionsPage() {
  const ready = useRequireAuth();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setPending(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/questions/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.text();
        setError(`インポート失敗 (${res.status}): ${detail}`);
        return;
      }
      setResult((await res.json()) as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラー");
    } finally {
      setPending(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/questions" className="text-sm text-blue-600 hover:underline">
        ← 問題一覧
      </Link>
      <h1 className="mt-1 text-2xl font-bold">問題の一括インポート</h1>
      <p className="mt-1 text-sm text-slate-600">
        CSV または JSON ファイルから問題を一括登録します。
        1 件でもバリデーションエラーがあると、何も登録せずエラーを返します。
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv,.json,application/json,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded border border-slate-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !file}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "アップロード中..." : "インポート"}
        </button>
      </form>

      {result && (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">結果</h2>
          <p className="mt-2 text-sm">
            成功 <span className="font-semibold text-green-600">{result.success}</span>
            {" / "}
            失敗 <span className="font-semibold text-red-600">{result.failed}</span>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {result.errors.map((err) => (
                <li key={err.row} className="text-red-700">
                  <span className="font-mono">行 {err.row}:</span> {err.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">JSON フォーマット例</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
            {JSON_EXAMPLE}
          </pre>
        </div>
        <div>
          <h2 className="text-lg font-semibold">CSV フォーマット例</h2>
          <p className="mt-1 text-xs text-slate-600">
            JSONB フィールド (<code>choices</code> / <code>correct_answer</code> /
            <code> reference_links</code> / <code>tags</code>) は JSON 文字列でエンコードしてください。
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
            {CSV_EXAMPLE}
          </pre>
        </div>
      </section>
    </main>
  );
}
