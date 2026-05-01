from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import settings
from app.database import create_db_and_tables, get_session
from app.ingest import ingest_feeds
from app.intel import chat_over_articles, detect_trends
from app.models import Article
from app.summarize import summarize_pending


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="AI Media Analyst Engine", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
def ingest(session: Session = Depends(get_session)):
    return ingest_feeds(settings.FEEDS, session)


@app.post("/summarize")
def summarize(
    session: Session = Depends(get_session),
    limit: int = Query(default=10, ge=1, le=100),
):
    try:
        return summarize_pending(session, limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/articles", response_model=list[Article])
def list_articles(
    session: Session = Depends(get_session),
    source: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    stmt = select(Article)
    if source:
        stmt = stmt.where(Article.source == source)
    stmt = stmt.order_by(Article.published_at.desc()).limit(limit)
    return session.exec(stmt).all()


@app.get("/sources")
def list_sources(session: Session = Depends(get_session)):
    rows = session.exec(select(Article.source).distinct()).all()
    return {"sources": rows}


@app.get("/trends")
def trends(
    session: Session = Depends(get_session),
    limit: int = Query(default=30, ge=5, le=100),
    refresh: bool = Query(default=False),
):
    try:
        return detect_trends(session, limit, refresh=refresh)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class ChatRequest(BaseModel):
    question: str


@app.post("/chat")
def chat(req: ChatRequest, session: Session = Depends(get_session)):
    q = req.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="question is required")
    try:
        return chat_over_articles(session, q)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
