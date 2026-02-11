"""Add run_group and run_number to runs

Revision ID: 003
Revises: 002
Create Date: 2026-02-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("run_group", sa.String(64), nullable=True))
    op.add_column("runs", sa.Column("run_number", sa.Integer, server_default="1"))
    op.create_index("ix_runs_run_group", "runs", ["run_group"])


def downgrade() -> None:
    op.drop_index("ix_runs_run_group", table_name="runs")
    op.drop_column("runs", "run_number")
    op.drop_column("runs", "run_group")
