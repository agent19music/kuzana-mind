import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func, text

from auth import AuthContext, require_auth, require_backend_secret, require_read_auth
from extract import SUPPORTED, extract_text
from database import Conversation, DocumentChunk, Message, session_for_org
from embeddings import embed_documents
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
    conversation_id: str | None = None   # None → start a new thread


class ChatResponse(BaseModel):
    answer: str
    type: str                       # "document" | "staff_fallback"
    conversation_id: str            # thread this turn belongs to
    source_title: str | None = None
    source_doc_id: str | None = None
    source_type: str | None = None  # "google_docs" | "notion" | "tally" | "mock"
    staff_name: str | None = None
    staff_email: str | None = None
    staff_domain: str | None = None
    staff_title: str | None = None
    staff_department: str | None = None
    similarity_score: float | None = None


# Assistant source/staff metadata persisted per message — everything the answer
# dict carries except the answer text itself, so a reopened thread rebuilds cards.
_META_KEYS = (
    "type", "source_title", "source_doc_id", "source_type",
    "staff_name", "staff_email", "staff_domain", "staff_title",
    "staff_department", "similarity_score",
)


def _title_from(query: str, limit: int = 60) -> str:
    q = " ".join(query.strip().split())
    return q[: limit - 1] + "…" if len(q) > limit else q or "New conversation"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats")
async def stats(auth_ctx: AuthContext = Depends(require_read_auth)):
    org_id = auth_ctx.clerk_org_id
    with session_for_org(org_id) as db:
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

    return {
        "chunk_count": chunk_count,
        "last_synced": last_chunk.created_at.isoformat() if last_chunk else None,
        "source_types": [r[0] for r in source_rows if r[0]],
    }


@app.get("/documents")
async def list_documents(auth_ctx: AuthContext = Depends(require_read_auth)):
    """One row per ingested document (grouped by doc_id) — powers the files page."""
    org_id = auth_ctx.clerk_org_id
    with session_for_org(org_id) as db:
        rows = (
            db.query(
                DocumentChunk.doc_id,
                DocumentChunk.title,
                DocumentChunk.source_type,
                func.count(DocumentChunk.id).label("chunks"),
                func.max(DocumentChunk.created_at).label("last_indexed"),
            )
            .filter(DocumentChunk.org_id == org_id)
            .group_by(DocumentChunk.doc_id, DocumentChunk.title, DocumentChunk.source_type)
            .order_by(func.max(DocumentChunk.created_at).desc())
            .all()
        )

    return {
        "documents": [
            {
                "doc_id": r.doc_id,
                "title": r.title,
                "source_type": r.source_type,
                "chunks": r.chunks,
                "last_indexed": r.last_indexed.isoformat() if r.last_indexed else None,
            }
            for r in rows
        ]
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    auth_ctx: AuthContext = Depends(require_auth),
):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # org_id + user_id come from the verified JWT — never trust the request body.
    org_id = auth_ctx.clerk_org_id
    user_id = auth_ctx.clerk_user_id
    query = request.query.strip()

    # ---- Read phase: resolve the thread + prior turns (for multi-turn) --------
    # Kept separate from the write phase so no DB session is held across the
    # network-bound answer_query() call below.
    history: list[dict] = []
    conversation_id = request.conversation_id
    if conversation_id:
        with session_for_org(org_id) as db:
            convo = db.query(Conversation).filter_by(id=conversation_id).first()
            # Ownership: RLS already scopes to the org; enforce per-user here.
            if not convo or convo.user_id != user_id:
                raise HTTPException(status_code=404, detail="Conversation not found.")
            prior = (
                db.query(Message)
                .filter_by(conversation_id=conversation_id)
                .order_by(Message.created_at.asc())
                .all()
            )
            history = [{"role": m.role, "content": m.content} for m in prior]

    # ---- Answer (network I/O, no DB session held) -----------------------------
    result = await answer_query(query, org_id=org_id, history=history)
    metadata = {k: result[k] for k in _META_KEYS if result.get(k) is not None}

    # ---- Write phase: create thread if new, persist both turns ----------------
    with session_for_org(org_id) as db:
        if conversation_id:
            convo = db.query(Conversation).filter_by(id=conversation_id).first()
            if not convo or convo.user_id != user_id:
                raise HTTPException(status_code=404, detail="Conversation not found.")
            convo.updated_at = func.now()
        else:
            convo = Conversation(
                org_id=org_id, user_id=user_id, title=_title_from(query),
            )
            db.add(convo)
            db.flush()  # assign convo.id
        conversation_id = str(convo.id)

        db.add(Message(
            conversation_id=convo.id, org_id=org_id, user_id=user_id,
            role="user", content=query,
        ))
        db.add(Message(
            conversation_id=convo.id, org_id=org_id, user_id=user_id,
            role="assistant", content=result["answer"], metadata_=metadata,
        ))
        db.commit()

    return ChatResponse(conversation_id=conversation_id, **result)


