"use client";

import { useState } from "react";
import { askChat, ChatResult } from "@/lib/api";

export default function ChatBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await askChat(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 mb-4">
      <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-3">
        Ask the corpus
      </h2>

      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
          placeholder='e.g. "What is happening with Meta?"'
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="text-sm px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-300 bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {result.answer}
          </p>
          {result.citations.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Sources
              </div>
              <ul className="space-y-1">
                {result.citations.map((c) => (
                  <li key={c.id} className="text-xs">
                    <span className="text-zinc-500">[{c.id}]</span>{" "}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {c.title}
                    </a>{" "}
                    <span className="text-zinc-600">— {c.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
