from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "CollabSphere API"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5433/collabsphere"
    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: list[str] = ["http://localhost:5173"]
    groq_api_key: str | None = None
    groq_model: str = "llama3-8b-8192"
    groq_timeout_seconds: int = 8

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
