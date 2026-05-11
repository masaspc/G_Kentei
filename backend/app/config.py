from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://g_kentei:change_me@postgres:5432/g_kentei"
    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    auth_username: str = "admin"
    auth_password_hash: str = ""  # bcrypt hash; empty disables login

    anthropic_api_key: str = ""
    anthropic_haiku_model: str = "claude-haiku-4-5"
    anthropic_sonnet_model: str = "claude-sonnet-4-6"

    monthly_api_budget_usd: float = 10.0  # hard stop for Claude spending

    discord_webhook_url: str = ""
    notification_webhook_secret: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
