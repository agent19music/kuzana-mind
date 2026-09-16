"""tally oauth refresh fields

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-09-15

Stores Tally OAuth refresh metadata. The access token continues to live in
organizations.tally_api_key so existing ingest/sync paths keep working for both
personal access tokens and OAuth access tokens.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("tally_oauth_refresh_token", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("tally_oauth_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("tally_oauth_scope", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "tally_oauth_scope")
    op.drop_column("organizations", "tally_oauth_expires_at")
    op.drop_column("organizations", "tally_oauth_refresh_token")
