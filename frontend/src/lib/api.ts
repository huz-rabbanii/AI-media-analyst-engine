export type Article = {
  id: number;
  url: string;
  title: string;
  source: string;
  summary: string | null;
  ai_summary: string | null;
  published_at: string | null;
  fetched_at: string;
};

export type IngestResult = {
  inserted: number;
  skipped: number;
  errors: { feed: string; error: string }[];
};

export type SummarizeResult = {
  candidates: number;
  summarized: number;
  skipped_short: number;
  failed: { id: number; url: string; error: string }[];
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchArticles(limit = 100): Promise<Article[]> {
  const res = await fetch(`${BASE}/articles?limit=${limit}`, { cache: "no-store" });
  return handle<Article[]>(res);
}

export async function fetchSources(): Promise<string[]> {
  const res = await fetch(`${BASE}/sources`, { cache: "no-store" });
  const body = await handle<{ sources: string[] }>(res);
  return body.sources;
}

export async function runIngest(): Promise<IngestResult> {
  const res = await fetch(`${BASE}/ingest`, { method: "POST" });
  return handle<IngestResult>(res);
}

export async function runSummarize(limit = 10): Promise<SummarizeResult> {
  const res = await fetch(`${BASE}/summarize?limit=${limit}`, { method: "POST" });
  return handle<SummarizeResult>(res);
}

export type Trend = {
  topic: string;
  summary: string;
  article_ids: number[];
};

export type TrendsResult = {
  trends: Trend[];
  analyzed: number;
  cached?: boolean;
};

export type Citation = {
  id: number;
  title: string;
  url: string;
  source: string;
};

export type ChatResult = {
  answer: string;
  citations: Citation[];
};

export async function fetchTrends(
  limit = 30,
  refresh = false
): Promise<TrendsResult> {
  const url = `${BASE}/trends?limit=${limit}${refresh ? "&refresh=true" : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  return handle<TrendsResult>(res);
}

export async function askChat(question: string): Promise<ChatResult> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handle<ChatResult>(res);
}
