"""notification hardening baseline

Revision ID: 20260617_0001
Revises: 
Create Date: 2026-06-17
"""
from alembic import op

revision = "20260617_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'booked_users'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'stadium_customers'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_text VARCHAR(80)")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500)")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS parse_mode VARCHAR(20)")
    op.execute("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stadium_id INTEGER REFERENCES stadiums(id)")
    op.execute("ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP")
    op.execute("ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP")
    op.execute("CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action VARCHAR(120) NOT NULL, entity_type VARCHAR(80), entity_id INTEGER, metadata_json JSON DEFAULT '{}'::json, created_at TIMESTAMP NOT NULL DEFAULT NOW())")


def downgrade() -> None:
    pass
