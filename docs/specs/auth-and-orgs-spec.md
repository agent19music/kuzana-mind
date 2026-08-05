# Auth, Orgs & Staff Management — Implementation Spec

Multi-tenant architecture with real authentication, org registration, admin rights, and staff onboarding.

---

## Auth Provider: Clerk

Clerk is the right call here. It natively handles the exact three things being built:
- Org-level accounts (not just individual users)
- Built-in invitation system with branded emails — no Resend/SendGrid to wire up
- Roles per org (admin, member) out of the box

Alternatives considered:
- **NextAuth** — great for user auth, poor for org management (you'd build the whole invite/role layer yourself)
- **Supabase Auth** — solid but doubles as a DB solution you don't need (you already have Postgres + pgvector)
- **Thirdweb Auth** (already installed) — wallet-based, not designed for email org management, wrong fit
- **Custom JWT** — 3x the code, same result

Free tier: unlimited users, 10 orgs — more than enough.

---

## What changes at a high level

```
Today:                          After:
─────────────────────           ──────────────────────────────────
Open /chat endpoint             /chat requires Clerk session
Open /ingest endpoint           /ingest requires Clerk org admin role
No users, no orgs               Organizations table in Postgres
No staff management             Admin dashboard: add/invite/upload staff
Single tenant (env-var keys)    Each org has its own Notion config
Shared document index           Documents scoped to org_id
```

---

## Data Model

### New tables (SQLAlchemy, Postgres)

#### `organizations`

```python
class Organization(Base):
    __tablename__ = "organizations"

    id          = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    clerk_org_id = Column(String, unique=True, nullable=False, index=True)  # org_xxx from Clerk
    name        = Column(String, nullable=False)
    logo_url    = Column(String)
    notion_api_key     = Column(String)   # encrypted at rest (post-MVP)
    notion_root_page_id = Column(String)
    public_doc_ids     = Column(JSONB, default=list)
    avax_audit_enabled = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

#### `organization_members`

Mirrors Clerk membership but gives the backend a fast lookup without a Clerk API call per request.

```python
class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id          = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    clerk_user_id = Column(String, nullable=False, index=True)
    clerk_org_id  = Column(String, nullable=False, index=True)
    email       = Column(String, nullable=False)
    name        = Column(String)
    role        = Column(String, default="member")  # "admin" | "member"
    joined_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("clerk_user_id", "clerk_org_id"),)
```

#### `documents` — add `org_id`

```python
# Existing DocumentChunk model — add one column:
org_id = Column(String, nullable=False, index=True)  # = clerk_org_id
```

All queries in `retrieval.py` gain a `WHERE org_id = :org_id` filter. Each org's documents are completely isolated.

---

## Environment Variables

### Next.js (`.env.local`)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=whsec_...    # for syncing org/member events to backend
```

### Backend (`backend/.env`)

```env
CLERK_SECRET_KEY=sk_live_...      # used to verify JWTs server-side
CLERK_WEBHOOK_SECRET=whsec_...    # used to verify webhook payloads
```

---

## Frontend Routes

```
/                    Landing page (public)
/login               Clerk-hosted sign-in (or embedded)
/register            Clerk-hosted sign-up (or embedded)
/onboarding          Org setup: name, logo, Notion keys — shown once after sign-up
/dashboard           Org home — shows knowledge base status, quick ask
/admin               Admin-only: staff, settings, integrations
/admin/staff         Staff list + add/invite/upload
/admin/settings      Org name, logo, Notion config
/admin/integrations  Notion connection, public docs, Avalanche audit
/invite/[token]      Accept an invitation (Clerk handles this natively)
/chat                The product (protected, member+)
```

---

## User Flows

### 1. Org Registration

```
/ landing page → click "Get started"
        │
        ▼
/register  (Clerk SignUp component)
  email + password (or Google OAuth)
        │
        ▼
Clerk creates user → redirect to /onboarding
        │
        ▼
/onboarding  (custom page)
  ┌─────────────────────────────┐
  │  Set up your organisation   │
  │                             │
  │  Org name       [_________] │
  │  Logo URL       [_________] │  (optional)
  │                             │
  │  Connect Notion             │
  │  API key        [_________] │
  │  Root page ID   [_________] │
  │                             │
  │  [  Create organisation  ]  │
  └─────────────────────────────┘
        │
        ▼
Next.js creates Clerk org via Clerk SDK
Webhooks fire → backend creates Organization record
POST /ingest triggered with org's Notion credentials
        │
        ▼
/dashboard  (you are now admin)
```

### 2. Admin adds staff — manual

