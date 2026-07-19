import os
from contextlib import contextmanager

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.sql import func

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://athena:athena@db:5432/athena_brain")

# Non-superuser role that RLS policies are enforced against. The app connects
# as the DB owner/superuser (which bypasses RLS), so org-scoped sessions
# SET LOCAL ROLE to this role inside their transaction — see session_for_org().
APP_ROLE = os.getenv("APP_DB_ROLE", "athena_app")

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
    drive_folder_id      = Column(String)                # per-org service-account Drive folder
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
    org_id      = Column(
        String,
        ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )                                                         # clerk_org_id — tenant owner
    doc_id      = Column(String, nullable=False, index=True)  # Google Doc ID, Notion page ID, or filename
    title       = Column(String)
    chunk_text  = Column(Text, nullable=False)
    embedding   = Column(Vector(768))                         # gemini-embedding-2 @ 768 dims
    metadata_   = Column("metadata", JSONB)
    source_type = Column(String, default="mock")              # "google_docs" | "notion" | "upload" | "mock"
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_documents_org_doc", "org_id", "doc_id"),
    )


class Waitlist(Base):
    __tablename__ = "waitlist"

    id         = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False, index=True)
    company    = Column(String, nullable=False)
    role       = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def init_db():
    # Schema is managed by Alembic. This only ensures the vector extension exists
    # for local dev runs where alembic upgrade head hasn't been called yet.
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()


def get_session() -> Session:
    return Session(engine)


@contextmanager
def session_for_org(org_id: str):
    """
    An org-scoped session for every query that touches tenant data (documents).

    Inside a single transaction it (1) switches to the non-superuser APP_ROLE so
    row-level security is actually enforced, and (2) publishes the org id as the
    `athena.org_id` GUC that the RLS policy reads. If application code ever forgets
    a WHERE org_id filter, the database still returns/writes only this org's rows.

    org_id must be a non-empty string — callers upstream (require_auth) guarantee it.
    """
    if not org_id:
        raise ValueError("session_for_org requires a non-empty org_id")

    session = Session(engine)
    try:
        # SET LOCAL is scoped to the current transaction; both statements begin it.
        session.execute(text(f'SET LOCAL ROLE "{APP_ROLE}"'))
        session.execute(
            text("SELECT set_config('athena.org_id', :org_id, true)"),
            {"org_id": org_id},
        )
        yield session
    finally:
        session.close()
