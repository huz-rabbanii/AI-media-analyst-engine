# AI Media Analyst Engine

Real-time tech-news ingestion → AI insights → analyst dashboard. Built in vertical slices; each phase is independently runnable.

Stack: FastAPI · SQLModel · SQLite · OpenAI `gpt-4o-mini` · Next.js 14 · Tailwind.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Dashboard at <http://localhost:3000> (briefing) and `/articles` (raw feed).

## Project layout

```
app/        FastAPI backend (ingest, summarize, intel, db)
frontend/   Next.js dashboard (briefing, articles, chat)
```

## Endpoints

| Method | Path        | Purpose                                  |
|--------|-------------|------------------------------------------|
| GET    | `/health`   | Liveness                                 |
| POST   | `/ingest`   | Pull all configured RSS feeds into DB    |
| POST   | `/summarize`| Generate AI summaries for pending items  |
| GET    | `/articles` | List articles (`?source=`, `?limit=`)    |
| GET    | `/sources`  | Distinct source names                    |
| GET    | `/trends`   | LLM-detected themes (cached 10 min)      |
| POST   | `/chat`     | Q&A grounded in summarized articles      |

## Verify

```powershell
curl -X POST http://127.0.0.1:8000/ingest
curl http://127.0.0.1:8000/articles?limit=10
curl -X POST "http://127.0.0.1:8000/summarize?limit=10"
```

Expect `inserted >= 10` from `>= 2` distinct sources, then non-empty `ai_summary` on at least a few articles.

## Phases shipped

- Phase 1: RSS ingestion + SQLite + FastAPI
- Phase 2: per-article LLM summaries (`OPENAI_API_KEY` slot in `.env.example`)
- Phase 3: Next.js + Tailwind dashboard (briefing + articles)
- Phase 4: trend detection + AI chat (grounded with citations)

## Configuration

Required env vars (see `.env.example`):

- `OPENAI_API_KEY` — needed for `/summarize`, `/trends`, `/chat`
- `OPENAI_MODEL` — defaults to `gpt-4o-mini`
- `DATABASE_URL` — defaults to local SQLite (`media.db`)

## Troubleshooting

- **`/summarize` returns 0 summarized**: many RSS items have descriptions below the 200-character threshold. The endpoint scans all pending items and stops after `limit` successes.
- **CORS errors from frontend**: backend allows `localhost:3000` and `127.0.0.1:3000` only.
- **`OPENAI_API_KEY is not set`**: `.env` must be present in the project root before starting uvicorn.
