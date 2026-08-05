# Athena — Enterprise Multitenancy & Chunking Plan

> Prep for real Google Workspace access + first paying tenant. Backend-pipeline-first.
> Waitlist stays live on `main`; all work below lands on `staging`.
> Decisions: **Service-account Drive path first** · **Postgres RLS + app guardrails** · **Backend hardening before restoring the full app.**

---

## Context

The MVP shipped a working RAG pipeline, but it was built single-tenant-in-disguise: one shared `documents` table with an **optional** `org_id` column filter and no database-level backstop. With real enterprise Google Workspace data about to land across multiple tenants, three classes of problem become real:

1. **Isolation is fragile.** A request with a missing/null `org_id` (personal Clerk account, malformed-but-valid JWT, or `/ingest` with no body) silently reads or deletes **across every tenant**. `doc_id` is not namespaced per org, so two tenants ingesting the same public Google Doc clobber each other. There is no RLS, no FK, no NOT NULL — nothing catches a bad `WHERE` clause.
2. **Chunking won't survive real docs.** The splitter is header-only with no size cap or overlap. A plain-text Google Docs/Drive export (which has no markdown headers) becomes **one giant chunk per document** — it blows the embedding input limit and destroys retrieval quality. Embeddings run one-at-a-time with no batching, retry, or resumability, and any single failure aborts the whole run.
3. **The Workspace connector isn't wired for tenants.** The service-account Drive reader exists but reads a single global `DRIVE_FOLDER_ID` from env — one folder for the whole deployment. There's no per-org folder, no per-org config surface, and the frontend has zero Google connect UI.

This plan hardens the pipeline into something we can point at a real customer's Shared Drive on the call, with cross-tenant isolation enforced at the database layer. The full Clerk app (currently reverted to waitlist-only on `main`, real code at commit `de3fcbc`, playbook in `RESTORE-CLERK.md`) is restored **after** the pipeline is safe.

---

## Current-state gap summary

| # | Gap | Location | Severity |
|---|-----|----------|----------|
| 1 | Null/missing `org_id` → global cross-tenant read | `retrieval.py:49-58` | 🔴 Critical |
| 2 | Null `org_id` → global cross-tenant **delete** on ingest | `ingest.py:417` | 🔴 Critical |
| 3 | `/ingest` trusts body `org_id` + skips auth if secret unset | `main.py:127`, `auth.py:160` | 🔴 Critical |
| 4 | `doc_id` not namespaced per org (Docs/Notion collide) | `ingest.py:421-428` | 🔴 Critical |
| 5 | Chunking header-only, no size cap/overlap → giant chunks | `ingest.py:326-337` | 🔴 Critical |
| 6 | No vector index → seq scan every query | `database.py`, migration | 🟠 High |
| 7 | Drive connector single global folder, not per-org | `ingest.py:88-126` | 🟠 High |
| 8 | Embedding: no batching / retry / resumability | `ingest.py:344-354, 433` | 🟠 High |
| 9 | Clerk webhook is an unauthenticated no-op stub | `main.py:236-246` | 🟠 High |
| 10 | JWT `aud`/`iss`/`azp` not verified | `auth.py:139` | 🟡 Medium |
| 11 | `notion_api_key` stored plaintext | `database.py:25` | 🟡 Medium |
| 12 | `staff_directory.json` global, not per-org | `retrieval.py:66-82` | 🟡 Medium |
| 13 | Docs drift: model/threshold/index claims wrong in CLAUDE.md | `CLAUDE.md` | 🟢 Low |

---

## Epics & milestones

- **Epic A — Tenant Isolation Foundation** (RLS, NOT NULL + FK, doc_id namespacing, reject-null-org)
- **Epic B — Enterprise Chunking & Embedding** (token-aware splitting + overlap, batching, retry, resumable jobs)
- **Epic C — Google Workspace Connector** (per-org service-account Drive, settings surface, Shared Drive enumeration)
- **Epic D — Ingestion Orchestration & Sync** (job status, Clerk webhook sync, offboarding/data-deletion)
- **Epic E — Security & Correctness Hardening** (ingest authz, JWT audience, secret encryption, per-org staff)

**Milestone 1 — "Safe to point at a real tenant" (pre / at client call):** A1, A2, A3, B1, C1, E1.
**Milestone 2 — "Production-grade ingestion":** A4, B2, B3, C2, D1, E2.
**Milestone 3 — "Full app + polish":** C3, D2, D3, E3, E4, restore-app track.

