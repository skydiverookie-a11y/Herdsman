from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Ollama
    OLLAMA_HOST: str = "http://host.docker.internal:11434"

    # Auth
    ADMIN_USER: str = "admin"
    ADMIN_PASSWORD: str = "admin"
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # Cache TTL (seconds)
    CACHE_TTL_SEARCH: int = 86400       # 24h
    CACHE_TTL_DETAILS: int = 604800     # 7d

    # VRAM
    TOTAL_VRAM_GB: float = 0.0

    # Database
    DB_PATH: str = "data/herdsman.db"

    model_config = {"env_prefix": "HERDSMAN_", "env_file": ".env"}


settings = Settings()
