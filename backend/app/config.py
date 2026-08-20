import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./paper_generator.db"
    supabase_url: str | None = None
    supabase_key: str | None = None
    llm_provider: str = "local"  # local | claude | openai | byok | mock
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"
    jwt_secret: str = "dev-secret-change-in-production"
    upload_dir: str = "./uploads"
    export_dir: str = "./exports"
    use_mock_llm: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not os.environ.get("DATABASE_URL") and settings.database_url.startswith("sqlite"):
        os.makedirs(os.path.dirname(settings.database_url.replace("sqlite:///", "")) or ".", exist_ok=True)
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.export_dir, exist_ok=True)
    return settings
