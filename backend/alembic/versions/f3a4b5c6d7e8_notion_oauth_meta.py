"""notion oauth workspace metadata

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-09-15

Optional workspace labels for Notion OAuth connects. Access token continues to
live in organizations.notion_api_key (same as internal integration tokens).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("notion_workspace_id", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("notion_workspace_name", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("notion_oauth", sa.Boolean(), server_default=sa.false(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("organizations", "notion_oauth")
    op.drop_column("organizations", "notion_workspace_name")
    op.drop_column("organizations", "notion_workspace_id")
