from sqlalchemy import text

from app.core.database import engine


def ensure_runtime_schema() -> None:
    statements = [
        "DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'booked_users'; EXCEPTION WHEN undefined_object THEN NULL; END $$",
        "DO $$ BEGIN ALTER TYPE broadcastaudience ADD VALUE IF NOT EXISTS 'stadium_customers'; EXCEPTION WHEN undefined_object THEN NULL; END $$",
        "ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)",
        "ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_text VARCHAR(80)",
        "ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500)",
        "ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS parse_mode VARCHAR(20)",
        "ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS stadium_id INTEGER REFERENCES stadiums(id)",
        "ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP",
        "ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP",
        "CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action VARCHAR(120) NOT NULL, entity_type VARCHAR(80), entity_id INTEGER, metadata_json JSON DEFAULT '{}'::json, created_at TIMESTAMP NOT NULL DEFAULT NOW())",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
