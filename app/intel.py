import json
import logging
import re

from openai import OpenAI
from sqlmodel import Session, select

from app.config import settings
from app.models import Article


logger = logging.getLogger(__name__)

_STOPWORDS = set(
    "a an the and or but of to in on for with at by from as is are was were be "
    "been being have has had do does did will would can could should may might "
    "must this that these those it its their they them his her our your you we "
    "i he she who what when where why how about into over under more most some "
    "any all not no than then so if".split()
)

_WORD_RE = re.compile(r"[a-z0-9]+")


def _client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _summarized(session: Session, limit: int) -> list[Article]:
    stmt = (
        select(Article)
        .where(Article.ai_summary.is_not(None))
        .order_by(Article.published_at.desc())
        .limit(limit)
    )
    return session.exec(stmt).all()


def detect_trends(session: Session, limit: int = 30) -> dict:
    """Identify trending topics across the most recent AI-summarized articles."""
    arts = _summarized(session, limit)
    if not arts:
        return {"trends": [], "analyzed": 0}

    client = _client()
    corpus = "\n".join(
        f"[{a.id}] ({a.source}) {a.title} — {a.ai_summary}" for a in arts
    )
    system = (
        "You are a tech industry analyst. Identify the top 3-5 trending topics "
        "or themes across the provided articles. Return strict JSON: "
        '{"trends":[{"topic":"<2-5 words>","summary":"<one sentence>",'
        '"article_ids":[<int>,...]}]}. Only use article IDs that appear in the input.'
    )
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": corpus},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    data = json.loads(resp.choices[0].message.content)
    return {"trends": data.get("trends", []), "analyzed": len(arts)}


def _score(question: str, art: Article) -> int:
    q_words = {
        w for w in _WORD_RE.findall(question.lower())
        if w not in _STOPWORDS and len(w) > 2
    }
    if not q_words:
        return 0
    text = f"{art.title} {art.ai_summary or ''}".lower()
    return sum(1 for w in q_words if w in text)


def chat_over_articles(session: Session, question: str, k: int = 8) -> dict:
    """Answer a question grounded in the AI-summarized article corpus."""
    pool = _summarized(session, 100)
    if not pool:
        return {
            "answer": "No summarized articles yet. Run Ingest then Summarize first.",
            "citations": [],
        }

    scored = sorted(((_score(question, a), a) for a in pool), key=lambda x: x[0], reverse=True)
    relevant = [a for s, a in scored[:k] if s > 0] or pool[:k]

    client = _client()
    context = "\n".join(
        f"[{a.id}] ({a.source}, {a.published_at:%Y-%m-%d}) {a.title}\n  {a.ai_summary}"
        for a in relevant
    )
    system = (
        "You are a tech industry analyst. Answer the user's question using ONLY "
        "the article context provided. Cite supporting articles inline as [id]. "
        "If the context does not cover the question, say so plainly. "
        "Be concise: 2-4 sentences."
    )
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ],
        temperature=0.3,
    )
    answer = resp.choices[0].message.content.strip()
    citations = [
        {"id": a.id, "title": a.title, "url": a.url, "source": a.source}
        for a in relevant
    ]
    return {"answer": answer, "citations": citations}
