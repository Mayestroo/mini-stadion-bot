"""stadium map links (google/yandex custom URLs)

Revision ID: 20260805_0008
Revises: 20260805_0007
Create Date: 2026-08-05
"""
from alembic import op

revision = "20260805_0008"
down_revision = "20260805_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("stadiums", "stadium_drafts"):
        # ADD COLUMN IF NOT EXISTS is a no-op on SQLite in tests — guarded with
        # a runtime check for portability.
        for column in ("google_map_link", "yandex_map_link"):
            op.execute(
                f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = '{table}' AND column_name = '{column}'
                    ) THEN
                        ALTER TABLE {table} ADD COLUMN {column} VARCHAR(500);
                    END IF;
                END $$;
                """
            )


def downgrade() -> None:
    for table in ("stadiums", "stadium_drafts"):
        for column in ("google_map_link", "yandex_map_link"):
            op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {column}")
