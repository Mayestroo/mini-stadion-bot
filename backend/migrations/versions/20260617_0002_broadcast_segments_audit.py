"""broadcast segments and audit follow-up

Revision ID: 20260617_0002
Revises: 20260617_0001
Create Date: 2026-06-17
"""
from alembic import op

revision = "20260617_0002"
down_revision = "20260617_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'booked_users'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'stadium_customers'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stadium_id INTEGER REFERENCES stadiums(id)")
    op.execute("CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action VARCHAR(120) NOT NULL, entity_type VARCHAR(80), entity_id INTEGER, metadata_json JSON DEFAULT '{}'::json, created_at TIMESTAMP NOT NULL DEFAULT NOW())")


def downgrade() -> None:
    pass
