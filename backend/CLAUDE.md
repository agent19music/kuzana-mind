# Backend — Athena

FastAPI + pgvector service. Handles auth verification, ingestion, embedding, and retrieval.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI | Async, Pydantic v2 models |
| Database | PostgreSQL 16 + pgvector | IVFFlat index on `embedding` column |
| Embeddings | Google Gemini `text-embedding-005` | 768-dim. `RETRIEVAL_DOCUMENT` for ingest, `RETRIEVAL_QUERY` for queries |
| Chunking | LangChain `MarkdownHeaderTextSplitter` | Splits on `#`, `##`, `###` |
| ORM | SQLAlchemy 2.0 (sync session via `get_session`) | Async not used — embedding calls use `asyncio.to_thread` |
| Auth | Clerk JWT (RS256 via JWKS) + X-API-Key | Two paths — see Auth section below |

---

## Key Files

```
backend/
├── main.py              # FastAPI app, CORS, lifespan (init_db on startup), endpoints
├── auth.py              # Clerk JWT verification + require_backend_secret FastAPI dep
├── retrieval.py         # Embedding query → pgvector search → staff fallback
├── ingest.py            # Document loading (Notion / public docs / mock) → chunk → embed → upsert
├── database.py          # SQLAlchemy models: DocumentChunk, Organization, OrganizationMember
├── staff_directory.json # Static staff fallback — never hallucinate, always route here
└── sample_docs/         # Local markdown files used when USE_MOCK=true
```

---

## Auth

Two FastAPI dependencies in `auth.py`:

### `require_auth` — user requests
- Reads `Authorization: Bearer <token>` header
- Fetches Clerk JWKS (cached 1 hour), verifies RS256 signature
- Returns `AuthContext(clerk_user_id, clerk_org_id, org_role)`
- `org_id` for query scoping comes from the **verified JWT** — never from the request body
- Used on: `POST /chat`

### `require_backend_secret` — server-to-server
- Reads `X-API-Key` header, compares to `BACKEND_API_SECRET` env var
- If `BACKEND_API_SECRET` is unset → skipped (open in dev)
- Used on: `POST /ingest`

### `AuthContext`
```python
@dataclass
class AuthContext:
    clerk_user_id: str
    clerk_org_id: str | None
    org_role: str | None   # "org:admin" | "org:member" | None

    @property
    def is_admin(self) -> bool:
        return self.org_role == "org:admin"
```

JWKS URL is auto-derived from `CLERK_PUBLISHABLE_KEY` (base64 decode the suffix) — set `CLERK_JWKS_URL` to override.

---

## Multi-Tenancy

- `DocumentChunk.org_id` tags every chunk with the Clerk org ID
- `retrieval.py::similarity_search()` always filters `WHERE org_id = :org_id` when `org_id` is provided
- `ingest.py::run_ingestion()` scopes deletions to the org before re-inserting
- `database.py::Organization` stores per-org config: `notion_api_key`, `notion_root_page_id`, `public_doc_ids` (JSONB), `logo_url`

---

## Ingestion Modes (additive, multi-source)

`ingest.py::load_documents()` accepts per-request overrides; env vars are the fallback.

1. **Public Google Docs** (`public_doc_ids` param or `PUBLIC_DOC_IDS` env var)
   - Fetches via `https://docs.google.com/document/d/{ID}/export?format=txt`
   - No auth required — doc must be shared as "Anyone with the link can view"

2. **Notion** (`notion_api_key` + `notion_root_page_id` params or env vars)
   - Fetches child pages under the root page via Notion API
   - Converts Notion blocks to markdown for chunking
   - Internal integration token (`ntn_...`)

3. **Google Drive (service account)** — post-MVP
   - Set `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`

4. **Local mock files** (`USE_MOCK=true`)
   - Reads `sample_docs/*.md`
   - Default is now `false` — set `USE_MOCK=true` only for local testing without real keys

Trigger ingestion: `POST /ingest` with `X-API-Key` header. Body is optional (env vars used if omitted).

---

## Retrieval Logic

`retrieval.py::answer_query(query, org_id)`:
1. Embed the query with `RETRIEVAL_QUERY` task type
2. Cosine similarity search via pgvector, filtered by `org_id`
3. If top score ≥ `SIMILARITY_THRESHOLD` (default `0.65`) → return matching chunk
4. Else → `staff_fallback()` topic-matches against `staff_directory.json`

The answer is the raw chunk text, not LLM-synthesised. Fast and traceable.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key — used to derive JWKS URL |
| `CLERK_JWKS_URL` | No | auto-derived | Override JWKS endpoint directly |
| `BACKEND_API_SECRET` | Yes (prod) | — | Shared secret for Next.js → backend calls (X-API-Key) |
| `SIMILARITY_THRESHOLD` | No | `0.65` | Cosine similarity cutoff |
| `USE_MOCK` | No | `false` | Load from `sample_docs/` instead of real sources |
| `PUBLIC_DOC_IDS` | No | `""` | Comma-separated public Google Doc IDs or URLs (global fallback) |
| `NOTION_API_KEY` | No | `""` | Notion integration token (global fallback) |
| `NOTION_ROOT_PAGE_ID` | No | `""` | Notion parent page ID to crawl (global fallback) |
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
# BACKEND_API_SECRET must match or be unset (dev mode)
curl -X POST http://localhost:8000/ingest \
  -H "X-API-Key: <your secret>" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"org_xxx","notion_api_key":"ntn_...","public_doc_ids":["doc_id_1"]}'
```

Or start both together: `docker-compose up`

---

## Extending

- **Add a new staff member:** Edit `staff_directory.json` — no code change needed
- **Swap embedding model:** Change the model string in `ingest.py::_embed_sync` and `retrieval.py::_embed_sync`. Update `database.py` vector dimension if needed
- **Add LLM synthesis:** In `retrieval.py::answer_query`, after finding the best chunk, pass `chunk_text + query` to Gemini's generate API before returning
- **Wire real Drive:** Set `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`