---

## Tickets

Format: **ID · Title** — Priority (P0–P2) · Est · deps. Copy/paste into Linear as-is.

### Epic A — Tenant Isolation Foundation

---
**ATH-A1 · Reject requests with no resolvable org_id (kill the silent-global fallback)** — P0 · S · no deps

Close the cross-tenant read/delete holes at the app layer immediately, before RLS lands.

- `retrieval.similarity_search` / `answer_query`: if `org_id` is falsy, **raise/return empty** — never run the unfiltered query (`retrieval.py:49-58`).
- `ingest.run_ingestion`: refuse to run when `org_id` is None; the delete-before-insert must always be org-scoped (`ingest.py:417`).
- `require_auth`: reject tokens with no `org_id` claim with 403 (`auth.py:146-149`).

**Acceptance:** a JWT with no `org_id` → 403 on `/chat`, `/stats`. An `/ingest` call with `org_id=null` → 400. No code path issues a similarity/delete query without an org filter (add a test asserting this).

---
**ATH-A2 · Schema hardening: `documents.org_id` NOT NULL + FK + composite index** — P0 · M · deps: data backfill

- Backfill/purge legacy null-`org_id` rows (audit count first).
- Alembic migration: `org_id` → NOT NULL, add FK `documents.org_id → organizations.clerk_org_id` (or introduce a real `organization_id` UUID FK — see note), `ON DELETE CASCADE`.
- Add composite index `(org_id, doc_id)` for the upsert-delete and stats paths.

**Note / decision inside ticket:** the join is currently loose string equality on Clerk org IDs. Prefer adding `organization_id UUID` FK to `organizations.id` and keeping `clerk_org_id` as a lookup, so offboarding cascades cleanly.

**Acceptance:** migration up/down clean on a copy of prod; inserting a chunk with unknown org fails; deleting an org cascades its chunks.

---
**ATH-A3 · Postgres Row-Level Security on `documents` (and per-request org context)** — P0 · M · deps: ATH-A2

Make cross-tenant leakage impossible even with a buggy query.

- Enable RLS on `documents`; policy `USING (org_id = current_setting('athena.org_id', true))`.
- `database.py`: on each request/session, `SET LOCAL athena.org_id = :org_id` from the verified auth context (add a `session_for_org(org_id)` helper; use a non-superuser app role so RLS is enforced).
- Retrieval/ingest/stats switch to the org-scoped session; the explicit `WHERE org_id` becomes belt-and-suspenders.

**Acceptance:** with `athena.org_id` set to tenant A, a raw `SELECT * FROM documents` returns only A's rows. Integration test: tenant A's token cannot retrieve tenant B's chunk even if the WHERE filter is removed.

---
**ATH-A4 · Namespace `doc_id` per org across all sources** — P1 · S · deps: ATH-A2

`/upload` already namespaces (`upload:{org_id}:{filename}`); Notion and Google Docs use the raw provider ID. Standardize a `doc_id` scheme like `{source}:{org_id}:{provider_id}` in `ingest.py:421-428` so identical public docs across tenants never collide, and re-ingest still replaces correctly.

**Acceptance:** two orgs ingest the same public Google Doc ID → two distinct chunk sets, neither clobbers the other; re-ingesting one org replaces only that org's chunks.

---

### Epic B — Enterprise Chunking & Embedding

---
**ATH-B1 · Token-aware recursive chunking with overlap** — P0 · M · no deps

Replace header-only splitting (`ingest.py:326-337`) with a real strategy for plain-text enterprise docs:

- Keep header-aware structure where it exists, then **sub-split** each section with a token-aware `RecursiveCharacterTextSplitter` (target ~500–800 tokens, ~10–15% overlap; confirm numbers against `gemini-embedding` input limits).
- Carry section-header breadcrumb into chunk metadata for better citations.
- Guarantee no chunk exceeds the embedding model's max input.

**Acceptance:** a 20-page header-less Google Docs export produces many bounded chunks (not one); every chunk is under the token cap; retrieval quality spot-check on a sample doc improves vs. current.

---
**ATH-B2 · Batched, retried, rate-limited embeddings** — P1 · M · deps: ATH-B1

`ingest.py:344-354` embeds one chunk per API round-trip with no retry. Move to Gemini **batch** embedding, add exponential backoff on 429/5xx, and set `RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY` task types (ingest vs `retrieval.py` query) — currently both embed identically.

