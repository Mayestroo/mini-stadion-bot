from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings


def run_migrations() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        return
    cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(cfg, "head")
