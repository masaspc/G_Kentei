type HealthResponse = { status: string };

async function fetchHealth(): Promise<HealthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    if (!res.ok) return { status: "error" };
    return (await res.json()) as HealthResponse;
  } catch {
    return { status: "unreachable" };
  }
}

export default async function Home() {
  const health = await fetchHealth();
  const examDate = new Date("2026-07-04");
  const daysLeft = Math.ceil(
    (examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">G検定攻略サイト</h1>
      <p className="mt-2 text-slate-600">
        G検定 2026 #4 に向けた個人学習プラットフォーム (Phase 0 skeleton)
      </p>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">試験まで</h2>
        <p className="mt-2 text-4xl font-bold text-blue-600">残り {daysLeft} 日</p>
        <p className="mt-1 text-sm text-slate-500">2026年7月4日 実施</p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">バックエンド接続</h2>
        <p className="mt-2 font-mono text-sm">status: {health.status}</p>
      </section>
    </main>
  );
}