**Acceptance:** ingesting 500 chunks issues batched calls (not 500 sequential); a transient 429 retries instead of aborting; query/doc task types differ.

---
**ATH-B3 · Resumable ingestion jobs (per-doc commit + progress)** — P1 · M · deps: ATH-B2

Today one terminal `session.commit()` (`ingest.py:433`) means any failure loses the whole run. Commit per-document, record progress in an `ingest_jobs` table (status, docs done/total, error), and make re-runs resume rather than restart. Guard every loader `raise_for_status()` (`ingest.py`) so one bad/private doc skips instead of aborting.

**Acceptance:** kill ingestion mid-run → committed docs persist; re-run continues; one private Doc ID logs a warning and the rest still ingest.

---
**ATH-B4 · Create the vector index (HNSW)** — P1 · S · no deps

No ANN index exists (contrary to CLAUDE.md). Add an HNSW index on `documents.embedding` (cosine) via Alembic; validate recall/latency vs. current seq scan on a realistic corpus.

**Acceptance:** `EXPLAIN` on a similarity query uses the index; p95 query latency drops materially at ≥50k chunks.

---

### Epic C — Google Workspace Connector (service-account path)

---
**ATH-C1 · Per-org Drive folder ingestion (service account)** — P0 · M · deps: ATH-A4 · unblocks client call

Wire the existing `load_from_google_drive` (`ingest.py:88-126`) for multitenancy per `../specs/google-workspace-spec.md` Path A:

- `Organization.drive_folder_id` column (Alembic) + store in `run_ingestion`.
- `IngestRequest.drive_folder_id` field (`main.py`); `load_documents` uses per-request/per-org folder, falling back to env only for local dev.
- `GOOGLE_SERVICE_ACCOUNT_JSON` stays a **deployment secret** (Cloud Run env), shared across tenants; each tenant shares their folder with `athena-ingest@…` as Viewer.
- Confirm `supportsAllDrives=True` for Shared Drives (already in code).

**Acceptance:** two orgs with different folder IDs ingest disjoint document sets scoped to their own `org_id`; a folder the service account can't see fails gracefully (ATH-B3).

---
**ATH-C2 · Shared Drive tree enumeration + doc-type coverage** — P1 · M · deps: ATH-C1

The current reader is a flat single-folder export. Enterprise Shared Drives are nested. Recurse subfolders, handle Google Docs → text/plain, and decide handling for Sheets/Slides/PDF (export vs skip-with-log). Capture source file URL in metadata for citations.

**Acceptance:** a nested Shared Drive with subfolders ingests all Google Docs across the tree; unsupported types are logged, not fatal; citations can link back to the Drive file.

---
**ATH-C3 · Admin connections UI wired to real sync** — P2 · M · deps: restore-app, ATH-C1

Replace the mock `ConnectionsClient` (fake `setTimeout` "Sync now") with real state: Drive folder-ID field, connected/last-synced status from backend, and a working "Sync now" hitting the existing `app/api/admin/sync/route.ts` → `/ingest`. (OAuth Picker path deferred to a later phase.)

**Acceptance:** admin pastes folder ID, clicks Sync, sees real chunk-count change; status reflects backend, not mock data.

---

### Epic D — Ingestion Orchestration & Sync

---
**ATH-D1 · Ingest job status endpoint + dashboard surfacing** — P1 · S · deps: ATH-B3

Expose `ingest_jobs` via an authed `GET /ingest/status` so onboarding/dashboard show real ingestion progress instead of the hardcoded `ACTIVITY` mock in `dashboard/page.tsx`.

**Acceptance:** dashboard shows live "last sync / N docs / status" per org.

---
**ATH-D2 · Clerk webhook: real signature verification + member/org sync** — P1 · M · deps: restore-app

`main.py:236-246` is an unauthenticated no-op. Verify Svix signature with `CLERK_WEBHOOK_SECRET`, sync `organization.created/updated/deleted` and `organizationMembership.*` into `organizations`/`organization_members`. Add the missing `app/api/webhooks/clerk` route on the frontend (or point Clerk straight at the backend).

**Acceptance:** creating an org / adding a member in Clerk propagates to the DB; invalid signature → 401.

---
**ATH-D3 · Tenant offboarding / data-deletion path** — P2 · S · deps: ATH-A2, ATH-D2

