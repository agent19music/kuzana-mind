"""backfill org_id/source_type on the legacy documents table

Revision ID: c3d4e5f6a7b8
Revises: 19cab987d520
Create Date: 2026-08-06 09:30:00.000000

19cab987d520's create for `documents` is guarded by `if 'documents' not in
existing` — on the production database, which predates Alembic, that guard
was true and the create was skipped entirely, so `documents` never picked up
org_id/source_type there. Every migration downstream (starting with
7f2a1b9c4d10) assumes both columns already exist.

This is a no-op on any database where 19cab987d520 actually created the
table fresh (org_id/source_type already present) — it only backfills
databases that hit the legacy-table guard.

downgrade() is intentionally a no-op. This migration only ever backfills,
never removes — because whether org_id/source_type "belong" to this
migration or to 19cab987d520 depends on which path upgrade() took, and
that's not recoverable from state alone at downgrade time. Undoing it
unconditionally previously double-dropped `ix_documents_org_id`: on a full
downgrade to base, 19cab987d520.downgrade() already drops that same index
(then the whole table) — so nothing here needs to.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "19cab987d520"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("documents")}

    if "org_id" not in cols:
        op.add_column("documents", sa.Column("org_id", sa.String(), nullable=True))
        op.create_index(op.f("ix_documents_org_id"), "documents", ["org_id"], unique=False)

    if "source_type" not in cols:
        op.add_column("documents", sa.Column("source_type", sa.String(), nullable=True))


def downgrade() -> None:
    # See module docstring — deliberately a no-op.
    pass
