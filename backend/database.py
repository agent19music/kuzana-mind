import os

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.sql import func

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://kuzana:kuzana@db:5432/kuzana_brain")

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


class DocumentChunk(Base):
    __tablename__ = "documents"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    doc_id = Column(String, nullable=False, index=True)  # Google Doc ID or mock filename
    title = Column(String)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(768))                      # gemini-embedding-2 @ output_dimensionality=768
    metadata_ = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(engine)

    # MVP: skip vector index — exact nearest-neighbor is fast for <100 docs.
    # Add HNSW index when scaling: CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)


def get_session() -> Session:
    return Session(engine)
