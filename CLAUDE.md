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
| Document types in scope | Google Docs only → parsed to plain text, header-based chunking. |
| Permissions model | Multi-tenant per org. Each org's chunks are tagged with `org_id`; all queries scoped to it. |
| Similarity fallback | If score < threshold → query `staff_directory.json`, never hallucinate. |
| Ingestion schedule | Standalone script, triggered by weekly cron job. |
| Vector DB — MVP | Docker pgvector (`pgvector/pgvector:pg16`) via docker-compose. Zero cost, runs locally. |
| Vector DB — Production | Cloud SQL for PostgreSQL 16 with `pgvector` extension. Same SQL, swap `DATABASE_URL`. |
| Vector DB — Ruled out | Cloud Spanner: no native vector ops, expensive, wrong tool for this use case. |
| Embedding model | Google Gemini `text-embedding-005` (768 dims). |
| Similarity threshold | `0.65` (adjusted from 0.75 for better recall). Confirm before production. |
| Auth — frontend | Clerk v7 (`@clerk/nextjs` v7.5.9). `clerkMiddleware` protects all non-public routes. |
| Auth — backend | Clerk JWT (RS256 via JWKS) for user requests; `X-API-Key` for server-to-server (Next.js → backend). |
| Wallet / Web3 | Thirdweb removed. Avalanche audit trail specced as separate `backend/audit.py` (post-MVP). |
| Onboarding flow | `/register` → Clerk SignUp → `/onboarding` → POST `/api/orgs` → creates Clerk org + triggers ingest → `/dashboard` |
| Data sources per org | Each org brings their own Notion integration key + array of public Google Doc URLs. |

---

## MVP Scope (Hackathon Build)

### What is real
- FastAPI backend (`main.py`, `retrieval.py`, `ingest.py`, `auth.py`)
- pgvector embeddings + similarity search, scoped per org
- Staff directory fallback logic
- Next.js chat UI — source citation card + staff contact card
- Plain-text chunking pipeline (header-based via LangChain)
- Public Google Doc ingestion — per-org `public_doc_ids` array
- Notion ingestion — per-org `notion_api_key` + `notion_root_page_id`
- Clerk auth — sign up, sign in, org creation, JWT-gated backend
- Onboarding form — org name, logo, Notion keys, Google Doc URLs
- Dashboard — org stats, action cards, admin/member role distinction

### What is mocked / post-MVP
- Google Drive service account connector (flag: `USE_MOCK=true`)
- Avalanche on-chain audit trail (spec complete at `avalanche-audit-spec.md`)
- Notion OAuth Path B (spec complete at `notion-oauth-spec.md`)
- Staff management UI (`/admin/staff`, invite flow, JSON bulk upload)
- Admin settings page (`/admin/settings`, re-trigger ingest)

---

## File Structure

```
noc-ava/
├── CLAUDE.md                          # This file
├── AGENTS.md                          # Next.js version warning
├── middleware.ts                       # Clerk route protection (clerkMiddleware)
├── .env.local                         # Frontend + server env vars
│
├── backend/
│   ├── CLAUDE.md                      # Backend-specific build notes
│   ├── main.py                        # FastAPI app, CORS, lifespan, endpoints
│   ├── auth.py                        # Clerk JWT verification + require_backend_secret dep
│   ├── retrieval.py                   # pgvector similarity search + fallback logic
│   ├── ingest.py                      # Ingestion pipeline (Notion / public docs / mock / Drive)
│   ├── database.py                    # SQLAlchemy models (DocumentChunk, Organization, OrganizationMember)
│   ├── staff_directory.json           # Static staff fallback data
│   ├── sample_docs/                   # Local markdown docs (USE_MOCK=true)
│   ├── requirements.txt
│   └── .env                           # Backend env vars
│
├── app/
│   ├── layout.tsx                     # ClerkProvider, fonts, global CSS
│   ├── globals.css                    # Design system CSS variables
│   ├── page.tsx                       # Landing page
│   ├── login/page.tsx                 # Clerk SignIn
│   ├── register/page.tsx              # Clerk SignUp
│   ├── onboarding/page.tsx            # Org setup form (POST /api/orgs)
│   ├── dashboard/page.tsx             # Main dashboard (server component, auth-gated)
│   ├── chat/page.tsx                  # Chat UI (org-scoped via Clerk JWT)
│   ├── api/
│   │   ├── chat/route.ts              # Proxy → backend /chat (forwards Bearer token)
│   │   ├── orgs/route.ts              # Creates Clerk org + triggers backend /ingest
│   │   └── webhooks/clerk/route.ts    # Clerk webhook receiver (Phase 4)
│   └── components/
│       ├── chat/DocumentCard.tsx
│       ├── chat/StaffCard.tsx
│       ├── Nav.tsx
│       ├── CallToAction.tsx
│       ├── FeaturesSection.tsx
│       └── Integrations.tsx
│
├── auth-and-orgs-spec.md              # Full auth + staff management spec
├── avalanche-audit-spec.md            # On-chain audit trail spec
└── notion-oauth-spec.md               # Notion OAuth Path B spec
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

## Service Account Integration Plan (Post-MVP)

Set `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` in Cloud Run env vars — the connector code is already in `ingest.py`.

---

## Open Stakeholder Questions

### High Priority
- Who owns `staff_directory.json`? Is there an existing staff list to seed it?
- Which Shared Drive folder IDs are in scope for Drive connector?

### Medium Priority
- Should source citations link back to the original Google Doc URL?
- Multi-turn chat or single-shot Q&A for MVP?
- GCP project ID and region for Cloud Run deployment?

### Lower Priority (Post-MVP)
- Soft-delete vs. hard purge when a doc is removed from Drive?
- Query logging for audit/improvement?
- `CLERK_WEBHOOK_SECRET` — needed for staff management Phase 4
