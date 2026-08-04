"""booking slot unique constraint

Revision ID: 20261201_0004
Revises: 20261201_0003
Create Date: 2026-12-01
"""
from alembic import op

revision = "20261201_0004"
down_revision = "20261201_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guarded: safe on fresh DBs where create_all already added the constraint.
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_booking_slot') THEN
                ALTER TABLE bookings ADD CONSTRAINT uq_booking_slot UNIQUE (stadium_id, date, start_time);
            END IF;
        END $$
    """)


def downgrade() -> None:
    op.drop_constraint("uq_booking_slot", "bookings", type_="unique")
