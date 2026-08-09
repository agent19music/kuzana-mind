"""form question embeddings — match a chat query to the form question it's about

Revision ID: c2d3e4f5a6b7
Revises: b8c9d0e1f2a3
Create Date: 2026-08-09

Retrieval only ever ran one path: embed the query, find the single nearest
`documents` chunk, answer from it. For Tally that chunk is one respondent's
whole submission, so "what's the most common X" or "what's the sentiment on Y"
got answered from whichever one respondent happened to be the closest cosine
match — never the population, even though form_answers/form_themes (a7b8c9d0e1f2,
b8c9d0e1f2a3) already hold the real counts and clustered themes.

This column is what lets retrieval notice a query is *about* a form question at
all: the question label ("Which Linux distribution do you run?") is embedded
once at ingest, so a query can be matched to it by cosine similarity the same
way a query is matched to a document chunk today. Once matched, the answer
comes from a SQL aggregate or form_themes instead of a single submission.

Nullable and backfilled lazily by a normal Tally sync (ingest re-embeds a
question's label whenever the row has no embedding yet), not by this
migration — no reason to block a deploy on re-embedding existing labels.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBED_DIM = 768


def upgrade() -> None:
    op.add_column("form_questions", sa.Column("embedding", Vector(EMBED_DIM)))


def downgrade() -> None:
    op.drop_column("form_questions", "embedding")
