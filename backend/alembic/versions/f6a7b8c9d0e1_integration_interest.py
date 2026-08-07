"""integration_interest — "Notify me" signups for not-yet-shipped connectors

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-07

Backs the Slack/Confluence "Notify me" buttons on the connections page. This
table is the mailing list: previously the click only flipped local React
state, so nothing was recorded and nobody could ever actually be notified.

No RLS, matching ingest_jobs — this holds no tenant document content, and
every read is app-side filtered by org_id (see require_read_auth).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_interest",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("integration", sa.String(), nullable=False),
        sa.Column("requested_by", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "integration", name="uq_integration_interest_org_integration"),
    )
    op.create_index("ix_integration_interest_org", "integration_interest", ["org_id"])


def downgrade() -> None:
    op.drop_index("ix_integration_interest_org", table_name="integration_interest")
    op.drop_table("integration_interest")
