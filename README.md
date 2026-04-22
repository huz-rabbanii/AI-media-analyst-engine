# AI Media Analyst Engine

Real-time tech-news ingestion → AI insights → analyst dashboard. Built in vertical slices; each phase is independently runnable.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

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
| GET    | `/articles` | List articles (`?source=`, `?limit=`)    |
| GET    | `/sources`  | Distinct source names                    |

## Verify (Phase 1 success criteria)

```powershell
curl -X POST http://127.0.0.1:8000/ingest
curl http://127.0.0.1:8000/articles?limit=10
```

Expect `inserted >= 10` from `>= 2` distinct sources.

## Next phases (not built yet)

- Phase 2: per-article LLM summaries (`OPENAI_API_KEY` slot already in `.env.example`)
- Phase 3: Vite + React + Tailwind dashboard
- Phase 4: trend detection + AI chat