On `organization.deleted`, cascade-delete the org's chunks, config, and staff (FK cascade from ATH-A2 does most of it). Provide an admin-triggerable purge for GDPR-style "delete my data" — needed for Google OAuth verification later and enterprise procurement.

**Acceptance:** deleting an org removes all its rows; a manual purge endpoint (authz'd) does the same on demand.

---

### Epic E — Security & Correctness Hardening

---
**ATH-E1 · Authorize `/ingest` against org ownership (stop trusting body org_id)** — P0 · S · deps: ATH-A1

`/ingest` currently accepts any `org_id` from the body behind only a shared secret that's **skipped entirely if unset** (`auth.py:160`, `main.py:127`). Require the backend secret to be present (fail closed, not open), and when the call originates from a user action, verify the authenticated user is an admin of the target org before writing.

**Acceptance:** unset secret → `/ingest` refuses (not open); a caller cannot ingest into an org they don't own.

---
**ATH-E2 · Verify JWT audience / issuer / authorized-party** — P1 · S · no deps

`auth.py:139` sets `verify_aud=False` and checks no `iss`/`azp`. Pin the expected Clerk issuer and audience so a token minted for a different app can't authenticate.

**Acceptance:** a valid Clerk token with the wrong `aud`/`iss` is rejected.

---
**ATH-E3 · Encrypt tenant secrets at rest (`notion_api_key`)** — P2 · S · no deps

`database.py:25` stores Notion keys as plaintext. Encrypt with an app-level KMS/Fernet key (or move to a secrets manager) so a DB dump doesn't leak tenant credentials.

**Acceptance:** stored value is ciphertext; decrypt only in-process at ingest time.

---
**ATH-E4 · Per-org staff directory (retire the global JSON)** — P2 · M · no deps

`retrieval.py:66-82` serves the same static `staff_directory.json` to every tenant. Move staff into a per-org table (seed from JSON for existing), scope the fallback query to `org_id`, and expose an admin staff-management surface (spec exists in `../specs/auth-and-orgs-spec.md`).

**Acceptance:** each org's fallback returns only its own staff; no shared file.

---
**ATH-E5 · Fix CLAUDE.md drift** — P2 · XS · no deps

Correct the docs to match code: embedding model is `gemini-embedding-2` @768 (not `text-embedding-005`), threshold default is `0.75` (not `0.65`), there is currently **no** IVFFlat index (becomes HNSW after ATH-B4), and `RETRIEVAL_QUERY/DOCUMENT` task types aren't implemented until ATH-B2.

**Acceptance:** CLAUDE.md decision log matches reality.

---

## Restore-app track (parallel, after Milestone 1)

Restore the full Clerk/org/dashboard app from commit `de3fcbc` per `RESTORE-CLERK.md` onto `staging` so there's an end-to-end product to demo. Prereqs for the tickets above that touch UI (ATH-C3, D1, D2). Keep `main` on the waitlist until the restored app + hardened pipeline are green.

---

## Verification (end-to-end)

1. **Isolation test (the important one):** seed two orgs A and B with distinct docs. Assert A's token/`/chat` never returns B's content, `/stats` counts only A, and — with the WHERE filter deliberately removed in a test — RLS still blocks B's rows. Repeat for `/ingest` delete.
2. **Chunking:** ingest a real multi-page Google Docs export (no headers) → confirm many bounded chunks, all under token cap.
3. **Drive connector:** point a test org at a real Shared Drive folder shared with the service account → confirm docs land scoped to that org only.
4. **Resumability:** `kill -9` mid-ingest → committed docs persist, re-run resumes.
5. Build/lint per project rules: backend tests + `pnpm build` for any frontend work. No bold/semibold, no uppercase (UI design constraints in CLAUDE.md).

---

## Open questions for the client call

- Which **Shared Drive folder IDs** are in scope, and are they Shared Drives (not personal My Drive)?
- Who owns the **GCP project / service account** — them or us? (Determines where `GOOGLE_SERVICE_ACCOUNT_JSON` lives and who shares folders.)
- Document types beyond Google Docs (Sheets/Slides/PDF)? Drives ATH-C2 scope.
- Data-residency / deletion requirements? Drives ATH-D3 priority and whether `drive.readonly` (CASA audit) is ever needed.
- Expected corpus size (docs/chunks)? Drives HNSW parameters (ATH-B4) and batch sizing.
