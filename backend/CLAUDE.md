# Backend — Athena

FastAPI + pgvector service. Handles auth verification, ingestion, embedding, and retrieval.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI | Async, Pydantic v2 models |
| Database | PostgreSQL 16 + pgvector | HNSW (cosine) index on `embedding` — migration `9b4d3e7a1c30` |
| Embeddings | Google Gemini `gemini-embedding-2` @ 768 | Shared `embeddings.py`: batched + retried (backoff), `RETRIEVAL_DOCUMENT` for ingest, `RETRIEVAL_QUERY` for queries |
| Chunking | Header split + `RecursiveCharacterTextSplitter` | Header split for structure, then bound each section to `CHUNK_SIZE_CHARS` (~3000) with `CHUNK_OVERLAP_CHARS` overlap; header breadcrumb kept in metadata + prefixed to chunk text |
| ORM | SQLAlchemy 2.0 (sync session via `get_session`) | Async not used — embedding calls use `asyncio.to_thread` |
| Auth | Clerk JWT (RS256 via JWKS) + X-API-Key | Two paths — see Auth section below |

---

## Key Files

```
backend/
├── main.py              # FastAPI app, CORS, lifespan (init_db on startup), endpoints
├── auth.py              # Clerk JWT verification + require_backend_secret FastAPI dep
├── retrieval.py         # Embedding query → pgvector search → honest no-match fallback
├── ingest.py            # Document loading (Notion / public docs / mock) → chunk → embed → upsert
├── database.py          # SQLAlchemy models: DocumentChunk, Organization, OrganizationMember, IngestJob
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
- **Fails closed:** if `BACKEND_API_SECRET` is unset the endpoint returns 500 (disabled), never open
- Used on: `POST /ingest`, `POST /webhooks/clerk`

### Ingestion status & webhooks
- `GET /ingest/status` (`require_auth`, org-scoped) — recent `ingest_jobs` rows for the caller's org. Powers the connections page + dashboard activity.
- `POST /webhooks/clerk` (`require_backend_secret`) — applies verified Clerk org/membership events to the DB. Svix signature is verified upstream in the Next.js `/api/webhooks/clerk` route, which then forwards `{type, data}` here behind the shared secret.

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

Isolation is enforced at **two layers** — the app never falls back to an unscoped query:

1. **App layer (guardrails):** `require_auth` rejects any token with no `org_id` (403). `similarity_search`, `answer_query`, and `run_ingestion` all require a non-empty `org_id` and raise otherwise. There is no "if org_id else global" branch anymore.
2. **Database layer (RLS backstop):** `documents` has row-level security. Org-scoped requests go through `database.session_for_org(org_id)`, which inside one transaction does `SET LOCAL ROLE athena_app` (a non-superuser role RLS is enforced against — the app's superuser connection bypasses RLS) and `set_config('athena.org_id', org_id, true)`. The `org_isolation` policy restricts every read/write to that org even if a `WHERE org_id` filter is ever dropped. Migrations: `7f2a1b9c4d10` (NOT NULL + FK + composite index), `8a3c2d5e6f20` (role + RLS policy).

> **Production note:** RLS is only a real backstop because queries run under a non-superuser role via `SET LOCAL ROLE`. If you change the connection strategy, keep the app off a superuser/table-owner role for tenant-data queries.

- `DocumentChunk.org_id` — NOT NULL, FK → `organizations.clerk_org_id` `ON DELETE CASCADE` (org offboarding cascades chunks). Composite index `(org_id, doc_id)`.
- `database.py::Organization` per-org config: `notion_api_key`, `notion_root_page_id`, `public_doc_ids` (JSONB), `drive_folder_id`, `logo_url`.

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

3. **Google Drive (service account)**
   - `GOOGLE_SERVICE_ACCOUNT_JSON` is a deployment secret (all tenants share one service account)
   - Folder is **per-org**: `drive_folder_id` in the `/ingest` body → `organizations.drive_folder_id`. `DRIVE_FOLDER_ID` env is only a single-tenant local-dev fallback
   - Each org shares its Drive folder with the service-account email as Viewer

4. **Local mock files** (`USE_MOCK=true`)
   - Reads `sample_docs/*.md`
   - Default is now `false` — set `USE_MOCK=true` only for local testing without real keys

Trigger ingestion: `POST /ingest` with `X-API-Key` header. Body **must** include `org_id` — ingestion is always tenant-scoped and returns 400 without it.

---

## Retrieval Logic

`retrieval.py::answer_query(query, org_id)`:
1. Embed the query with `RETRIEVAL_QUERY` task type (`embeddings.embed_query`)
2. Cosine similarity search via pgvector (HNSW index), org-scoped via `session_for_org`
3. If top score ≥ `SIMILARITY_THRESHOLD` (default `0.75`) → synthesise an answer from the chunk
4. Else → honest "no documentation on this" response. There used to be a
   `staff_fallback()` step here matching against a single global
   `staff_directory.json` of fictional demo employees — it was never
   org-scoped, so every tenant saw the same fake names as if they were real
   contacts. Removed. If a real per-org staff directory gets built, it needs
   its own `organizations`-scoped table, not a shared static file.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key — used to derive JWKS URL |
| `CLERK_JWKS_URL` | No | auto-derived | Override JWKS endpoint directly |
| `CLERK_ISSUER` | No | auto-derived | Expected `iss` claim; derived from the frontend API origin. Set to override |
| `CLERK_AUDIENCE` | No | — | If set, `aud` is verified. Leave unset for default Clerk session tokens (no `aud`) |
| `CLERK_AUTHORIZED_PARTIES` | No | — | Comma-separated allowed `azp` values (your app origins). If set, a token minted for another origin is rejected |
| `BACKEND_API_SECRET` | Yes (prod) | — | Shared secret for Next.js → backend calls (X-API-Key). Guards `/ingest` and `/webhooks/clerk` |
| `CLERK_WEBHOOK_SECRET` | Yes (webhooks) | — | Svix signing secret. Verified in the Next.js `/api/webhooks/clerk` route, which forwards verified events to the backend `/webhooks/clerk` |
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

- **Swap embedding model:** Change the model string in `ingest.py::_embed_sync` and `retrieval.py::_embed_sync`. Update `database.py` vector dimension if needed
- **Add LLM synthesis:** In `retrieval.py::answer_query`, after finding the best chunk, pass `chunk_text + query` to Gemini's generate API before returning
- **Wire real Drive:** Set `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`
