"""trainings + training_drafts (category 2: sport mashg'ulotlari)

Revision ID: 20260804_0005
Revises: 20261201_0004
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260804_0005"
down_revision = "20261201_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    training_draft_type = postgresql.ENUM("create", "update", name="trainingdrafttype")
    training_draft_type.create(bind, checkfirst=True)

    moderation_status = postgresql.ENUM(
        "draft", "pending", "approved", "rejected",
        name="moderationstatus",
        create_type=False,
    )

    # create_table guards: safe on fresh DBs where create_all ran first.
    if "trainings" not in existing_tables:
        op.create_table(
        "trainings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("stadium_id", sa.Integer(), sa.ForeignKey("stadiums.id"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("sport", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("coach_name", sa.String(200), nullable=True),
        sa.Column("schedule_text", sa.String(300), nullable=True),
        sa.Column("price_text", sa.String(100), nullable=True),
        sa.Column("age_group", sa.String(20), nullable=True),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("telegram", sa.String(100), nullable=True),
        sa.Column("instagram", sa.String(100), nullable=True),
        sa.Column("cover_image", sa.String(300), nullable=True),
        sa.Column("images", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("is_featured", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
    op.execute("CREATE INDEX IF NOT EXISTS ix_trainings_owner_id ON trainings(owner_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trainings_stadium_id ON trainings(stadium_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trainings_title ON trainings(title)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_trainings_slug ON trainings(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trainings_sport ON trainings(sport)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trainings_sport_active ON trainings(sport, is_active)")

    if "training_drafts" not in existing_tables:
        op.create_table(
        "training_drafts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("training_id", sa.Integer(), sa.ForeignKey("trainings.id"), nullable=True),
        sa.Column("stadium_id", sa.Integer(), sa.ForeignKey("stadiums.id"), nullable=True),
        sa.Column("draft_type", training_draft_type, nullable=False),
        sa.Column("status", moderation_status, nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("sport", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("coach_name", sa.String(200), nullable=True),
        sa.Column("schedule_text", sa.String(300), nullable=True),
        sa.Column("price_text", sa.String(100), nullable=True),
        sa.Column("age_group", sa.String(20), nullable=True),
        sa.Column("address", sa.String(300), nullable=True),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("telegram", sa.String(100), nullable=True),
        sa.Column("instagram", sa.String(100), nullable=True),
        sa.Column("cover_image", sa.String(300), nullable=True),
        sa.Column("images", sa.JSON(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        )
    op.execute("CREATE INDEX IF NOT EXISTS ix_training_drafts_owner_id ON training_drafts(owner_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_training_drafts_training_id ON training_drafts(training_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_training_drafts_stadium_id ON training_drafts(stadium_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_training_drafts_status ON training_drafts(status)")


def downgrade() -> None:
    op.drop_table("training_drafts")
    op.drop_table("trainings")
    postgresql.ENUM(name="trainingdrafttype").drop(op.get_bind(), checkfirst=True)
