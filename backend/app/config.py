from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://nwis_user:nwis_password@localhost:5432/nwis"
    DATABASE_URL_SYNC: str = "postgresql://nwis_user:nwis_password@localhost:5432/nwis"

    # Security
    SECRET_KEY: str = "change_this_secret_key_in_production_min_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # AI Providers
    AI_PROVIDER: str = "ollama"  # openrouter | ollama
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OLLAMA_URL: str = "http://localhost:11434"
    MODEL_NAME: str = "qwen2.5vl:3b"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Storage paths
    STORAGE_ROOT: str = "/app/storage"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"


settings = Settings()
