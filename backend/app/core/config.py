from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://andijan:andijan@localhost:5432/maydoncha"

    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10

    FIRST_ADMIN_PASSWORD: str = "Admin123!"

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    MINI_APP_URL: str = "http://localhost:3000/miniapp"
    BOT_API_SECRET: str = "change-this-bot-secret"
    ADMIN_TELEGRAM_IDS: str = ""

    CONTACT_WEBSITE: str = "maydoncha.uz"
    CONTACT_TELEGRAM: str = "@maydoncha_bot"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
