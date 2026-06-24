from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    VAULT_ADDR: str
    VAULT_TOKEN: str
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @property
    def celery_broker_url(self) -> str:
        return self.CELERY_BROKER_URL or f"{self.REDIS_URL}/0"

    @property
    def celery_result_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or f"{self.REDIS_URL}/1"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
