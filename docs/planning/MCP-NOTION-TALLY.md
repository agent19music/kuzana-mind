# Notion + Tally without pasted API keys

**Branch:** `feat/notion-tally-mcp-oauth`  
**Goal:** Let org admins connect Notion and Tally with a click (OAuth / MCP), not by pasting personal tokens into Connections.

---

## Current product shape

Athena answers from **pre-indexed pgvector**, not a live tool-calling agent (`retrieval.py::answer_query`). Sources are ingested into chunks, then searched.

Today:

| Source | Connect UX | Ingest path |
|---|---|---|
| Notion | Manual `notion_api_key` + root page in Connections; partial classic OAuth already at `apps/app/app/api/auth/notion/*` | `load_from_notion()` via Notion REST |
| Tally | Manual `tally_api_key` + form IDs | `load_from_tally()` via Tally REST |

Existing specs: `docs/specs/notion-oauth-spec.md` (Path B classic OAuth), `docs/specs/tally-integration-spec.md` (explicitly deferred MCP because beta + different answer shape).

---

## What the platforms offer now (MCP docs, 2026)

### Notion MCP — [developers.notion.com/guides/mcp](https://developers.notion.com/guides/mcp/overview)

- Hosted server: `https://mcp.notion.com/mcp` (Streamable HTTP; SSE fallback).
- Auth: **OAuth 2.0 + PKCE only** on the hosted server (no bearer API key). Dynamic client registration (RFC 7591) so Athena may not need a pre-registered client secret.
- Tokens are **MCP-audienced**. Notion docs note classic REST helpers like `GET /v1/users/me` do **not** accept MCP tokens; workspace labeling goes through MCP tools (e.g. `fetch` with id `self`).
- Open-source Notion MCP (bearer token) is **no longer maintained**.
- Cursor plugin exists (Notion MCP + skills) — useful for *our* engineering, not for end-customer Connect in Athena.

### Tally MCP — [developers.tally.so/api-reference/mcp](https://developers.tally.so/api-reference/mcp)

- Hosted server: `https://api.tally.so/mcp` (**beta**, subject to change).
- Auth: **OAuth (recommended)** or API key `Bearer tly-…`.
- Tools: list forms, fetch submissions (with filters), create/update forms, etc.
- Older Athena spec assumed “Tally has no public third-party OAuth” — that is outdated for the **MCP** surface; classic REST third-party OAuth may still be limited.

---

## Important distinction

**“No pasted API keys” ≠ “must use MCP for ingest.”**

Two separate problems:

1. **Connect UX** — user authorizes Athena without copying a token.
2. **Data path** — how Athena gets documents into pgvector (or answers live).

MCP shines at (1) and at **live** lookups. Athena’s core path is still (2) = indexed ingest.

---

## Recommended direction

### Notion — prefer classic Public Integration OAuth (finish Path B)

**Why not Notion MCP as the primary ingest path**

- Ingest already speaks Notion REST (`load_from_notion`).
- Hosted MCP tokens are not drop-in replacements for that REST client.
- Switching ingest to MCP means an MCP client in the backend, tool-call loops for page trees, and different rate/permission semantics — large rewrite for little UX gain once classic OAuth exists.

**Do this instead**

1. Finish / harden classic Notion OAuth already sketched in code + `notion-oauth-spec.md`.
2. Connections UI: primary CTA **Connect Notion** (OAuth), keep advanced “paste token” as fallback for internal/dev.
3. Persist `access_token` (+ workspace metadata) on the org; refresh if Notion issues refresh tokens for public integrations (verify against current Notion OAuth docs).
4. Root page selection: after connect, let the user pick pages Notion granted (search API / shared pages), instead of a single env `NOTION_ROOT_PAGE_ID`.
5. Optional later: Notion MCP as a **live** “ask Notion now” complement, not the index pipeline.

Athena already holds `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` style config in the callback route — this path matches the product.

