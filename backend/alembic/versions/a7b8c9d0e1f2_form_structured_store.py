"""form structured store — responses/answers as rows, not flattened prose

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-07

Form submissions arrive from Tally already structured (question id, type,
per-question answer) and the ingest pipeline flattens all of it into one
markdown blob per respondent. That makes aggregate questions ("what are people
struggling with most") unanswerable: top-k vector search returns a *sample* of
respondents, never the population, and one embedding per submission averages a
dozen unrelated answers into semantic mush.

These tables keep the structure so counts come from SQL and free text stays
individually addressable. The existing `documents` chunks are still written
unchanged — this is a dual-write, so retrieval keeps working exactly as before
and nothing user-visible changes in this migration.

Only short_text/long_text answers carry an embedding: choice, rating and
numeric answers are aggregated with GROUP BY, so embedding them would be spend
with no query that uses it. `text_hash` lets a re-sync reuse an existing
embedding when the answer text has not changed.

`raw_value` (JSONB) preserves the original payload for every answer regardless
of type, so a question shape we normalise imperfectly today (MATRIX, and
anything Tally adds later) is never lost — the typed columns are an index over
the raw value, not a replacement for it.

RLS mirrors `documents` (8a3c2d5e6f20) and `document_files` (e5f6a7b8c9d0):
same athena_app role, same org_isolation policy shape, since this is tenant
data.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "athena_app"
EMBED_DIM = 768

_TABLES = ("form_definitions", "form_questions", "form_responses", "form_answers")


def _protect(table: str) -> None:
    """Grant the app role access, then force org isolation on every row."""
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO {APP_ROLE}")
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY org_isolation ON {table}
        USING (org_id = current_setting('athena.org_id', true))
        WITH CHECK (org_id = current_setting('athena.org_id', true))
        """
    )


def upgrade() -> None:
    op.create_table(
        "form_definitions",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(), nullable=False, server_default="tally"),
        sa.Column("form_id", sa.String(), nullable=False),
        sa.Column("name", sa.String()),
        sa.Column("response_count", sa.Integer(), server_default="0"),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "form_id", name="uq_form_definitions_org_form"),
    )

    op.create_table(
        "form_questions",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("form_id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("label", sa.Text()),
        # Normalised bucket the aggregates key off.
        sa.Column("kind", sa.String(), nullable=False, server_default="other"),
        # Tally's own type string, kept so a mis-normalised question is
        # diagnosable and re-mappable without another API round trip.
        sa.Column("raw_type", sa.String()),
        sa.Column("position", sa.Integer()),
        sa.UniqueConstraint("org_id", "form_id", "question_id", name="uq_form_questions_org_form_question"),
    )
    op.create_index("ix_form_questions_org_form", "form_questions", ["org_id", "form_id"])

    op.create_table(
        "form_responses",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("form_id", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("respondent_id", sa.String()),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("is_completed", sa.Boolean()),
        # The `documents.doc_id` this submission also produced, so a structured
        # row and its RAG chunk can be reconciled in either direction.
        sa.Column("doc_id", sa.String()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "form_id", "external_id", name="uq_form_responses_org_form_external"),
    )
    op.create_index("ix_form_responses_org_form_submitted", "form_responses", ["org_id", "form_id", "submitted_at"])

    op.create_table(
        "form_answers",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "response_id", postgresql.UUID(),
            sa.ForeignKey("form_responses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("form_id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="other"),
        # Typed projections of raw_value. Exactly one is normally populated.
        sa.Column("answer_text", sa.Text()),
        sa.Column("answer_numeric", sa.Numeric()),
        sa.Column("answer_choices", postgresql.ARRAY(sa.Text())),
        sa.Column("raw_value", postgresql.JSONB()),
        # Free-text answers only — see module docstring.
        sa.Column("embedding", Vector(EMBED_DIM)),
        sa.Column("text_hash", sa.String()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("response_id", "question_id", name="uq_form_answers_response_question"),
    )
    op.create_index("ix_form_answers_org_form_question", "form_answers", ["org_id", "form_id", "question_id"])
    # Partial: only free-text rows are ever embedded, so the index stays small.
    op.create_index(
        "ix_form_answers_text_hash", "form_answers", ["org_id", "text_hash"],
        postgresql_where=sa.text("text_hash IS NOT NULL"),
    )
    # GIN over choice arrays so "how many picked X" is an index scan.
    op.create_index(
        "ix_form_answers_choices", "form_answers", ["answer_choices"],
        postgresql_using="gin",
    )

    for table in _TABLES:
        _protect(table)


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.execute(f"DROP POLICY IF EXISTS org_isolation ON {table}")
    op.drop_table("form_answers")
    op.drop_table("form_responses")
    op.drop_table("form_questions")
    op.drop_table("form_definitions")
