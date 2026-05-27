from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Article(SQLModel, table=True):
    """A single ingested news article and its optional AI-generated summary."""

    id: Optional[int] = Field(default=None, primary_key=True)
    url: str = Field(unique=True, index=True)
    title: str
    source: str = Field(index=True)
    summary: Optional[str] = None
    ai_summary: Optional[str] = Field(default=None, index=True)
    published_at: Optional[datetime] = Field(default=None, index=True)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
