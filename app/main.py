from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query
from sqlmodel import Session, select

from app.config import settings
from app.database import create_db_and_tables, get_session
from app.ingest import ingest_feeds
from app.models import Article


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="AI Media Analyst Engine", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
def ingest(session: Session = Depends(get_session)):
    return ingest_feeds(settings.FEEDS, session)


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
