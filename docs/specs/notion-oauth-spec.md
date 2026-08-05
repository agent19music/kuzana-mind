# Notion OAuth — Implementation Spec (Path B)

One-click Notion workspace connection via OAuth 2.0.  
Scope: connect flow only — ingestion pipeline is already built.

---

## What changes

| Area | What |
|---|---|
| Notion developer portal | New public integration with OAuth enabled |
| `app/api/auth/notion/route.ts` | New — initiates OAuth redirect |
| `app/api/auth/notion/callback/route.ts` | New — exchanges code for token, triggers ingest |
| `app/components/Integrations.tsx` | Connect button on Notion card |
| `backend/main.py` | `/ingest` accepts optional `notion_token` in request body |
| `.env.local` | Two new vars: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` |

---

## OAuth flow (step by step)

```
User clicks "Connect Notion"
        │
        ▼
GET /api/auth/notion
  → builds Notion authorization URL
  → 302 redirect to notion.so/oauth/authorize
        │
        ▼
Notion consent screen
  User selects workspace and clicks Allow
        │
        ▼
GET /api/auth/notion/callback?code=xxx
  → exchanges code for access_token via Notion token endpoint
  → POSTs to backend /ingest with { notion_token, notion_root_page_id }
  → 302 redirect to /chat (or a success page)
        │
        ▼
Backend runs ingestion with the live token
```

---

## Notion developer portal setup

1. Go to `notion.so/my-integrations`
2. Click **New integration** → type: **Public**
3. Fill in:
   - Name: `Athena`
   - Website: your domain (localhost fine for dev)
   - Redirect URI: `http://localhost:3000/api/auth/notion/callback`
4. Under **Capabilities**: check `Read content`
5. Copy **OAuth client ID** and **OAuth client secret**

For production, add your real domain as a second redirect URI. No Notion review is required for dev-mode apps.

---

## Environment variables

### `.env.local` (Next.js root)

```env
NOTION_CLIENT_ID=your_oauth_client_id
NOTION_CLIENT_SECRET=your_oauth_client_secret
# Where to send users after a successful connect
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
```

### `backend/.env` (no new vars needed for MVP)

The `notion_token` and `notion_root_page_id` are passed per-request from the callback route.  
For a persistent setup (post-MVP), store them in DB and set `NOTION_API_KEY` + `NOTION_ROOT_PAGE_ID`.

---

## File specs

### `app/api/auth/notion/route.ts`

**Method:** `GET`  
**Purpose:** Redirect the user to Notion's authorization screen.

Builds the URL:
```
https://api.notion.com/v1/oauth/authorize
  ?client_id=NOTION_CLIENT_ID
  &response_type=code
  &owner=user
  &redirect_uri=NOTION_REDIRECT_URI
```

Returns: `302` to the URL above.

No state parameter needed for MVP (single-user, no CSRF risk in dev). Add one before production.

---

### `app/api/auth/notion/callback/route.ts`

**Method:** `GET`  
**Query params:** `code` (string), `error` (string, present on denial)

**Happy path:**

1. If `error` param present → redirect to `/?notion=denied`
2. `POST https://api.notion.com/v1/oauth/token` with:
   - Basic auth: `NOTION_CLIENT_ID:NOTION_CLIENT_SECRET` (base64)
   - Body: `{ grant_type: "authorization_code", code, redirect_uri: NOTION_REDIRECT_URI }`
3. Notion returns `{ access_token, workspace_name, workspace_id, bot_id, ... }`
4. Pick `access_token`
5. Derive `notion_root_page_id`:
   - If the user's workspace has a single top-level page we want, they'll need to tell us which one. For MVP: use the workspace root — call `GET /v1/search` with no filter, take the first result's parent page ID. Or: prompt the user for it in a follow-up modal after connect.
   - Simplest demo path: hardcode a known page ID via `NOTION_ROOT_PAGE_ID` env var and just use it.
6. `POST http://backend:8000/ingest` with body:
   ```json
   { "notion_token": "...", "notion_root_page_id": "..." }
   ```
7. Redirect to `/chat?connected=notion`

**Error handling:**
- Notion token exchange fails → redirect to `/?notion=error`
- Backend ingest fails → still redirect to `/chat?connected=notion&ingest=pending` (non-blocking, user can retry)

---

### `app/components/Integrations.tsx` — Notion card

Replace the static card with an interactive one for Notion:

- Default state: "Connect" button (pill, brand-olive border)
- Connected state: green checkmark + "Connected · [workspace name]" 
- Workspace name comes from the `?connected=notion` redirect param (or a `/api/auth/notion/status` endpoint, post-MVP)

The Google Docs and Google Drive cards stay static (post-MVP) with a "Coming soon" or "Contact us" state.

---

### `backend/main.py` — update `/ingest`

Current signature: `POST /ingest` (no body)

New signature:
```python
class IngestRequest(BaseModel):
    notion_token: str | None = None
    notion_root_page_id: str | None = None

@app.post("/ingest")
async def ingest(req: IngestRequest | None = None):
    ...
```

Inside `run_ingestion()`, if `req.notion_token` is provided, pass it to `load_from_notion()` directly instead of reading from env. All other sources (mock, public docs) remain unchanged.

---

## Page ID problem

Notion OAuth returns a workspace-level token, not a specific page. The token can access any page the user later shares with the integration. Two options:

| Option | UX | Effort |
|---|---|---|
| **After connect, show a modal:** "Paste the URL of your Notion wiki root page" | One extra step, clear | Low |
| **After connect, call `/v1/search` and show a page picker** | Truly seamless | Medium |
| **Hardcode `NOTION_ROOT_PAGE_ID` in env** | Admin sets it once, users just click Connect | Zero (already works) |

**Recommendation for demo:** hardcode the root page ID in env. Users click Connect, OAuth grants a fresh token, ingest fires with the configured root page. Clean enough for a demo, solves it properly post-MVP with a picker.

---

## Success / error states to handle

| Scenario | Handling |
|---|---|
| User clicks Allow | Happy path above |
| User clicks Cancel on consent screen | `error=access_denied` in callback → `/?notion=denied` |
| Notion token exchange fails (bad secret, expired code) | Log + redirect `/?notion=error` |
| Backend ingest errors | Non-blocking — show "Connected, sync pending" |
| User connects again (re-auth) | Token exchange succeeds again, re-ingest runs — idempotent |

---

## Testing checklist

- [ ] Redirect URL in Notion portal matches `NOTION_REDIRECT_URI` exactly (trailing slash matters)
- [ ] Basic auth header for token exchange is `btoa(clientId + ":" + clientSecret)`
- [ ] Notion integration has `Read content` capability enabled
- [ ] At least one Notion page is shared with the integration before testing ingest
- [ ] Backend `/ingest` still works with no body (env-var path unchanged)
- [ ] Redirect after connect lands on `/chat`, not a blank page

---

## Post-MVP additions (not in scope here)

- Persist `access_token` in a `connections` DB table keyed by workspace ID
- Page picker UI after connect
- Disconnect / re-auth button
- Scheduled re-ingest using stored token (replaces weekly cron env approach)
- State parameter in OAuth URL for CSRF protection
