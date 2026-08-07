"""document_files — one row per ingested document, for source preview

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-07

Separate from `documents` (the per-chunk table, confusingly already using that
table name for the DocumentChunk model) because multiple chunks share one
doc_id today with no per-document row to hang storage/preview metadata off.

Only `source_type == "upload"` rows get populated for now (see
docs/specs/file-preview-spec.md) — google_docs/notion keep their native
external links, tally/mock have no real "file" to preview.

RLS mirrors the `documents` table exactly (8a3c2d5e6f20): same athena_app
role, same org_isolation policy shape, since this also holds tenant data.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "athena_app"


def upgrade() -> None:
    op.create_table(
        "document_files",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("doc_id", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("title", sa.String()),
        sa.Column("storage_path", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "doc_id", name="uq_document_files_org_doc"),
    )
    op.create_index("ix_document_files_org_doc", "document_files", ["org_id", "doc_id"])

    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON document_files TO {APP_ROLE}")
    op.execute("ALTER TABLE document_files ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE document_files FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY org_isolation ON document_files
        USING (org_id = current_setting('athena.org_id', true))
        WITH CHECK (org_id = current_setting('athena.org_id', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS org_isolation ON document_files")
    op.drop_index("ix_document_files_org_doc", table_name="document_files")
    op.drop_table("document_files")
