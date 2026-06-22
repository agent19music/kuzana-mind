# Backend — Kuzana Brain

FastAPI + pgvector service. Handles ingestion, embedding, and retrieval.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI | Async, Pydantic v2 models |
| Database | PostgreSQL 16 + pgvector | IVFFlat index on `embedding` column |
| Embeddings | Google Gemini `text-embedding-005` | 768-dim. `RETRIEVAL_DOCUMENT` for ingest, `RETRIEVAL_QUERY` for queries |
| Chunking | LangChain `MarkdownHeaderTextSplitter` | Splits on `#`, `##`, `###` |
| ORM | SQLAlchemy 2.0 (sync session via `get_session`) | Async not used — embedding calls use `asyncio.to_thread` |

---

## Key Files

```
backend/
├── main.py              # FastAPI app, CORS, lifespan (init_db on startup)
├── retrieval.py         # Embedding query → pgvector search → staff fallback
├── ingest.py            # Document loading (3 modes) → chunk → embed → upsert
├── database.py          # SQLAlchemy model (DocumentChunk), init_db, get_session
├── staff_directory.json # Static staff fallback — never hallucinate, always route here
└── sample_docs/         # Local markdown files used when USE_MOCK=true
```

---

## Ingestion Modes (priority order)

`ingest.py::load_documents()` resolves source in this order:

1. **Public Google Docs** (`PUBLIC_DOC_IDS` env var set)
   - Fetches via `https://docs.google.com/document/d/{ID}/export?format=txt`
   - No auth required — doc must be shared as "Anyone with the link can view"
   - Accepts comma-separated IDs or full URLs
   - If `USE_MOCK=true` is also set, sample_docs/ are **augmented** on top

2. **Local mock files** (`USE_MOCK=true`, no `PUBLIC_DOC_IDS`)
   - Reads `sample_docs/*.md`
   - Default for local dev

3. **Google Drive (service account)** (`USE_MOCK=false`, no `PUBLIC_DOC_IDS`)
   - Requires `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` env vars
   - Post-MVP production path

Trigger ingestion: `POST /ingest` (no body). Call this once after startup.

---

## Retrieval Logic

`retrieval.py::answer_query()`:
1. Embed the query with `RETRIEVAL_QUERY` task type
2. Cosine similarity search via pgvector (`1 - (embedding <=> query)`)
3. If top score ≥ `SIMILARITY_THRESHOLD` (default `0.75`) → return matching chunk verbatim
4. Else → `staff_fallback()` topic-matches against `staff_directory.json` → never hallucinates

**Note:** The answer is the raw chunk text, not LLM-synthesized. This is intentional for MVP — fast and traceable.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `USE_MOCK` | No | `true` | Load from `sample_docs/` |
| `SIMILARITY_THRESHOLD` | No | `0.75` | Cosine similarity cutoff |
| `PUBLIC_DOC_IDS` | No | `""` | Comma-separated public Google Doc IDs or URLs |
| `DRIVE_FOLDER_ID` | Post-MVP | — | Google Drive folder ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Post-MVP | — | Service account JSON string |

---

## Running Locally

```bash
# Start DB
docker-compose up db

# In a second terminal
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Trigger ingestion (once DB + backend are up)
curl -X POST http://localhost:8000/ingest
```

Or start both together: `docker-compose up`

---

## Adding Public Google Docs (Demo)

1. Open the Google Doc → Share → change to "Anyone with the link can view"
2. Copy the doc ID (the long string in the URL between `/d/` and `/edit`)
3. Add to `backend/.env`:
   ```
   PUBLIC_DOC_IDS=your_doc_id_here,another_doc_id
   ```
4. Restart backend and call `POST /ingest`

---

## Extending

- **Add a new staff member:** Edit `staff_directory.json` — no code change needed
- **Swap embedding model:** Change the model string in `ingest.py::_embed_sync` and `retrieval.py::_embed_sync`. Update `database.py` vector dimension if needed
- **Add LLM synthesis:** In `retrieval.py::answer_query`, after finding the best chunk, pass `chunk_text + query` to Gemini's generate API before returning
- **Wire real Drive:** Set `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`, deploy to Cloud Run
