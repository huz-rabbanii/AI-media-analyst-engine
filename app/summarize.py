import logging
import re
from html import unescape

from openai import OpenAI
from sqlmodel import Session, select

from app.config import settings
from app.models import Article


logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")

_SYSTEM_PROMPT = (
    "You are a tech industry analyst. In exactly two sentences, summarize the "
    "article for an executive reader: first sentence states the news, second "
    "states the strategic implication. No fluff, no hedging, no preamble."
)


def _clean(text: str) -> str:
    return unescape(_TAG_RE.sub(" ", text)).strip()


def _client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _summarize_one(client: OpenAI, title: str, source_text: str) -> str:
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Title: {title}\n\nArticle excerpt:\n{source_text}"},
        ],
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


def summarize_pending(session: Session, limit: int) -> dict:
    """Summarize articles where ai_summary IS NULL. Idempotent."""
    client = _client()

    stmt = (
        select(Article)
        .where(Article.ai_summary.is_(None))
        .order_by(Article.published_at.desc())
    )
    rows = session.exec(stmt).all()

    summarized = 0
    skipped_short = 0
    considered = 0
    failed: list[dict] = []

    for art in rows:
        if summarized >= limit:
            break
        considered += 1
        text = _clean(art.summary or "")
        if len(text) < settings.SUMMARY_MIN_SOURCE_CHARS:
            skipped_short += 1
            continue

        try:
            art.ai_summary = _summarize_one(client, art.title, text)
            session.add(art)
            summarized += 1
        except Exception as exc:
            logger.exception("summarize failed for article id=%s", art.id)
            failed.append({"id": art.id, "url": art.url, "error": str(exc)})

    session.commit()
    return {
        "candidates": considered,
        "summarized": summarized,
        "skipped_short": skipped_short,
        "failed": failed,
    }