```
/admin/staff → "Add member" button
        │
        ▼
Small inline form: Name + Email
        │
        ▼
POST /api/admin/invite  { email, name, role: "member" }
        │
        ▼
Next.js calls Clerk's createInvitation API
Clerk sends branded invite email automatically
        │
        ▼
Recipient clicks email link → /register (pre-filled email)
Clerk handles signup → webhook fires → member record synced to DB
```

### 3. Admin adds staff — JSON upload

Expected format:
```json
[
  { "email": "amara@acme.com", "name": "Amara Osei" },
  { "email": "kwame@acme.com", "name": "Kwame Asante", "role": "admin" }
]
```

Flow:
```
/admin/staff → "Upload JSON" button
        │
        ▼
File picker (JSON only) → parsed client-side
Preview table shown: name, email, role — confirm before sending
        │
        ▼
POST /api/admin/invite/bulk  { members: [...] }
        │
        ▼
Server calls Clerk createInvitation for each member (batched)
Clerk sends individual invite emails to each
        │
        ▼
/admin/staff shows pending invitations list
```

### 4. Invited user accepts

```
Invite email → click "Accept invitation"
        │
        ▼
/register  (Clerk handles, email pre-filled, org context embedded in link)
        │
        ▼
Clerk fires organization.membership.created webhook
Backend syncs member to organization_members table
        │
        ▼
/dashboard  (member access — no admin tab)
```

---

## Backend Auth Middleware

Every FastAPI endpoint gains a `require_auth` dependency that:

1. Reads the `Authorization: Bearer <jwt>` header
2. Verifies the JWT using Clerk's JWKS endpoint (cached, auto-rotated)
3. Extracts `clerk_user_id` and `clerk_org_id` from the token claims
4. Looks up the `OrganizationMember` record for fast role resolution
5. Returns an `AuthContext` dataclass

```python
@dataclass
class AuthContext:
    clerk_user_id: str
    clerk_org_id: str
    role: str  # "admin" | "member"
    org: Organization
```

### Admin-only guard

```python
def require_admin(auth: AuthContext = Depends(require_auth)):
    if auth.role != "admin":
        raise HTTPException(403, "Admin access required")
    return auth
```

### Updated endpoints

| Endpoint | Auth required | Role |
|----------|--------------|------|
| `POST /chat` | Yes | member+ |
| `POST /ingest` | Yes | admin |
| `GET /health` | No | — |
| `POST /admin/invite` | Yes (via Next.js) | admin |
| `POST /admin/invite/bulk` | Yes (via Next.js) | admin |
| `POST /webhooks/clerk` | Webhook sig | — |

The `/chat` endpoint now scopes retrieval to `auth.org_id` — members only see their org's documents.

---

## Clerk Webhooks

Clerk fires events when users/orgs change. The backend listens at `POST /webhooks/clerk` and syncs state to Postgres. This keeps the DB consistent without Clerk API calls on every request.

### Events to handle

| Event | Action |
|-------|--------|
| `organization.created` | Create `Organization` record |
| `organization.updated` | Update name/logo |
| `organization.deleted` | Soft-delete org + documents |
| `organizationMembership.created` | Upsert `OrganizationMember` |
| `organizationMembership.updated` | Update role |
| `organizationMembership.deleted` | Remove member record |

Webhook verification: validate `svix-id`, `svix-timestamp`, `svix-signature` headers against `CLERK_WEBHOOK_SECRET` using the `svix` Python library.

---

## Frontend Architecture

