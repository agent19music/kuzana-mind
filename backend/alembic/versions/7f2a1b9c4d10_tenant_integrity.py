"""tenant integrity: org_id NOT NULL + FK, composite index, drive_folder_id

Revision ID: 7f2a1b9c4d10
Revises: 19cab987d520
Create Date: 2026-07-19

Enforces tenant isolation at the schema level:
  - organizations.drive_folder_id column (per-org service-account Drive) [C1]
  - purge tenantless / orphan document rows, then documents.org_id NOT NULL [A2]
  - FK documents.org_id -> organizations.clerk_org_id ON DELETE CASCADE [A2]
  - composite index (org_id, doc_id) for the upsert/stats paths [A2]

Guarded with inspector checks so it is safe on the pre-Alembic production DB.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7f2a1b9c4d10"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # C1: per-org Drive folder
    org_cols = [c["name"] for c in insp.get_columns("organizations")]
    if "drive_folder_id" not in org_cols:
        op.add_column("organizations", sa.Column("drive_folder_id", sa.String(), nullable=True))

    # A2: remove rows that cannot be attributed to a live org, then lock org_id down.
    op.execute("DELETE FROM documents WHERE org_id IS NULL")
    op.execute(
        """
        DELETE FROM documents d
        WHERE NOT EXISTS (
            SELECT 1 FROM organizations o WHERE o.clerk_org_id = d.org_id
        )
        """
    )
    op.alter_column("documents", "org_id", existing_type=sa.String(), nullable=False)

    # Postgres FKs require a UNIQUE CONSTRAINT on the target; the initial migration
    # created only a unique *index* on clerk_org_id, which is not sufficient.
    uqs = [c["name"] for c in insp.get_unique_constraints("organizations")]
    if "uq_organizations_clerk_org_id" not in uqs:
        op.create_unique_constraint(
            "uq_organizations_clerk_org_id", "organizations", ["clerk_org_id"]
        )

    fks = [fk["name"] for fk in insp.get_foreign_keys("documents")]
    if "fk_documents_org" not in fks:
        op.create_foreign_key(
            "fk_documents_org",
            "documents",
            "organizations",
            ["org_id"],
            ["clerk_org_id"],
            ondelete="CASCADE",
        )

    idxs = [i["name"] for i in insp.get_indexes("documents")]
    if "ix_documents_org_doc" not in idxs:
        op.create_index("ix_documents_org_doc", "documents", ["org_id", "doc_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if "ix_documents_org_doc" in [i["name"] for i in insp.get_indexes("documents")]:
        op.drop_index("ix_documents_org_doc", table_name="documents")
    if "fk_documents_org" in [fk["name"] for fk in insp.get_foreign_keys("documents")]:
        op.drop_constraint("fk_documents_org", "documents", type_="foreignkey")
    if "uq_organizations_clerk_org_id" in [c["name"] for c in insp.get_unique_constraints("organizations")]:
        op.drop_constraint("uq_organizations_clerk_org_id", "organizations", type_="unique")
    op.alter_column("documents", "org_id", existing_type=sa.String(), nullable=True)
    if "drive_folder_id" in [c["name"] for c in insp.get_columns("organizations")]:
        op.drop_column("organizations", "drive_folder_id")
