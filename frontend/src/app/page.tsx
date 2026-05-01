"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Article,
  fetchArticles,
  fetchTrends,
  Trend,
  TrendsResult,
} from "@/lib/api";
import ChatBox from "@/components/ChatBox";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function BriefingPage() {
  const [trends, setTrends] = useState<TrendsResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const articleMap = useMemo(() => {
    const m = new Map<number, Article>();
    for (const a of articles) m.set(a.id, a);
    return m;
  }, [articles]);

  const aiCount = articles.filter((a) => a.ai_summary).length;

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([
        fetchTrends(30, refresh),
        fetchArticles(200),
      ]);
      setTrends(t);
      setArticles(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Today&apos;s briefing
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {trends
              ? `${trends.trends.length} trends across ${trends.analyzed} AI-summarized articles${
                  trends.cached ? " · cached" : ""
                }`
              : "Loading trends…"}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="text-sm px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
        >
          {refreshing ? "Re-analyzing…" : "Re-analyze"}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded border border-red-800 bg-red-950/40 px-3 py-2 text-red-200">
          {error}
        </div>
      )}

      {loading && !trends && (
        <div className="text-center py-20 text-zinc-500">Loading…</div>
      )}

      {trends && trends.trends.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <p className="text-zinc-300 mb-2">No trends yet.</p>
          <p className="text-sm text-zinc-500">
            Head to{" "}
            <Link href="/articles" className="text-emerald-400 hover:underline">
              All articles
            </Link>{" "}
            and click <span className="text-zinc-300">Ingest</span> then{" "}
            <span className="text-zinc-300">Summarize 10</span> to populate the
            corpus.
          </p>
        </div>
      )}

      {trends && trends.trends.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 mb-8">
          {trends.trends.map((t, i) => (
            <TrendCard
              key={i}
              trend={t}
              expanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              articleMap={articleMap}
            />
          ))}
        </section>
      )}

      <div className="border-t border-zinc-800 pt-6">
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
          Stats
        </p>
        <p className="text-sm text-zinc-400">
          {articles.length} articles indexed · {aiCount} AI-summarized ·{" "}
          <Link
            href="/articles"
            className="text-emerald-400 hover:underline"
          >
            View raw feed →
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <ChatBox />
      </div>
    </main>
  );
}

function TrendCard({
  trend,
  expanded,
  onToggle,
  articleMap,
}: {
  trend: Trend;
  expanded: boolean;
  onToggle: () => void;
  articleMap: Map<number, Article>;
}) {
  const cited = trend.article_ids
    .map((id) => articleMap.get(id))
    .filter((a): a is Article => !!a);

  return (
    <article
      className={`rounded-lg border bg-zinc-900/60 transition ${
        expanded
          ? "border-purple-700 md:col-span-2"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-semibold text-purple-300">{trend.topic}</h2>
          <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-800">
            {trend.article_ids.length}{" "}
            {trend.article_ids.length === 1 ? "article" : "articles"}
          </span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{trend.summary}</p>
        <p className="text-[11px] text-zinc-500 mt-2">
          {expanded ? "Hide articles ▲" : "Show articles ▼"}
        </p>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
          {cited.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Cited article IDs not found locally (try Re-analyze).
            </p>
          ) : (
            cited.map((a) => (
              <div
                key={a.id}
                className="rounded border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-zinc-100 hover:text-blue-400 leading-snug block mb-1"
                >
                  {a.title}
                </a>
                <div className="text-[11px] text-zinc-500 mb-1">
                  {a.source}
                  {a.published_at ? ` · ${formatDate(a.published_at)}` : ""}
                </div>
                {a.ai_summary && (
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {a.ai_summary}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}
