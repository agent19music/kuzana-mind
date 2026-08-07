"""form themes — clustered free-text answers with labels, counts and sentiment

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-07

Choice and rating answers already aggregate with GROUP BY once submissions are
stored as rows (a7b8c9d0e1f2). Free text does not: a thousand differently-worded
answers to "what is most painful about your CI" have no natural GROUP BY key,
which is exactly the case a survey is usually run to answer.

These tables hold the answer to that — clusters of semantically similar answers,
each with an LLM-written label, a member count, and a sentiment split. So
"what are people struggling with most" becomes a table read returning
"flaky tests (142), slow builds (88), unclear errors (51)" with drill-down to
the real verbatims, rather than one respondent's answer chosen by cosine
distance to the question.

Clustering is incremental by design: `form_answer_themes` records each
assignment and its distance, so a new sync assigns new answers to existing
themes and only re-clusters a question when the unassigned share crosses a
threshold. Re-clustering thousands of answers on every sync is not viable.

`form_answers.sentiment` is per-answer rather than per-theme so it can be
aggregated by theme *and* by question, and reused across a re-cluster (the text
did not change, so neither did its sentiment).

RLS matches the rest of the tenant tables: same athena_app role, same
org_isolation policy shape.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "athena_app"
EMBED_DIM = 768


def _protect(table: str) -> None:
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
        "form_themes",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("form_id", sa.String(), nullable=False),
        sa.Column("question_id", sa.String(), nullable=False),
        sa.Column("label", sa.String()),
        sa.Column("summary", sa.Text()),
        sa.Column("size", sa.Integer(), server_default="0"),
        # Mean of member embeddings — the target for incremental assignment.
        sa.Column("centroid", Vector(EMBED_DIM)),
        # The adaptive similarity cutoff this theme was clustered under, so
        # incremental assignment reuses the same bar instead of a second
        # hand-picked constant. See themes.adaptive_threshold.
        sa.Column("assign_cutoff", sa.Float()),
        # Cached sentiment split over members, so the insights API does not
        # recompute it per request.
        sa.Column("sentiment_positive", sa.Integer(), server_default="0"),
        sa.Column("sentiment_negative", sa.Integer(), server_default="0"),
        sa.Column("sentiment_neutral", sa.Integer(), server_default="0"),
        # Set when the label was generated, so only changed themes are relabelled.
        sa.Column("labelled_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_form_themes_org_form_question", "form_themes", ["org_id", "form_id", "question_id"])

    op.create_table(
        "form_answer_themes",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "org_id", sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "answer_id", postgresql.UUID(),
            sa.ForeignKey("form_answers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "theme_id", postgresql.UUID(),
            sa.ForeignKey("form_themes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("distance", sa.Float()),
        # One theme per answer today; the unique constraint is what makes a
        # re-assignment an upsert rather than a duplicate.
        sa.UniqueConstraint("answer_id", name="uq_form_answer_themes_answer"),
    )
    op.create_index("ix_form_answer_themes_theme", "form_answer_themes", ["org_id", "theme_id"])

    # Per-answer so it aggregates by theme and by question, and survives a
    # re-cluster: "positive" | "negative" | "neutral".
    op.add_column("form_answers", sa.Column("sentiment", sa.String()))

    for table in ("form_themes", "form_answer_themes"):
        _protect(table)


def downgrade() -> None:
    op.drop_column("form_answers", "sentiment")
    for table in ("form_answer_themes", "form_themes"):
        op.execute(f"DROP POLICY IF EXISTS org_isolation ON {table}")
    op.drop_table("form_answer_themes")
    op.drop_table("form_themes")
