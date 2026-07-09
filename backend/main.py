import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import AuthContext, require_auth, require_backend_secret
from extract import SUPPORTED, extract_text
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
# File upload
# ---------------------------------------------------------------------------

MAX_TOTAL_BYTES = 150 * 1024 * 1024  # 150 MB per request


@app.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    auth_ctx: AuthContext = Depends(require_auth),
):
    """
    Accept one or more files, extract text, chunk, embed, and upsert.
    org_id comes from the verified Clerk JWT — never from the request body.
    """
    from pathlib import Path
    from ingest import chunk_document, embed_text

    org_id = auth_ctx.clerk_org_id

    total_size = sum(f.size or 0 for f in files)
    if total_size > MAX_TOTAL_BYTES:
        raise HTTPException(400, "Total upload exceeds 150 MB")

    docs = []
    skipped = []

    for file in files:
        ext = Path(file.filename or "").suffix.lower()

        if ext not in SUPPORTED:
            skipped.append({"name": file.filename, "reason": f"unsupported type ({ext or 'none'})"})
            continue

        raw = await file.read()

        try:
            text = extract_text(file.filename, raw)
        except ValueError as e:
            skipped.append({"name": file.filename, "reason": str(e)})
            continue

        if not text.strip():
            skipped.append({"name": file.filename, "reason": "no extractable text"})
            continue

        title = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

        docs.append({
            "doc_id": f"upload:{org_id}:{file.filename}",
            "title": title,
            "content": text,
            "source_type": "upload",
        })

    if not docs:
        return {"status": "ok", "uploaded": 0, "chunks": 0, "skipped": skipped}

    from database import DocumentChunk

    all_chunks = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    with get_session() as session:
        upserted = 0
        for chunk in all_chunks:
            embedding = await embed_text(chunk["chunk_text"])

            session.query(DocumentChunk).filter_by(
                doc_id=chunk["doc_id"], org_id=org_id
            ).delete()

            session.add(DocumentChunk(
                org_id=org_id,
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                chunk_text=chunk["chunk_text"],
                embedding=embedding,
                metadata_=chunk["metadata"],
                source_type="upload",
            ))
            upserted += 1

        session.commit()

    return {
        "status": "ok",
        "uploaded": len(docs),
        "chunks": upserted,
        "skipped": skipped,
    }


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


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------

class WaitlistRequest(BaseModel):
    name: str
    email: str
    company: str
    role: str


@app.post("/waitlist")
async def join_waitlist(body: WaitlistRequest):
    import httpx
    from database import Waitlist, get_session
    from sqlalchemy.exc import IntegrityError

    if "@" not in body.email or "." not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email format")

    email = body.email.lower().strip()

    with get_session() as session:
        try:
            waitlist_entry = Waitlist(
                name=body.name.strip(),
                email=email,
                company=body.company.strip(),
                role=body.role.strip()
            )
            session.add(waitlist_entry)
            session.commit()
        except IntegrityError:
            session.rollback()
            return {"status": "duplicate", "message": "You're already on the waitlist!"}

    AUTOSEND_API_KEY = os.getenv("AUTOSEND_API_KEY", "")
    AUTOSEND_TEMPLATE_ID = os.getenv("AUTOSEND_TEMPLATE_ID", "")

    if AUTOSEND_API_KEY and AUTOSEND_TEMPLATE_ID:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.autosend.com/v1/mails/send",
                headers={
                    "Authorization": f"Bearer {AUTOSEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "to": email,
                    "template_id": AUTOSEND_TEMPLATE_ID,
                    "dynamicData": {
                        "name": body.name.strip(),
                        "company": body.company.strip(),
                        "role": body.role.strip()
                    }
                },
            )

        if resp.status_code >= 400:
            print(f"Autosend error {resp.status_code}: {resp.text}")

    return {"status": "success", "message": "You're on the waitlist!"}
