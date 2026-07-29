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
    op.create_unique_constraint("uq_booking_slot", "bookings", ["stadium_id", "date", "start_time"])


def downgrade() -> None:
    op.drop_constraint("uq_booking_slot", "bookings", type_="unique")
