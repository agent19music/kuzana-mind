# Athena — Dev Path Status

> Snapshot as of **2026-07-20**, branch `staging`. Tracks the tickets in
> [ENTERPRISE-PIPELINE-PLAN.md](ENTERPRISE-PIPELINE-PLAN.md) against the actual code.
> Legend: ✅ done · ⚠️ partial · ❌ not started.

The MVP shipped single-tenant-in-disguise. The pipeline has since been hardened
into real multi-tenant with DB-level isolation, the Clerk app is restored, and
ingestion is observable. What remains is mostly post-MVP hardening + Drive depth.

---

## Milestone 1 — "safe to point at a real tenant" ✅ complete

| Ticket | Status | Notes |
|---|---|---|
| A1 — reject null `org_id` | ✅ | `retrieval.py`, `ingest.py`, `auth.py` all raise/403 on falsy org. |
| A2 — schema hardening | ✅ | Migration `7f2a1b9c4d10`: NOT NULL + FK cascade + `(org_id, doc_id)` index. |
| A3 — Postgres RLS | ✅ | `session_for_org()` (SET ROLE + `set_config`); migration `8a3c2d5e6f20`; `scripts/verify_rls.py`. |
| B1 — token-aware chunking | ✅ | Header split + `RecursiveCharacterTextSplitter` (char-based sizing). |
| C1 — per-org Drive folder | ✅ | `Organization.drive_folder_id`, `IngestRequest.drive_folder_id`, per-org load. |
| E1 — ingest authz (fail-closed) | ⚠️ | Secret gate fails closed. **Missing:** admin-ownership check (see below). |
| restore-app (Clerk) | ✅ | middleware, `ClerkProvider`, real API routes, admin pages. |

## Milestone 2 — "production-grade ingestion" — mostly done

| Ticket | Status | Notes |
|---|---|---|
| B2 — batched/retried embeddings | ✅ | `embeddings.py`: batch 100, backoff on 429/5xx, doc vs query task types. |
| B4 — HNSW index | ✅ | Migration `9b4d3e7a1c30`, `vector_cosine_ops`. |
| A4 — doc_id namespacing | ✅ | `namespaced_doc_id({source}:{org}:{id})` applied in `run_ingestion` + `/upload`. |
| E2 — JWT aud/iss/azp | ✅ | Issuer pinned; `aud` + `azp` opt-in via env (`CLERK_AUDIENCE`, `CLERK_AUTHORIZED_PARTIES`). |
| D1 — ingest status endpoint | ✅ | `ingest_jobs` table (migration `a1b2c3d4e5f0`) + `GET /ingest/status`; dashboard feed is live. |
| B3 — resumable ingestion | ⚠️ | HTTP `raise_for_status` guards + per-run job tracking exist. **Missing:** per-document commit + resume-from-progress (still one terminal commit). |
| C2 — Shared Drive tree enumeration | ❌ | Reader is a flat single folder. No subfolder recursion; Sheets/Slides/PDF not handled. |

## Milestone 3 — "full app + polish" — partial

| Ticket | Status | Notes |
|---|---|---|
| restore-app | ✅ | Done on `staging`. |
| D2 — Clerk webhook verify + sync | ✅ | Svix verified in `app/api/webhooks/clerk` → forwarded to backend `/webhooks/clerk` (secret-gated); org + membership events sync to DB. |
| C3 — connections UI → real sync | ✅ | `ConnectionsClient` hits `/api/admin/sync`; status/counts from backend; Drive folder-id sync. |
| D3 — offboarding / data deletion | ⚠️ | `organization.deleted` webhook + FK cascade clear chunks/jobs/members. **Missing:** admin-triggerable manual purge endpoint (GDPR). |
| E3 — encrypt `notion_api_key` | ❌ | Stored plaintext in `organizations.notion_api_key`. |
| E4 — per-org staff directory | ❌ | Still the global `staff_directory.json`; not org-scoped. |
| E5 — fix CLAUDE.md drift | ⚠️ | `backend/CLAUDE.md` is accurate. Root `CLAUDE.md` decision log still lists old embedding model (`text-embedding-005`) and threshold (`0.65`). |

---

## What's left, prioritized

**Correctness / security (do before scaling tenants)**
1. **E1 admin-ownership** — `/ingest` is server-to-server (shared secret) only; add an admin-of-target-org check for user-initiated ingests.
2. **E3 — encrypt Notion keys at rest** (Fernet/KMS or secrets manager). Small, security-relevant.
3. **E5 — root CLAUDE.md drift** — correct model/threshold in the decision log. XS.

**Ingestion robustness**
4. **B3 — finish resumability** — per-document commit + resume from `ingest_jobs` progress so a mid-run failure doesn't lose the whole run.
5. **C2 — Shared Drive depth** — recurse subfolders, decide Sheets/Slides/PDF handling, capture file URL for citations. Needed for a real customer Drive.

**Product completeness**
6. **E4 — per-org staff table** — retire the global JSON, add admin staff-management UI (spec in [../specs/auth-and-orgs-spec.md](../specs/auth-and-orgs-spec.md)).
7. **D3 — manual purge endpoint** — authz'd "delete my data" for procurement / OAuth verification.

---

## User-side verification (this dev env has no DB — code-verified only)

- [ ] `alembic upgrade head` — applies through `a1b2c3d4e5f0` (creates `ingest_jobs`). Chain: `19cab987d520 → 7f2a1b9c4d10 → 8a3c2d5e6f20 → 9b4d3e7a1c30 → a1b2c3d4e5f0`.
- [ ] Run `backend/scripts/verify_rls.py` — cross-tenant read/write isolation + FK cascade.
- [ ] Point the Clerk webhook at `https://<vercel-domain>/api/webhooks/clerk`, subscribe to `organization.*` + `organizationMembership.*`. Needs `CLERK_WEBHOOK_SECRET` (frontend) + `BACKEND_API_SECRET` (both sides).
- [ ] Click-through: onboard an org, "Sync now" on the connections page, confirm chunk count + dashboard activity update.
- [ ] Isolation test: two orgs, distinct docs, confirm A's `/chat` and `/stats` never see B (see plan's Verification section).

## Known caveats

- **A4 data migration:** existing rows ingested before A4 carry un-namespaced `doc_id`s (raw Notion page / Google Doc ids). A re-ingest won't match/replace them, leaving orphans alongside new namespaced chunks. If staging/prod has data, purge each org's chunks once (or full re-ingest that clears first) after A4 lands. Empty tables → nothing to do.
- **RLS depends on a non-superuser role:** the app connects as a Postgres superuser (bypasses RLS); isolation holds only because `session_for_org()` does `SET LOCAL ROLE athena_app`. If the connection strategy changes, keep tenant-data queries off a superuser/table-owner role.
- **`ingest_jobs` is intentionally not under RLS** — run metadata only, always explicitly org-filtered, written under the superuser session.
