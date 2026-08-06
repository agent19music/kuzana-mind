"""tally connector — per-org api key + form ids

Revision ID: d4e5f6a7b8c9
Revises: b2c3d4e5f6a0
Create Date: 2026-08-06

Adds the per-org config columns for the Tally forms connector, mirroring the
existing notion_api_key / public_doc_ids columns. No data backfill needed —
both columns are optional and default to empty for existing orgs.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "b2c3d4e5f6a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("tally_api_key", sa.String(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("tally_form_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "tally_form_ids")
    op.drop_column("organizations", "tally_api_key")
