"""ingest_jobs table (ingestion run tracking)

Revision ID: a1b2c3d4e5f0
Revises: 9b4d3e7a1c30
Create Date: 2026-07-20

Records one row per ingestion run (status, doc/chunk counts, error, timing) so
the backend can expose GET /ingest/status and the dashboard can show real sync
activity instead of a hardcoded mock. Not under RLS — see IngestJob docstring.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f0"
down_revision: Union[str, None] = "9b4d3e7a1c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingest_jobs",
        sa.Column(
            "id", postgresql.UUID(),
            server_default=sa.text("gen_random_uuid()"), primary_key=True,
        ),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="running"),
        sa.Column("trigger", sa.String(), server_default="manual"),
        sa.Column("documents", sa.Integer(), server_default="0"),
        sa.Column("chunks", sa.Integer(), server_default="0"),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.clerk_org_id"],
            name="fk_ingest_jobs_org", ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_ingest_jobs_org_started", "ingest_jobs", ["org_id", "started_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_ingest_jobs_org_started", table_name="ingest_jobs")
    op.drop_table("ingest_jobs")