### Tally — use MCP OAuth for Connect; keep indexed ingest via MCP tools or token bridge

Tally is the better MCP fit because:

- Official MCP exposes **list forms + fetch submissions** (exactly what ingest needs).
- OAuth is first-class on MCP; Connections can drop the pasted key for most users.
- Still beta — design a feature flag and a REST/API-key fallback.

**Proposed flow**

```
Admin clicks Connect Tally
  → Athena starts MCP OAuth (discovery → PKCE → authorize → token)
  → Store refresh/access tokens per org (encrypted)
  → UI: list forms via MCP tool → admin picks form IDs
  → Sync job: call MCP “fetch submissions” (or REST if token is also a REST bearer)
  → Render markdown docs → existing chunk/embed pipeline
```

**Open questions to spike before committing**

1. Does a Tally MCP OAuth access token work as `Authorization: Bearer` on `api.tally.so` REST, or only on `/mcp`?
2. Which MCP tools/names return full submission payloads suitable for chunking?
3. Token lifetime / refresh behavior (mirror Notion MCP’s rotation discipline if similar).
4. Multi-workspace: which Tally workspace is authorized, and how do we show it in Connections?

If (1) is “MCP only”, implement a small backend MCP client for sync. If REST accepts the same token, keep `load_from_tally` and only change Connect UX.

---

## Architecture sketch (Athena as MCP *client*)

Athena is not Cursor. End customers connect **their** Notion/Tally to **Athena**, so Athena’s backend (or Next.js BFF) must be the MCP/OAuth client:

- Browser: start OAuth, handle redirect.
- Server: PKCE verifier, token exchange, encrypted token store, refresh mutex.
- Sync worker: call MCP tools or REST with stored tokens; never expose tokens to the browser after connect.

Do **not** rely on the user’s Cursor Notion plugin for production Athena tenants.

---

## Phased plan

### Phase 0 — Spikes (this branch)

- [ ] Document findings (this file).
- [ ] Spike Tally: complete MCP OAuth in a throwaway script; try listing forms + one submission pull; test whether token works on REST.
- [ ] Spike Notion: confirm classic OAuth token still works with `load_from_notion`; note any gap vs MCP (for “later”).
- [ ] Inventory Connections UI + org columns to change.

### Phase 1 — Notion Connect (classic OAuth)

- [ ] Polish `api/auth/notion` initiate + callback (org-scoped, CSRF state, persist token).
- [ ] Connections: Connect button; hide key fields behind “Advanced”.
- [ ] Post-connect page/root picker + first ingest.
- [ ] Docs: update `notion-oauth-spec.md` status; AGENTS/CLAUDE.

### Phase 2 — Tally Connect (MCP OAuth)

- [ ] Feature-flagged MCP OAuth routes (`/api/auth/tally` or `/api/mcp/tally/*`).
- [ ] Encrypted token columns (or vault) on `organizations`.
- [ ] Form picker UI from MCP list-forms.
- [ ] Sync path using MCP tools or REST bridge.
- [ ] Keep API-key fallback; update `tally-integration-spec.md`.

### Phase 3 — Optional live MCP answers

- Only if product wants “live form stats / live Notion page” outside the index.
- Separate code path from `answer_query`; do not block Phase 1–2.

---

## Risks

| Risk | Mitigation |
|---|---|
| Tally MCP still beta | Flag + API-key fallback; pin tool contracts in tests |
| Notion MCP tokens ≠ REST | Prefer classic OAuth for ingest |
| Token refresh rotation bugs | Serialize refresh; treat `invalid_grant` as reconnect |
| Secrets in org table | Encrypt at rest; never return raw tokens to client |
| Confusing Cursor “Notion plugin” with product Connect | Explicit product copy: “Connect your workspace” |

---

## Decision needed from product

1. **Notion:** Ship classic OAuth Connect first (recommended), or invest in Notion MCP as the ingest client?
2. **Tally:** Proceed with MCP OAuth spike this branch?
3. Keep paste-token Advanced mode forever, or sunset after OAuth is stable?

