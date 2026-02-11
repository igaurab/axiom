"""Add comparisons and comparison_runs tables

Revision ID: 004
Revises: 003
Create Date: 2026-02-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comparisons",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("suite_id", sa.Integer, sa.ForeignKey("benchmark_suites.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "comparison_runs",
        sa.Column("comparison_id", sa.Integer, sa.ForeignKey("comparisons.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("run_id", sa.Integer, sa.ForeignKey("runs.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("comparison_runs")
    op.drop_table("comparisons")
