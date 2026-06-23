"""add mappings table

Revision ID: 2a3b4c5d6e7f
Revises: bf4aff5441c8
Create Date: 2026-06-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = "2a3b4c5d6e7f"
down_revision: Union[str, Sequence[str], None] = "bf4aff5441c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mappings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("variable", "org_unit", "options", "date_format", name="mapping_types"),
            nullable=False,
        ),
        sa.Column("workflow_id", sa.Integer(), nullable=True),
        sa.Column("file_data", sa.JSON(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=False),
        sa.Column("last_updated", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("is_latest", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_mappings_id"), "mappings", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mappings_id"), table_name="mappings")
    op.drop_table("mappings")
    op.execute("DROP TYPE IF EXISTS mapping_types")
