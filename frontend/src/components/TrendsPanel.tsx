"use client";

import { useState } from "react";
import { fetchTrends, TrendsResult } from "@/lib/api";

export default function TrendsPanel() {
  const [data, setData] = useState<TrendsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTrends(30));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
          Trends
        </h2>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : data ? "Re-analyze" : "Detect trends"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}

      {!data && !error && !loading && (
        <p className="text-xs text-zinc-500">
          Click <span className="text-zinc-300">Detect trends</span> to identify
          themes across your AI-summarized articles.
        </p>
      )}

      {data && (
        <>
          <p className="text-[11px] text-zinc-500 mb-2">
            Analyzed {data.analyzed} articles
          </p>
          {data.trends.length === 0 ? (
            <p className="text-xs text-zinc-500">No trends identified.</p>
          ) : (
            <ul className="space-y-2">
              {data.trends.map((t, i) => (
                <li
                  key={i}
                  className="rounded border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-purple-300 text-sm">
                      {t.topic}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {t.article_ids.length}{" "}
                      {t.article_ids.length === 1 ? "article" : "articles"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {t.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
