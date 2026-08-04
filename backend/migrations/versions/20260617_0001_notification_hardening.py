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
    # Every statement is guarded so this baseline is safe to run on a fresh
    # database (where Base.metadata.create_all has already made the tables)
    # as well as on an older pre-migration schema.
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'booked_users'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'stadium_customers'; EXCEPTION WHEN undefined_object THEN NULL; END $$")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcasts') THEN
                ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
                ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_text VARCHAR(80);
                ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500);
                ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS parse_mode VARCHAR(20);
                ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stadium_id INTEGER REFERENCES stadiums(id);
            END IF;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_recipients') THEN
                ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
                ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP;
            END IF;
        END $$
    """)
    op.execute("CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action VARCHAR(120) NOT NULL, entity_type VARCHAR(80), entity_id INTEGER, metadata_json JSON DEFAULT '{}'::json, created_at TIMESTAMP NOT NULL DEFAULT NOW())")


def downgrade() -> None:
    pass
