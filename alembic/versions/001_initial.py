"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "benchmark_suites",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "queries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("suite_id", sa.Integer, sa.ForeignKey("benchmark_suites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordinal", sa.Integer, nullable=False),
        sa.Column("query_type", sa.String(100), nullable=True),
        sa.Column("query_text", sa.Text, nullable=False),
        sa.Column("expected_answer", sa.Text, nullable=False),
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("function_status", sa.String(50), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
    )

    op.create_table(
        "agent_configs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("executor_type", sa.String(100), nullable=False, server_default="openai_agents"),
        sa.Column("model", sa.String(255), nullable=False),
        sa.Column("system_prompt", sa.Text, nullable=True),
        sa.Column("tools_config", postgresql.JSONB, nullable=True),
        sa.Column("model_settings", postgresql.JSONB, nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("suite_id", sa.Integer, sa.ForeignKey("benchmark_suites.id"), nullable=False),
        sa.Column("agent_config_id", sa.Integer, sa.ForeignKey("agent_configs.id"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("progress_current", sa.Integer, server_default="0"),
        sa.Column("progress_total", sa.Integer, server_default="0"),
        sa.Column("batch_size", sa.Integer, server_default="10"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), server_default="{}", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "results",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("run_id", sa.Integer, sa.ForeignKey("runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("query_id", sa.Integer, sa.ForeignKey("queries.id"), nullable=False),
        sa.Column("agent_response", sa.Text, nullable=True),
        sa.Column("tool_calls", postgresql.JSONB, nullable=True),
        sa.Column("reasoning", postgresql.JSONB, nullable=True),
        sa.Column("usage", postgresql.JSONB, nullable=True),
        sa.Column("execution_time_seconds", sa.Float, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "grades",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("result_id", sa.Integer, sa.ForeignKey("results.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("grade", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("grades")
    op.drop_table("results")
    op.drop_table("runs")
    op.drop_table("agent_configs")
    op.drop_table("queries")
    op.drop_table("benchmark_suites")
