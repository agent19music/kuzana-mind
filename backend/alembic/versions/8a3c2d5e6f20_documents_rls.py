"""row-level security on documents (tenant isolation backstop)

Revision ID: 8a3c2d5e6f20
Revises: 7f2a1b9c4d10
Create Date: 2026-07-19

Makes cross-tenant leakage impossible even if application code drops a
WHERE org_id filter. The app connects as the DB owner/superuser (which BYPASSES
RLS), so org-scoped requests SET LOCAL ROLE to the non-superuser `athena_app`
role inside their transaction and publish the org id via the `athena.org_id`
GUC — see database.session_for_org(). The policy below reads that GUC.

Role is created NOLOGIN: it is never connected to directly, only reached via
SET ROLE from the superuser connection.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "8a3c2d5e6f20"
down_revision: Union[str, None] = "7f2a1b9c4d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "athena_app"


def upgrade() -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
                CREATE ROLE {APP_ROLE} NOLOGIN NOINHERIT;
            END IF;
        END $$;
        """
    )
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO {APP_ROLE}")

    op.execute("ALTER TABLE documents ENABLE ROW LEVEL SECURITY")
    # FORCE so the policy also applies if athena_app ever becomes the table owner.
    op.execute("ALTER TABLE documents FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS org_isolation ON documents")
    op.execute(
        """
        CREATE POLICY org_isolation ON documents
        USING (org_id = current_setting('athena.org_id', true))
        WITH CHECK (org_id = current_setting('athena.org_id', true))
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS org_isolation ON documents")
    op.execute("ALTER TABLE documents NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE documents DISABLE ROW LEVEL SECURITY")
    op.execute(f"REVOKE ALL ON documents FROM {APP_ROLE}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {APP_ROLE}")
    # Role intentionally left in place (dropping a role that may be referenced
    # elsewhere is riskier than leaving an unused NOLOGIN role).
