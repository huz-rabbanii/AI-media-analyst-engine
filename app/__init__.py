"""AI Media Analyst Engine backend package.

Modules:
    config:     Settings and default RSS feed list.
    database:   SQLModel engine, session, and lightweight migrations.
    models:     ORM models persisted to the database.
    ingest:     RSS ingestion pipeline.
    summarize:  Per-article LLM summarization.
    intel:      Trend detection and chat over summarized articles.
    main:       FastAPI application entrypoint.
"""
