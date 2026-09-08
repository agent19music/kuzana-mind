@AGENTS.md

# Athena — Build Plan

---

## Decision Log

| Decision | Resolution |
|---|---|
| Google Workspace access | Not granted for hackathon. Mock data only for MVP. |
| Drive structure | Confirmed: documents live in Shared Drives (easy to access via API later). |
| Drive auth strategy | Service account — documented and stubbed now, wired in post-MVP. |
| Public doc ingestion | Added `PUBLIC_DOC_IDS` env var — fetches any "Anyone with link" Google Doc via export URL, no auth. Demo path. |
| Document types in scope | Google Docs only → parsed to plain text, header-based chunking. Also Notion, Tally, uploads. |
| Permissions model | Multi-tenant per org. Each org's chunks are tagged with `org_id`; all queries scoped to it. |
| Similarity fallback | Honest no-match when below threshold. Global `staff_directory.json` fallback was removed (not org-scoped). |
| Ingestion schedule | Standalone script / `POST /ingest`, plus product-triggered ingest. |
| Vector DB — local | Docker pgvector (`pgvector/pgvector:pg16`) via `docker-compose.yml`. |
| Vector DB — production | Render Postgres 16 + pgvector (`athena-db`, Frankfurt). Same SQL, `DATABASE_URL` on the Render service. |
| Vector DB — ruled out | Cloud Spanner: no native vector ops. Cloud SQL was the previous production DB (Cloud Run era). |
| Embedding model | Google Gemini `gemini-embedding-2` (768 dims). |
| Similarity threshold | `0.65` (env `SIMILARITY_THRESHOLD`). |
| Auth — frontend | Clerk (`@clerk/nextjs`). `clerkMiddleware` protects non-public routes. |
| Auth — backend | Clerk JWT (RS256 via JWKS) for user requests; `X-API-Key` for server-to-server (Next.js → backend). |
| Wallet / Web3 | Thirdweb removed. Avalanche audit trail specced as separate `backend/audit.py` (post-MVP). |
| Onboarding flow | `/register` → Clerk SignUp → `/onboarding` → POST `/api/orgs` → creates Clerk org + triggers ingest → `/dashboard` |
| Data sources per org | Notion key + root page, public Google Doc URLs, Tally forms, Drive folder, file uploads. |
| Feedback forms | Tally REST connector (not Tally MCP live-lookup): per-org `tally_api_key` + `tally_form_ids`. |
| Production host | **Render** (Docker web service `kuzana-mind`). Not Cloud Run. |
| Deploy switch | GitHub Actions variable `DEPLOY_TARGET`: `render` (live) vs `gcloud` (legacy Cloud Run). See `AGENTS.md`. |
| Observability | Sentry SDK on the FastAPI app. Discord alerts via incoming webhook in `before_send` (Sentry's Discord integration is paid). |
| Local backend | Always containerised. `docker compose up` — do not run host `pip`/`uvicorn` as the primary path. |
| Billing | **Paddle Billing** (USD cards). Starter free; Pro $10/seat; Plus $40/seat (highlighted). Starter/Pro/Plus limits in `backend/billing.py`. Promo `ATHENA-EARLY` grants Pro. No M-Pesa in v1. |

---

## MVP Scope (Hackathon Build)

### What is real
- FastAPI backend (`main.py`, `retrieval.py`, `ingest.py`, `auth.py`)
- pgvector embeddings + similarity search, scoped per org
- Next.js product app (`apps/app`) — chat, dashboard, admin, citations
- Plain-text chunking pipeline (header-based via LangChain)
- Public Google Doc ingestion — per-org `public_doc_ids` array
- Notion ingestion — per-org `notion_api_key` + `notion_root_page_id`
- Tally ingestion — per-org `tally_api_key` + `tally_form_ids`
- File uploads + extraction
- Clerk auth — sign up, sign in, org creation, JWT-gated backend
- Onboarding form — org name, logo, connectors
- Dashboard — org stats, action cards, admin/member role distinction
- Sentry + Discord error pings (free-plan path)
- CI deploy toggle: Render (current) or Cloud Run (legacy)

### What is mocked / post-MVP
- Google Drive service account connector (flag: `USE_MOCK=true` for local sample docs)
- Avalanche on-chain audit trail (spec complete at `docs/specs/avalanche-audit-spec.md`)
- Notion OAuth Path B (spec complete at `docs/specs/notion-oauth-spec.md`)

---

## UI Design Rules — Absolute Constraints

These apply to every component in `apps/app/` (and remaining `app/` marketing leftovers). Violations must be fixed before shipping.

| Rule | Detail |
|---|---|
| **No bold or semibold** | `fontWeight` must be `400` everywhere. `500`, `600`, `700` are banned. |
| **No uppercase text** | `textTransform: "uppercase"` is banned. Labels, nav items, badges — all sentence case. |
| **No excessive letter-spacing** | Never use `letterSpacing` values above `0.02em`. Never pair spacing with uppercase. |
| **Build command** | Always use `pnpm build` to verify — never `npm run build`. |
| **Hierarchy via size/color** | Differentiate elements through `fontSize` and `color`, not weight or case. |

---

## File Structure

```
noc-ava/
├── CLAUDE.md                 # This file — product / decisions
├── AGENTS.md                 # How to run, host, and deploy (Render + toggle)
├── docker-compose.yml        # Local Postgres + backend image
├── .github/workflows/
│   ├── deploy-backend.yml    # DEPLOY_TARGET=render | gcloud
│   └── backend-migrations-check.yml
│
├── backend/                  # FastAPI; production Docker context (Render rootDir)
│   ├── CLAUDE.md
│   ├── main.py
│   ├── billing.py            # Plan catalog, entitlements, capacity checks
│   ├── paddle.py             # Paddle Billing API + webhook signature
│   ├── discord_alerts.py     # Sentry before_send → Discord webhook
│   ├── auth.py
│   ├── retrieval.py
│   ├── ingest.py
│   ├── database.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env                  # Local only (gitignored)
│
├── apps/
│   ├── app/                  # Product Next.js (Clerk, chat, admin)
│   └── marketing/            # Marketing site
│
└── docs/
```

---

## Auth Flow

```
/register  →  Clerk SignUp
           →  /onboarding  (Clerk guard: no org yet)
           →  POST /api/orgs  (creates Clerk org, triggers /ingest with X-API-Key)
           →  /dashboard

/login     →  Clerk SignIn  →  /dashboard (if org exists) or /onboarding

/chat      →  middleware protects route
           →  POST /api/chat  →  getToken() → Authorization: Bearer <jwt>
           →  backend /chat   →  require_auth verifies JWT, uses org_id from token
```

---

## Production & deploy

Live backend: Render service **kuzana-mind** (`https://kuzana-mind.onrender.com`), Docker from `backend/`. Database: Render Postgres **athena-db**. Env vars (including `SENTRY_DSN`, `DISCORD_WEBHOOK_URL`) live on the Render service, not in GitHub `--set-env-vars` for the current path.

`DEPLOY_TARGET=render` (repo Actions variable): push to `main` on `backend/**` → `deploy-render` job → Render API deploy. Requires `RENDER_API_KEY` + `RENDER_SERVICE_ID`. Cloud Run job does not run.

`DEPLOY_TARGET=gcloud`: previous Cloud Run + Cloud SQL + Artifact Registry pipeline. Kept in the same workflow; not production.

Local: `docker compose up --build backend`. Details in `AGENTS.md`.

## Service Account Integration Plan (Post-MVP)

Set `USE_MOCK=false` + per-org `drive_folder_id` + `GOOGLE_SERVICE_ACCOUNT_JSON` on the **Render** service (or Cloud Run if that path is ever re-enabled). Connector code is in `ingest.py`.

---

## Open Stakeholder Questions

### High Priority
- Which Shared Drive folder IDs are in scope for Drive connector?

### Medium Priority
- Should source citations link back to the original Google Doc URL?

### Lower Priority (Post-MVP)
- Soft-delete vs. hard purge when a doc is removed from Drive?
- Query logging for audit/improvement?