### Middleware (`middleware.ts`)

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublic = createRouteMatcher(["/", "/login(.*)", "/register(.*)", "/invite(.*)"])

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect()
})

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
}
```

This is the entirety of the auth enforcement on the frontend. Clerk handles the rest.

### `OnboardingModal.tsx` → becomes `/onboarding` page

The original modal concept evolves into a dedicated `/onboarding` page. This is better UX — gives the setup form breathing room, cleaner on mobile, allows a redirect back to landing if user bails.

The page only appears once. After org creation, a flag in Clerk's public metadata (`onboarding_complete: true`) ensures repeat visits skip it.

### Admin dashboard pages

`/admin` is only reachable by org admins. A simple server-side check using Clerk's `auth()` helper reads the org role. If not admin, redirect to `/dashboard`.

Staff management UI on `/admin/staff`:
- Table of current members (name, email, role, joined date)
- "Invite member" button → inline form (name + email + role)
- "Upload JSON" button → file input → preview → confirm
- Pending invitations section (resend / revoke)

---

## File List

### New files — Frontend

| File | Purpose |
|------|---------|
| `middleware.ts` | Clerk auth enforcement on all non-public routes |
| `app/login/page.tsx` | Clerk `<SignIn>` component, design system styled |
| `app/register/page.tsx` | Clerk `<SignUp>` component, design system styled |
| `app/onboarding/page.tsx` | Org setup form (name, logo, Notion keys) — shown once |
| `app/dashboard/page.tsx` | Org home — KB status, recent activity, quick ask |
| `app/admin/page.tsx` | Admin home — redirects to /admin/staff |
| `app/admin/staff/page.tsx` | Staff table + invite + JSON upload |
| `app/admin/settings/page.tsx` | Org name, logo, Notion config |
| `app/api/admin/invite/route.ts` | Single invite via Clerk API |
| `app/api/admin/invite/bulk/route.ts` | Batch invites from JSON upload |
| `app/api/orgs/route.ts` | Create org in Clerk + trigger backend sync |
| `app/api/webhooks/clerk/route.ts` | Receives Clerk webhook events, forwards to backend |

### New files — Backend

| File | Purpose |
|------|---------|
| `backend/auth.py` | JWT verification, `require_auth` dependency, `require_admin` |
| `backend/webhooks.py` | Clerk webhook handler, org/member sync |

### Modified files

| File | Change |
|------|--------|
| `backend/database.py` | Add `Organization`, `OrganizationMember` models; add `org_id` to `DocumentChunk` |
| `backend/main.py` | Add auth deps to all endpoints; add `/webhooks/clerk`; add `/admin/invite` routes |
| `backend/retrieval.py` | Add `org_id` filter to all similarity search queries |
| `backend/ingest.py` | Accept `org_id` + per-org Notion credentials; isolate chunks by org |
| `app/components/Nav.tsx` | Show user avatar + org name (Clerk `<UserButton>`) when logged in |
| `app/components/Hero.tsx` | "Get started" → `/register`; "Sign in" → `/login` |
| `app/components/CallToAction.tsx` | CTA → `/register` instead of email capture |
| `app/api/chat/route.ts` | Forward Clerk session token to backend |

---

## New Dependencies

### Frontend

```bash
pnpm add @clerk/nextjs
```

Remove `thirdweb` — it's unused and conflicts with the auth direction.

### Backend

```bash
pip install PyJWT cryptography svix
```

`PyJWT` + `cryptography` for JWT verification using Clerk's JWKS.  
`svix` for webhook signature verification.

---

## Migration

The existing `documents` table needs an `org_id` column. For the demo where there's only one org, this is a simple `ALTER TABLE`:

```sql
ALTER TABLE documents ADD COLUMN org_id VARCHAR NOT NULL DEFAULT 'demo-org';
CREATE INDEX idx_documents_org_id ON documents (org_id);
```

After org creation goes live, the `DEFAULT 'demo-org'` can be dropped and the column made truly required.

---

## Phased Build Order

Build in this sequence — each phase is independently shippable.

### Phase 1 — Auth skeleton (1 day)
- Install Clerk
- `middleware.ts` protecting all non-public routes
- `/login` and `/register` pages (Clerk components, design-system styled)
- Remove Thirdweb

### Phase 2 — Org onboarding (1 day)
- `/onboarding` page with org setup form
- `POST /api/orgs` — creates Clerk org, stores Notion config in backend
- Webhook handler syncing org creation to Postgres
- Backend `Organization` model + migration
- Trigger ingest on org creation

### Phase 3 — Authenticated backend (1 day)
- `backend/auth.py` — JWT verification
- Add `org_id` to `DocumentChunk`, update retrieval to filter by org
- Update all backend endpoints with auth dependencies
- Update Next.js `/api/chat` proxy to forward auth token

### Phase 4 — Staff management (1 day)
- `/admin/staff` page — member table
- Single invite flow (form → Clerk API → email sent)
- JSON bulk upload flow (parse → preview → batch invite)
- `OrganizationMember` model + webhook sync

### Phase 5 — Admin dashboard (half day)
- `/dashboard` — KB status (doc count, last ingest date), link to chat
- `/admin/settings` — edit org name, logo, Notion config, re-trigger ingest

---

## Open Questions

**1. Google OAuth on sign-in?**
Clerk supports it as a zero-config option. Worth enabling — one toggle in the Clerk dashboard. No code change.

**2. Staff role granularity?**
Currently: `admin` and `member`. Do you need a third role — e.g. `viewer` (read-only chat, no admin tab) vs `member` (full chat access)?

**3. Notion config — per-org or shared?**
Spec assumes each org has their own `NOTION_API_KEY` + `NOTION_ROOT_PAGE_ID`. Confirm this is the intent (vs one global Notion workspace that all orgs draw from).

**4. Document isolation model?**
Each org's documents are isolated by `org_id`. Members of org A cannot query org B's documents, even if you are the admin of both. This is the most secure default — confirm it's what you want.

**5. What happens to `staff_directory.json`?**
Currently a flat JSON file used for staff fallback answers. With real users in Postgres this should become a dynamic query against `organization_members`. Flag for Phase 4.
