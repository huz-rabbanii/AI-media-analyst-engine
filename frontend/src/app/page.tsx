"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Article,
  fetchArticles,
  fetchSources,
  runIngest,
  runSummarize,
} from "@/lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [aiOnly, setAiOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([fetchArticles(150), fetchSources()]);
      setArticles(a);
      setSources(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onIngest() {
    setBusy("Ingesting…");
    setError(null);
    try {
      const r = await runIngest();
      setToast(`Inserted ${r.inserted}, skipped ${r.skipped}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onSummarize() {
    setBusy("Summarizing…");
    setError(null);
    try {
      const r = await runSummarize(10);
      setToast(
        `Summarized ${r.summarized}/${r.candidates} (skipped short: ${r.skipped_short}, failed: ${r.failed.length})`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(
    () =>
      articles.filter(
        (a) =>
          (!sourceFilter || a.source === sourceFilter) &&
          (!aiOnly || !!a.ai_summary)
      ),
    [articles, sourceFilter, aiOnly]
  );

  const aiCount = articles.filter((a) => a.ai_summary).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              AI Media Analyst Engine
            </h1>
            <p className="text-xs text-zinc-400">
              {articles.length} articles · {aiCount} AI-summarized
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={aiOnly}
                onChange={(e) => setAiOnly(e.target.checked)}
                className="accent-emerald-500"
              />
              AI only
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-sm rounded px-2 py-1.5"
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={load}
              disabled={loading || !!busy}
              className="text-sm px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={onIngest}
              disabled={!!busy}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              Ingest
            </button>
            <button
              onClick={onSummarize}
              disabled={!!busy}
              className="text-sm px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              Summarize 10
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {(busy || toast || error) && (
          <div className="mb-4 space-y-2">
            {busy && (
              <div className="text-sm rounded border border-zinc-700 bg-zinc-900 px-3 py-2">
                {busy}
              </div>
            )}
            {toast && !busy && (
              <div className="text-sm rounded border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-emerald-200">
                {toast}
                <button
                  className="ml-2 underline text-xs"
                  onClick={() => setToast(null)}
                >
                  dismiss
                </button>
              </div>
            )}
            {error && (
              <div className="text-sm rounded border border-red-800 bg-red-950/40 px-3 py-2 text-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <div className="text-center py-20 text-zinc-500">
            No articles. Click <span className="text-zinc-300">Ingest</span> to fetch RSS.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((a) => {
              const body = a.ai_summary ?? stripHtml(a.summary ?? "");
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-medium text-zinc-100 hover:text-blue-400 leading-snug"
                    >
                      {a.title}
                    </a>
                    {a.ai_summary && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-800">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">
                    {a.source} · {formatDate(a.published_at)}
                  </div>
                  {body && (
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
