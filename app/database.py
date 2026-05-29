"""Database engine, session factory, and lightweight schema migrations."""

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)


def _migrate_sqlite_add_columns() -> None:
    """Idempotent column adds for SQLite. No-op for other backends."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    with engine.begin() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(article)"))}
        if cols and "ai_summary" not in cols:
            conn.execute(text("ALTER TABLE article ADD COLUMN ai_summary TEXT"))


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite_add_columns()


def get_session():
    with Session(engine) as session:
        yield session
