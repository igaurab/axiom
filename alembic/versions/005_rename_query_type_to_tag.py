"""Rename query_type to tag and drop function_status

Revision ID: 005
Revises: 004
Create Date: 2026-02-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("queries", "query_type", new_column_name="tag")
    op.drop_column("queries", "function_status")


def downgrade() -> None:
    import sqlalchemy as sa
    op.alter_column("queries", "tag", new_column_name="query_type")
    op.add_column("queries", sa.Column("function_status", sa.String(50), nullable=True))