# ---------------------------------------------------------------------------
# Conversations (chat history) — owner-scoped
# ---------------------------------------------------------------------------

@app.get("/conversations")
async def list_conversations(auth_ctx: AuthContext = Depends(require_auth)):
    """The caller's own threads in this org, most-recent first."""
    org_id, user_id = auth_ctx.clerk_org_id, auth_ctx.clerk_user_id
    with session_for_org(org_id) as db:
        rows = (
            db.query(Conversation)
            .filter(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(100)
            .all()
        )
        return [
            {"id": str(c.id), "title": c.title, "updated_at": c.updated_at.isoformat()}
            for c in rows
        ]


@app.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str, auth_ctx: AuthContext = Depends(require_auth)
):
    """Full transcript of one thread — owner only."""
    org_id, user_id = auth_ctx.clerk_org_id, auth_ctx.clerk_user_id
    with session_for_org(org_id) as db:
        convo = db.query(Conversation).filter_by(id=conversation_id).first()
        if not convo or convo.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        msgs = (
            db.query(Message)
            .filter_by(conversation_id=conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )
        return {
            "id": str(convo.id),
            "title": convo.title,
            "messages": [
                {
                    "id": str(m.id),
                    "role": m.role,
                    "content": m.content,
                    "metadata": m.metadata_ or {},
                    "created_at": m.created_at.isoformat(),
                }
                for m in msgs
            ],
        }


@app.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str, auth_ctx: AuthContext = Depends(require_auth)
):
    org_id, user_id = auth_ctx.clerk_org_id, auth_ctx.clerk_user_id
    with session_for_org(org_id) as db:
        convo = db.query(Conversation).filter_by(id=conversation_id).first()
        if not convo or convo.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        db.delete(convo)  # FK ON DELETE CASCADE removes its messages
        db.commit()


# ---------------------------------------------------------------------------
# Analytics — admin only, org-wide aggregates (no individual chat content)
# ---------------------------------------------------------------------------

@app.get("/analytics")
async def analytics(auth_ctx: AuthContext = Depends(require_auth)):
    if not auth_ctx.is_admin:
        raise HTTPException(status_code=403, detail="Admins only.")
    org_id = auth_ctx.clerk_org_id

    with session_for_org(org_id) as db:
        questions = db.query(Message).filter(
            Message.org_id == org_id, Message.role == "user"
        )
        total_questions = questions.count()

        # Questions per day, last 14 days.
        day = func.date_trunc("day", Message.created_at)
        volume_rows = (
            db.query(day.label("day"), func.count().label("n"))
            .filter(Message.org_id == org_id, Message.role == "user")
            .filter(Message.created_at >= func.now() - text("interval '14 days'"))
            .group_by(day)
            .order_by(day)
            .all()
        )
        volume = [{"day": r.day.date().isoformat(), "count": r.n} for r in volume_rows]

        # Unanswered = assistant turns that fell back to the staff directory.
        unanswered_count = (
            db.query(Message)
            .filter(
                Message.org_id == org_id,
                Message.role == "assistant",
                Message.metadata_["type"].astext == "staff_fallback",
            )
            .count()
        )

        # Top questions (de-identified) — grouped by normalised text.
        norm = func.lower(func.trim(Message.content))
        top_rows = (
            db.query(norm.label("q"), func.count().label("n"))
            .filter(Message.org_id == org_id, Message.role == "user")
            .group_by(norm)
            .order_by(func.count().desc())
            .limit(10)
            .all()
        )
        top_questions = [{"question": r.q, "count": r.n} for r in top_rows]

        active_threads = (
            db.query(Conversation).filter(Conversation.org_id == org_id).count()
        )

    return {
        "total_questions": total_questions,
        "unanswered_count": unanswered_count,
        "active_threads": active_threads,
        "volume": volume,
        "top_questions": top_questions,
    }


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
    drive_folder_id: str | None = None
    tally_api_key: str | None = None
    tally_form_ids: list[str] | None = None
    trigger: str = "manual"


