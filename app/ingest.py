from datetime import datetime
from time import mktime
from urllib.parse import urlparse

import feedparser
from sqlmodel import Session, select

from app.models import Article


def _parse_date(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        value = entry.get(key)
        if value:
            return datetime.fromtimestamp(mktime(value))
    return None


def _source_from(feed_url: str, parsed_title: str | None) -> str:
    if parsed_title:
        return parsed_title
    return urlparse(feed_url).netloc


def ingest_feeds(feed_urls: list[str], session: Session) -> dict:
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    for url in feed_urls:
        try:
            parsed = feedparser.parse(url)
        except Exception as exc:  # network / parse failure for one feed shouldn't kill the run
            errors.append({"feed": url, "error": str(exc)})
            continue

        source = _source_from(url, parsed.feed.get("title"))

        for entry in parsed.entries:
            link = entry.get("link")
            title = entry.get("title")
            if not link or not title:
                continue

            exists = session.exec(select(Article).where(Article.url == link)).first()
            if exists:
                skipped += 1
                continue

            session.add(Article(
                url=link,
                title=title,
                source=source,
                summary=entry.get("summary"),
                published_at=_parse_date(entry),
            ))
            inserted += 1

    session.commit()
    return {"inserted": inserted, "skipped": skipped, "errors": errors}