---

## Spike log — Tally MCP OAuth (2026-09-15)

### Discovery (live)

| Endpoint | Result |
|---|---|
| `WWW-Authenticate` on `POST /mcp` | `resource_metadata=https://api.tally.so/.well-known/oauth-protected-resource/mcp`, scope `mcp` |
| `/.well-known/oauth-protected-resource` | scopes: `user forms responses webhooks mcp` |
| `/.well-known/oauth-protected-resource/mcp` | scope `mcp` only; points at `https://api.tally.so/mcp` |
| `/.well-known/oauth-authorization-server` | authorize/token/register on `api.tally.so`; PKCE S256; auth methods include `none` |
| `/.well-known/oauth-authorization-server/mcp` | issuer `https://api.tally.so/mcp`; **registration** `https://api.tally.so/oauth/register/mcp`; scopes `mcp` |

### Dynamic registration

- Public PKCE clients register successfully (`token_endpoint_auth_method: none`).
- `/oauth/register/mcp` → client scoped to **`mcp` only**.
- `/oauth/register` with `user forms responses` → separate client that keeps those REST scopes.
- Implication: **MCP OAuth client ≠ REST OAuth client** unless we prove a token from one works on the other.

### Local spike wiring (this branch)

- `apps/app/lib/tally-oauth.ts` — PKCE + token exchange + REST/MCP probes
- `GET /api/auth/tally?mode=mcp|rest` — org-admin start (Clerk session required)
- `GET /api/auth/tally/callback` — exchange + JSON probe report (no token persistence yet)
- Env (local only, not committed): `TALLY_OAUTH_CLIENT_ID`, `TALLY_REST_OAUTH_CLIENT_ID`, `TALLY_OAUTH_REDIRECT_URI`

### How to run the spike

1. `pnpm dev:app` (app on `:3001`).
2. Sign in as an org admin.
3. Visit `http://localhost:3001/api/auth/tally?mode=mcp` (and separately `?mode=rest`).
4. Complete Tally consent.
5. Read the JSON report: does `rest_list_forms` succeed with an MCP token? Which MCP tools appear?

### Still to verify after browser auth

- [ ] MCP token → `GET /forms` REST
- [ ] REST-scoped token → `POST /mcp` initialize + tools/list
- [ ] MCP tool names for listing forms / fetching submissions
- [ ] Refresh token lifetime / rotation

---

## Implementation status (2026-09-15)

**Built on this branch (Tally Connect — OAuth, no pasted key):**

- Dynamic OAuth client (scopes `user forms responses`) + PKCE routes
- `GET /api/auth/tally` → Tally consent → callback persists access/refresh on org
- Auto-lists forms after connect and triggers ingest when forms are found
- Connections UI: **Connect Tally** primary CTA; Advanced keeps paste-token path
- Backend: `/connections/tally/oauth`, `/connections/tally/forms`, refresh-before-ingest
- Migration `e2f3a4b5c6d7` adds `tally_oauth_refresh_token` / `expires_at` / `scope`

**Still to do:** run migration against local/prod DB; click Connect in the app to verify live consent; production redirect URI already registered for `app.athena.uzskicorp.agency`.

### Notion Connect (classic OAuth) — built 2026-09-15

- `GET /api/auth/notion` — org-admin, CSRF state, redirect to Notion consent
- Callback exchanges code, searches shared pages, persists via `POST /connections/notion/oauth`
- Auto-ingests when a single shared page (or `NOTION_ROOT_PAGE_ID`) can be chosen; otherwise Connections opens **Pick root page** with a dropdown of shared pages
- Connections UI: **Connect Notion** primary CTA; Advanced keeps paste-token path
- Migration `f3a4b5c6d7e8` adds workspace id/name + `notion_oauth` flag
- Local redirect URI set to `http://localhost:3001/api/auth/notion/callback` — update the Notion public integration redirect list to match

