"""users.token_version for JWT invalidation on password change

Revision ID: 20260805_0006
Revises: 20260804_0005
Create Date: 2026-08-05
"""
from alembic import op

revision = "20260805_0006"
down_revision = "20260804_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS token_version")