@app.post("/ingest", status_code=202)
async def ingest(
    background_tasks: BackgroundTasks,
    request: IngestRequest | None = None,
    _: None = Depends(require_backend_secret),
):
    """
    Trigger the ingestion pipeline for a single organization.
    Always requires an org_id — ingestion writes tenant-scoped data.

    Runs in the background: the caller gets 202 immediately so onboarding never
    blocks on document loading + embedding (tens of seconds). run_ingestion opens
    an `ingest_jobs` row (status="running") first thing and flips it to
    completed/failed itself, so progress stays observable via GET /ingest/status.
    """
    req = request or IngestRequest()
    if not req.org_id:
        raise HTTPException(status_code=400, detail="org_id is required for ingestion.")
    background_tasks.add_task(
        run_ingestion,
        org_id=req.org_id,
        org_name=req.org_name,
        org_logo_url=req.org_logo_url,
        notion_api_key=req.notion_api_key,
        notion_root_page_id=req.notion_root_page_id,
        public_doc_ids=req.public_doc_ids,
        drive_folder_id=req.drive_folder_id,
        tally_api_key=req.tally_api_key,
        tally_form_ids=req.tally_form_ids,
        trigger=req.trigger,
    )
    return {"status": "started", "org_id": req.org_id}


@app.get("/ingest/status")
async def ingest_status(auth_ctx: AuthContext = Depends(require_read_auth)):
    """
    Recent ingestion runs for the caller's org — powers the connections page
    status and the dashboard activity feed. Explicitly org-filtered.
    """
    from database import IngestJob, get_session

    org_id = auth_ctx.clerk_org_id
    with get_session() as db:
        jobs = (
            db.query(IngestJob)
            .filter(IngestJob.org_id == org_id)
            .order_by(IngestJob.started_at.desc())
            .limit(10)
            .all()
        )
        return {
            "jobs": [
                {
                    "id": str(j.id),
                    "status": j.status,
                    "trigger": j.trigger,
                    "documents": j.documents,
                    "chunks": j.chunks,
                    "error": j.error,
                    "started_at": j.started_at.isoformat() if j.started_at else None,
                    "finished_at": j.finished_at.isoformat() if j.finished_at else None,
                }
                for j in jobs
            ]
        }


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
    from ingest import chunk_document, namespaced_doc_id

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
            "doc_id": namespaced_doc_id("upload", org_id, file.filename),
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

    embeddings = await embed_documents([c["chunk_text"] for c in all_chunks])

    seen_docs: set[str] = set()
    with session_for_org(org_id) as session:
        upserted = 0
        for chunk, embedding in zip(all_chunks, embeddings):
            # Clear a doc's old chunks once, on first sighting — deleting inside
            # the loop would autoflush and drop chunks just inserted for the doc.
            if chunk["doc_id"] not in seen_docs:
                session.query(DocumentChunk).filter_by(
                    doc_id=chunk["doc_id"], org_id=org_id
                ).delete()
                seen_docs.add(chunk["doc_id"])

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
async def clerk_webhook(
    request: Request,
    _: None = Depends(require_backend_secret),
):
    """
    Applies a Clerk webhook event to the local DB (org + membership sync).

    Signature verification happens at the public edge — the Next.js route
    `app/api/webhooks/clerk` verifies the Svix signature with CLERK_WEBHOOK_SECRET
    and forwards the verified `{type, data}` here behind the shared backend secret.
    This endpoint therefore never trusts an unauthenticated caller.
    """
    from database import Organization, OrganizationMember, get_session

    payload = await request.json()
    event_type = payload.get("type", "")
    data = payload.get("data", {}) or {}
    print(f"Clerk webhook: {event_type}")

    def _role_from_clerk(role: str | None) -> str:
        return "admin" if role in ("org:admin", "admin") else "member"

    with get_session() as db:
        if event_type in ("organization.created", "organization.updated"):
            clerk_org_id = data.get("id")
            if not clerk_org_id:
                return {"received": True, "skipped": "no org id"}
            org = db.query(Organization).filter_by(clerk_org_id=clerk_org_id).first()
            name = data.get("name") or (org.name if org else "Unnamed Organisation")
            logo = data.get("image_url") or data.get("logo_url")
            if org:
                org.name = name
                if logo:
                    org.logo_url = logo
            else:
                db.add(Organization(clerk_org_id=clerk_org_id, name=name, logo_url=logo))
            db.commit()

        elif event_type == "organization.deleted":
            clerk_org_id = data.get("id")
            if clerk_org_id:
                # FK ON DELETE CASCADE clears documents + ingest_jobs; members
                # key on the org string separately, so remove them explicitly.
                db.query(OrganizationMember).filter_by(clerk_org_id=clerk_org_id).delete()
                db.query(Organization).filter_by(clerk_org_id=clerk_org_id).delete()
                db.commit()

        elif event_type in ("organizationMembership.created", "organizationMembership.updated"):
            org_data = data.get("organization", {}) or {}
            user_data = data.get("public_user_data", {}) or {}
            clerk_org_id = org_data.get("id")
            clerk_user_id = user_data.get("user_id")
            if not (clerk_org_id and clerk_user_id):
                return {"received": True, "skipped": "missing org/user id"}
            name = " ".join(
                p for p in (user_data.get("first_name"), user_data.get("last_name")) if p
            ).strip() or None
            member = (
                db.query(OrganizationMember)
                .filter_by(clerk_org_id=clerk_org_id, clerk_user_id=clerk_user_id)
                .first()
            )
            if member:
                member.role = _role_from_clerk(data.get("role"))
                if user_data.get("identifier"):
                    member.email = user_data["identifier"]
                if name:
                    member.name = name
            else:
                db.add(OrganizationMember(
                    clerk_user_id=clerk_user_id,
                    clerk_org_id=clerk_org_id,
                    email=user_data.get("identifier") or "",
                    name=name,
                    role=_role_from_clerk(data.get("role")),
                ))
            db.commit()

        elif event_type == "organizationMembership.deleted":
            org_data = data.get("organization", {}) or {}
            user_data = data.get("public_user_data", {}) or {}
            clerk_org_id = org_data.get("id")
            clerk_user_id = user_data.get("user_id")
            if clerk_org_id and clerk_user_id:
                db.query(OrganizationMember).filter_by(
                    clerk_org_id=clerk_org_id, clerk_user_id=clerk_user_id
                ).delete()
                db.commit()

    return {"received": True, "type": event_type}


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
    AUTOSEND_FROM_EMAIL = os.getenv("AUTOSEND_FROM_EMAIL", "")
    AUTOSEND_FROM_NAME = os.getenv("AUTOSEND_FROM_NAME", "Athena")

    if AUTOSEND_API_KEY and AUTOSEND_TEMPLATE_ID and AUTOSEND_FROM_EMAIL:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.autosend.com/v1/mails/send",
                headers={
                    "Authorization": f"Bearer {AUTOSEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "to": {"email": email, "name": body.name.strip()},
                    "from": {"email": AUTOSEND_FROM_EMAIL, "name": AUTOSEND_FROM_NAME},
                    "templateId": AUTOSEND_TEMPLATE_ID,
                    "dynamicData": {
                        "name": body.name.strip(),
                        "company": body.company.strip(),
                        "role": body.role.strip()
                    }
                },
            )

        if resp.status_code >= 400:
            print(f"Autosend error {resp.status_code}: {resp.text}")
    else:
        print("Autosend skipped: missing AUTOSEND_API_KEY, AUTOSEND_TEMPLATE_ID, or AUTOSEND_FROM_EMAIL")

    return {"status": "success", "message": "You're on the waitlist!"}
