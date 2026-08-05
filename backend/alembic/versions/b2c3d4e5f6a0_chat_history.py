"""chat history: conversations + messages (threaded, multi-turn, RLS)

Revision ID: b2c3d4e5f6a0
Revises: a1b2c3d4e5f0
Create Date: 2026-07-23

Persists chat as resumable threads. `conversations` groups turns; `messages`
holds each user/assistant turn plus the assistant's source metadata (so a
reopened thread rebuilds the same source cards).

Both tables are tenant data, so they get the same row-level-security backstop
as `documents`: org isolation is enforced against the non-superuser `athena_app`
role via the `athena.org_id` GUC (see database.session_for_org). Per-user
privacy (a member sees only their own threads) is an app-layer filter on
user_id — it is within-tenant, not a cross-tenant concern, so it is not RLS's
job. Admin analytics reads org-wide aggregates under the same org scope and is
gated to admins at the API layer.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a0"
down_revision: Union[str, None] = "a1b2c3d4e5f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "athena_app"


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column(
            "id", postgresql.UUID(),
            server_default=sa.text("gen_random_uuid()"), primary_key=True,
        ),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False, server_default="New conversation"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.clerk_org_id"],
            name="fk_conversations_org", ondelete="CASCADE",
        ),
    )
    # Member thread list: this user's threads in this org, most-recent first.
    op.create_index(
        "ix_conversations_org_user_updated",
        "conversations", ["org_id", "user_id", "updated_at"],
    )

    op.create_table(
        "messages",
        sa.Column(
            "id", postgresql.UUID(),
            server_default=sa.text("gen_random_uuid()"), primary_key=True,
        ),
        sa.Column("conversation_id", postgresql.UUID(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),          # "user" | "assistant"
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB()),               # assistant: type/source/staff/score
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"],
            name="fk_messages_conversation", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["org_id"], ["organizations.clerk_org_id"],
            name="fk_messages_org", ondelete="CASCADE",
        ),
    )
    # Thread replay: all turns in a conversation, in order.
    op.create_index(
        "ix_messages_conversation_created",
        "messages", ["conversation_id", "created_at"],
    )
    # Admin analytics: org-wide questions over time (filtered by role='user').
    op.create_index(
        "ix_messages_org_created",
        "messages", ["org_id", "created_at"],
    )

    # --- RLS: org isolation backstop (mirrors documents) ---
    for tbl in ("conversations", "messages"):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl} TO {APP_ROLE}")
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS org_isolation ON {tbl}")
        op.execute(
            f"""
            CREATE POLICY org_isolation ON {tbl}
            USING (org_id = current_setting('athena.org_id', true))
            WITH CHECK (org_id = current_setting('athena.org_id', true))
            """
        )


def downgrade() -> None:
    for tbl in ("messages", "conversations"):
        op.execute(f"DROP POLICY IF EXISTS org_isolation ON {tbl}")
        op.execute(f"ALTER TABLE {tbl} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON {tbl} FROM {APP_ROLE}")
    op.drop_index("ix_messages_org_created", table_name="messages")
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_conversations_org_user_updated", table_name="conversations")
    op.drop_table("conversations")
