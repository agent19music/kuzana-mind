import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import AuthContext, require_auth, require_backend_secret
from database import DocumentChunk, get_session
from ingest import run_ingestion
from retrieval import answer_query


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import init_db
    init_db()
    yield


app = FastAPI(title="Athena API", lifespan=lifespan)

_cors_origins = os.getenv("CORS_ORIGINS", "*")
_allow_origins = [o.strip() for o in _cors_origins.split(",")] if _cors_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    query: str
    org_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    type: str                       # "document" | "staff_fallback"
    source_title: str | None = None
    source_doc_id: str | None = None
    source_type: str | None = None  # "google_docs" | "notion" | "mock"
    staff_name: str | None = None
    staff_email: str | None = None
    staff_domain: str | None = None
    staff_title: str | None = None
    staff_department: str | None = None
    similarity_score: float | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats")
def stats(auth_ctx: AuthContext = Depends(require_auth)):
    org_id = auth_ctx.clerk_org_id
    db = get_session()
    try:
        chunk_count = db.query(DocumentChunk).filter(DocumentChunk.org_id == org_id).count()
        last_chunk = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.org_id == org_id)
            .order_by(DocumentChunk.created_at.desc())
            .first()
        )
        source_rows = (
            db.query(DocumentChunk.source_type)
            .filter(DocumentChunk.org_id == org_id)
            .distinct()
            .all()
        )
    finally:
        db.close()

    return {
        "chunk_count": chunk_count,
        "last_synced": last_chunk.created_at.isoformat() if last_chunk else None,
        "source_types": [r[0] for r in source_rows if r[0]],
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    auth_ctx: AuthContext = Depends(require_auth),
):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    # org_id comes from the verified JWT — never trust the request body
    return await answer_query(request.query, org_id=auth_ctx.clerk_org_id)


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

class IngestRequest(BaseModel):
    org_id: str | None = None
    org_name: str | None = None
    org_logo_url: str | None = None
    notion_api_key: str | None = None
    notion_root_page_id: str | None = None
    public_doc_ids: list[str] | None = None


@app.post("/ingest")
async def ingest(
    request: IngestRequest | None = None,
    _: None = Depends(require_backend_secret),
):
    """
    Trigger the ingestion pipeline.
    Called with no body for env-var-based runs (cron, CLI).
    Called with a body when an org connects via the onboarding form.
    """
    req = request or IngestRequest()
    result = await run_ingestion(
        org_id=req.org_id,
        org_name=req.org_name,
        org_logo_url=req.org_logo_url,
        notion_api_key=req.notion_api_key,
        notion_root_page_id=req.notion_root_page_id,
        public_doc_ids=req.public_doc_ids,
    )
    return result


# ---------------------------------------------------------------------------
# Clerk webhooks — syncs org/member events to local DB
# ---------------------------------------------------------------------------

@app.post("/webhooks/clerk")
async def clerk_webhook(request: Request):
    """
    Receives Clerk webhook events (org created/updated, membership changes).
    Signature verification added in Phase 4 when staff management is wired.
    """
    payload = await request.json()
    event_type = payload.get("type", "")
    print(f"Clerk webhook received: {event_type}")
    # Phase 4: handle organization.created, organizationMembership.created, etc.
    return {"received": True}
