import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest import run_ingestion
from retrieval import answer_query


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import init_db
    init_db()
    yield


app = FastAPI(title="Kuzana Brain API", lifespan=lifespan)

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


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return await answer_query(request.query, org_id=request.org_id)


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
async def ingest(request: IngestRequest | None = None):
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
