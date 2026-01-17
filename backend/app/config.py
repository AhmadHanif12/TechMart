"""Application configuration using Pydantic settings."""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Project Info
    PROJECT_NAME: str = "TechMart Analytics Dashboard"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True

    # Redis
    REDIS_URL: str
    REDIS_MAX_CONNECTIONS: int = 50

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse CORS allowed origins into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000

    # Cache TTLs (in seconds)
    CACHE_TTL_DASHBOARD: int = 300  # 5 minutes
    CACHE_TTL_ANALYTICS: int = 3600  # 1 hour
    CACHE_TTL_PRODUCTS: int = 1800  # 30 minutes
    CACHE_TTL_LOW_STOCK: int = 600  # 10 minutes
    CACHE_TTL_PREDICTIONS: int = 3600  # 1 hour

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Performance
    MAX_CONCURRENT_REQUESTS: int = 1000
    REQUEST_TIMEOUT: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
