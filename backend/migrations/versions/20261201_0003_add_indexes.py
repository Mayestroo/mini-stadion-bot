"""add indexes

Revision ID: 20261201_0003
Revises: 20260617_0002
Create Date: 2026-12-01
"""
from alembic import op

revision = "20261201_0003"
down_revision = "20260617_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_users_role_active", "users", ["role", "is_active"])
    op.create_index("ix_stadiums_active_featured", "stadiums", ["is_active", "is_featured"])
    op.create_index("ix_bookings_stadium_date_status", "bookings", ["stadium_id", "date", "status"])


def downgrade() -> None:
    op.drop_index("ix_bookings_stadium_date_status", table_name="bookings")
    op.drop_index("ix_stadiums_active_featured", table_name="stadiums")
    op.drop_index("ix_users_role_active", table_name="users")
