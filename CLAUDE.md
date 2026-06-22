@AGENTS.md

# Kuzana Brain — Build Plan

---

## Decision Log

| Decision | Resolution |
|---|---|
| Google Workspace access | Not granted for hackathon. Mock data only for MVP. |
| Drive structure | Confirmed: documents live in Shared Drives (easy to access via API later). |
| Drive auth strategy | Service account — documented and stubbed now, wired in post-MVP. |
| Public doc ingestion | Added `PUBLIC_DOC_IDS` env var — fetches any "Anyone with link" Google Doc via export URL, no auth. Demo path. |
| Document types in scope | Google Docs only → parsed to plain text, header-based chunking. |
| Permissions model | Flat — all docs accessible to whole team. No ACL masking. |
| Similarity fallback | If score < threshold → query `staff_directory.json`, never hallucinate. |
| Ingestion schedule | Standalone script, triggered by weekly cron job. |
| Vector DB — MVP | Docker pgvector (`pgvector/pgvector:pg16`) via docker-compose. Zero cost, runs locally. |
| Vector DB — Production | Cloud SQL for PostgreSQL 16 with `pgvector` extension. Same SQL, swap `DATABASE_URL`. |
| Vector DB — Ruled out | Cloud Spanner: no native vector ops, expensive, wrong tool for this use case. |
| Embedding model | Google Gemini `text-embedding-004` (768 dims). CLAUDE.md previously said ada-002 — corrected. |
| Similarity threshold | `0.75` for MVP (cosine similarity). Confirm with stakeholders before production. |

---

## MVP Scope (Hackathon Build)

Build everything real except the Drive connector. The mock layer is a single flag.

### What is real
- FastAPI backend (`main.py`, `retrieval.py`, `ingest.py`)
- pgvector embeddings + similarity search
- Staff directory fallback logic
- Next.js chat UI — source citation card + staff contact card
- Plain-text chunking pipeline (header-based via LangChain)
- Public Google Doc ingestion — set `PUBLIC_DOC_IDS` in `backend/.env`, call `POST /ingest`

### What is mocked
- Google Drive document source → replaced by `backend/sample_docs/*.md` (or public docs via `PUBLIC_DOC_IDS`)
- Google OAuth / service account credentials → not needed until post-MVP

---

## File Structure

```
noc-ava/
├── backend/
│   ├── CLAUDE.md                # Backend-specific build notes (start here for backend work)
│   ├── main.py                  # FastAPI app entrypoint
│   ├── retrieval.py             # pgvector similarity search + fallback logic
│   ├── ingest.py                # Ingestion pipeline (3 modes: public docs, mock, Drive)
│   ├── database.py              # SQLAlchemy model + init_db
│   ├── staff_directory.json     # Static staff fallback data
│   ├── sample_docs/             # Local markdown docs (used when USE_MOCK=true)
│   ├── requirements.txt
│   └── Dockerfile
└── app/                         # Next.js App Router (frontend)
    ├── chat/page.tsx            # Chat UI
    ├── api/chat/route.ts        # Proxy to FastAPI backend
    └── components/chat/         # DocumentCard, StaffCard
```

---

## Service Account Integration Plan (Post-MVP)

This is the exact path to wire in real Drive access. Nothing in the core pipeline changes.

### Step 1 — GCP Setup (stakeholder does this)
1. Create a GCP service account in their project.
2. Grant it **Viewer** role on the target Shared Drive(s) — not the whole org.
3. Download the JSON key file → stored as `GOOGLE_SERVICE_ACCOUNT_JSON` env var in Cloud Run.

### Step 2 — Code change (one flag flip in `ingest.py`)

```python
# ingest.py
import os

USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"

def load_documents():
    if USE_MOCK:
        return load_from_local("sample_docs/")
    return load_from_google_drive(
        folder_id=os.getenv("DRIVE_FOLDER_ID"),
        service_account_json=os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON"),
    )
```

Set `USE_MOCK=false` + supply the two env vars in Cloud Run → done.

### Step 3 — Drive API call (already written, just dormant)

```python
from googleapiclient.discovery import build
from google.oauth2 import service_account
import json

def load_from_google_drive(folder_id: str, service_account_json: str):
    creds_info = json.loads(service_account_json)
    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    service = build("drive", "v3", credentials=creds)

    results = service.files().list(
        q=f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false",
        fields="files(id, name, modifiedTime)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
    ).execute()

    return results.get("files", [])
```

### Step 4 — Weekly cron (Cloud Scheduler)
- Cloud Scheduler hits `POST /ingest` on the Cloud Run service once a week.
- The endpoint runs the full pipeline: fetch → parse → chunk → embed → upsert to pgvector.

---

## Open Stakeholder Questions (Bring to Next Session)

These are **not blockers for the hackathon** but must be resolved before production handoff.

### High Priority
- What is the similarity threshold value? (Start with `0.75` for MVP, confirm with them.)
- Who owns `staff_directory.json`? Is there an existing staff list we can seed it from?
- Which Shared Drive folder IDs are in scope? (Even one real ID helps validate the connector post-demo.)

### Medium Priority
- Should source citations link back to the original Google Doc URL?
- Multi-turn chat or single-shot Q&A for MVP?
- GCP project ID and region for Cloud Run deployment?

### Lower Priority (Post-MVP)
- Soft-delete vs. hard purge when a doc is removed from Drive?
- Query logging for audit/improvement?
- Google SSO on the chat UI?
