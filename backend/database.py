import os
from contextlib import contextmanager

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
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
    tally_api_key        = Column(String)                # personal access token, tally.so/help/api
    tally_form_ids       = Column(JSONB, default=list)   # forms to pull submissions from
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
    source_type = Column(String, default="mock")              # "google_docs" | "notion" | "tally" | "upload" | "mock"
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_documents_org_doc", "org_id", "doc_id"),
    )


class DocumentFile(Base):
    """One row per ingested document (not per chunk) — holds preview/storage
    metadata. Only source_type == "upload" rows are populated for now; see
    docs/specs/file-preview-spec.md. Under RLS like `documents`."""
    __tablename__ = "document_files"

    id           = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    org_id       = Column(
        String,
        ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
        nullable=False,
    )
    doc_id       = Column(String, nullable=False)  # same value as DocumentChunk.doc_id
    source_type  = Column(String, nullable=False)
    title        = Column(String)
    storage_path = Column(String, nullable=True)   # GCS object path — null until native preview ships
    mime_type    = Column(String, nullable=True)
    byte_size    = Column(Integer, nullable=True)
    page_count   = Column(Integer, nullable=True)  # PDFs only
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("org_id", "doc_id", name="uq_document_files_org_doc"),
        Index("ix_document_files_org_doc", "org_id", "doc_id"),
    )


class IngestJob(Base):
    """One row per ingestion run — powers /ingest/status and the dashboard feed.

    Deliberately NOT under RLS: it holds no tenant document content, only run
    metadata, and every read is explicitly filtered by org_id. Writes happen
    from run_ingestion under the superuser session, so no athena_app grants are
    needed. The FK cascades cleanly when an org is offboarded.
    """
    __tablename__ = "ingest_jobs"

    id           = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    org_id       = Column(
        String,
        ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status       = Column(String, nullable=False, default="running")  # running | completed | failed
    trigger      = Column(String, default="manual")                   # manual | onboarding | webhook | cron
    documents    = Column(Integer, default=0)
    chunks       = Column(Integer, default=0)
    error        = Column(Text)
    started_at   = Column(DateTime(timezone=True), server_default=func.now())
    finished_at  = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_ingest_jobs_org_started", "org_id", "started_at"),
    )


class Conversation(Base):
    """A resumable chat thread owned by one user within one org.

    Under RLS (org isolation backstop) like documents — read/write only through
    session_for_org(). Per-user privacy (a member sees only their own threads) is
    an app-layer filter on user_id; admin analytics reads org-wide aggregates.
    """
    __tablename__ = "conversations"

    id          = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    org_id      = Column(
        String,
        ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id     = Column(String, nullable=False)                     # clerk_user_id (owner)
    title       = Column(String, nullable=False, default="New conversation")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_conversations_org_user_updated", "org_id", "user_id", "updated_at"),
    )


class Message(Base):
    """One turn in a conversation. Assistant turns carry source metadata in
    `metadata_` (type/source_title/source_doc_id/source_type/staff_*/score) so a
    reopened thread rebuilds the same source and staff cards."""
    __tablename__ = "messages"

    id               = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    conversation_id  = Column(
        UUID,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_id           = Column(
        String,
        ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id          = Column(String, nullable=False)               # owner of the conversation
    role             = Column(String, nullable=False)               # "user" | "assistant"
    content          = Column(Text, nullable=False)
    metadata_        = Column("metadata", JSONB)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
        Index("ix_messages_org_created", "org_id", "created_at"),
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
