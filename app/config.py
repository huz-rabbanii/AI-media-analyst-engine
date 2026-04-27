from pydantic_settings import BaseSettings


DEFAULT_FEEDS = [
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://feeds.arstechnica.com/arstechnica/index",
    "https://hnrss.org/frontpage",
    "https://www.technologyreview.com/feed/",
]


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./media.db"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    SUMMARY_MIN_SOURCE_CHARS: int = 200
    FEEDS: list[str] = DEFAULT_FEEDS

    model_config = {"env_file": ".env"}


settings = Settings()
