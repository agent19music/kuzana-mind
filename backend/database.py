import os

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, String, Text, UniqueConstraint, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.sql import func

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://kuzana:kuzana@db:5432/kuzana_brain")

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


class Organization(Base):
    __tablename__ = "organizations"

    id             = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    clerk_org_id   = Column(String, unique=True, nullable=False, index=True)
    name           = Column(String, nullable=False)
    logo_url       = Column(String)
    notion_api_key       = Column(String)
    notion_root_page_id  = Column(String)
    public_doc_ids       = Column(JSONB, default=list)
    avax_audit_enabled   = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id             = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    clerk_user_id  = Column(String, nullable=False, index=True)
    clerk_org_id   = Column(String, nullable=False, index=True)
    email          = Column(String, nullable=False)
    name           = Column(String)
    role           = Column(String, default="member")   # "admin" | "member"
    joined_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("clerk_user_id", "clerk_org_id"),)


class DocumentChunk(Base):
    __tablename__ = "documents"

    id          = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    org_id      = Column(String, nullable=True, index=True)  # clerk_org_id — null for legacy rows
    doc_id      = Column(String, nullable=False, index=True)  # Google Doc ID, Notion page ID, or filename
    title       = Column(String)
    chunk_text  = Column(Text, nullable=False)
    embedding   = Column(Vector(768))                         # gemini-embedding-2 @ 768 dims
    metadata_   = Column("metadata", JSONB)
    source_type = Column(String, default="mock")              # "google_docs" | "notion" | "mock"
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(engine)

    # MVP: skip vector index — exact nearest-neighbor is fast for <100 docs.
    # Add HNSW index when scaling: CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)


def get_session() -> Session:
    return Session(engine)
