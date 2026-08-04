"""stadium region column + Tashkent backfill

Revision ID: 20260805_0009
Revises: 20260805_0008
Create Date: 2026-08-05
"""
from alembic import op

revision = "20260805_0009"
down_revision = "20260805_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("stadiums", "stadium_drafts"):
        op.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{table}' AND column_name = 'region'
                ) THEN
                    ALTER TABLE {table} ADD COLUMN region VARCHAR(80);
                END IF;
            END $$;
            """
        )
        # Existing Tashkent rows: derive region from the free-text district.
        op.execute(
            f"""
            UPDATE {table}
            SET region = 'Toshkent shahri'
            WHERE region IS NULL
              AND lower(trim(district)) IN (
                  'yunusobod', 'chilonzor', 'yakkasaroy', 'mirzo ulug''bek',
                  'mirobod', 'shayxontohur', 'olmazor', 'bektemir', 'sergeli',
                  'uchtepa', 'yangihayot', 'yashnobod'
              )
            """
        )


def downgrade() -> None:
    for table in ("stadiums", "stadium_drafts"):
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS region")
