"""HNSW index on documents.embedding (cosine)

Revision ID: 9b4d3e7a1c30
Revises: 8a3c2d5e6f20
Create Date: 2026-07-19

Adds an approximate-nearest-neighbour index so similarity search stops doing a
sequential scan + exact sort on every query. Uses HNSW with cosine ops to match
retrieval's `embedding <=> query` distance operator.

Note: plain CREATE INDEX takes a brief write lock. On a large existing corpus,
build it out-of-band with CREATE INDEX CONCURRENTLY instead (cannot run inside
Alembic's transaction).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9b4d3e7a1c30"
down_revision: Union[str, None] = "8a3c2d5e6f20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "ix_documents_embedding_hnsw"


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if INDEX_NAME not in [i["name"] for i in insp.get_indexes("documents")]:
        op.execute(
            f"CREATE INDEX {INDEX_NAME} ON documents "
            "USING hnsw (embedding vector_cosine_ops)"
        )


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {INDEX_NAME}")
