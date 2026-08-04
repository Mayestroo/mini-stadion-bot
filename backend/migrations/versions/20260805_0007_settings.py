"""settings table for runtime-configurable platform settings

Revision ID: 20260805_0007
Revises: 20260805_0006
Create Date: 2026-08-05
"""
from alembic import op

revision = "20260805_0007"
down_revision = "20260805_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(80) PRIMARY KEY,
            value VARCHAR(500) NOT NULL,
            description TEXT,
            updated_by INTEGER,
            updated_at TIMESTAMP
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS settings")
