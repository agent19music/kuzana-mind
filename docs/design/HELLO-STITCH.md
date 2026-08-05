# Hello Stitch 👋

This document is a design briefing for the app in this repo. It explains what the product is, who it's for, every page and component that currently exists, and where we think the design could go next. Design freely — nothing in the current UI is sacred.

---

## What the product is

**Athena** (internal codename — the go-to-market name is **Kuzana Brain**) is an AI knowledge assistant for teams. It answers employees' questions instantly from the company's own documents, and when the documents don't cover something, it routes the person to the right colleague instead of guessing.

The one-liner:

> **Kuzana Brain answers your team's questions instantly — from your own docs, or the right person on your team.**

The core promise is **no hallucination**. Every answer either comes with a citation to the source document, or the assistant says "I don't have this documented — here's who to ask" and shows a staff contact card with that person's name, title, department, and email.

### SaaS category

**Internal knowledge management / organizational knowledge base with an AI assistant layer** (B2B SaaS). Adjacent players: Notion AI, Guru, Glean, Confluence. Our differentiators:

1. **Works on existing docs** — connects to Google Docs and Notion; no wiki to build, no migration project. Setup in minutes.
2. **Never fabricates** — cites the source or routes to a person. Never a made-up answer.
3. **Staff-directory routing** — unique to us. When docs fall short, the answer is a *person*, presented as a contact card.
4. **Africa-first** — built for 10–200 person professional teams in Sub-Saharan Africa (Lagos, Nairobi, Accra, Johannesburg). Flat org structures, people wearing multiple hats.

### Who uses it

- **The ops-burdened leader** (Head of Ops, COO, Office Manager) — the "human router" who answers the same 20 questions on rotation. They set the product up and administer it.
- **HR / People leads** — own the policy docs nobody reads; want new hires self-serving answers on day one.
- **Founders** — want institutional knowledge accessible without them in the room.
- **Everyone else on the team** — the members who actually ask the questions. They mostly live in the chat screen.

Brand voice: direct, warm, specific. "Ask a question. Get an answer or a name." Never corporate-speak.

### How it works (so the UI makes sense)

1. An admin signs up, creates an organization, and connects knowledge sources (Notion workspace, Google Docs links, direct file uploads).
2. The backend ingests the documents, splits them into chunks, and embeds them into a vector database. Everything is scoped per organization (multi-tenant).
3. Any team member asks a question in the chat. The backend does a similarity search over the org's chunks.
4. If a confident match is found → answer + **source citation card** (which document it came from).
5. If no confident match → **staff contact card** (the right person to ask, from the org's staff directory).

---

## Current pages

### Public / marketing
| Route | What it is |
|---|---|
| `/` | Landing page — hero, features section, "how it works", integrations strip, call-to-action, footer |
| `/login` | Sign in (Clerk-hosted auth component embedded in our page) |
| `/register` | Sign up (Clerk-hosted auth component) |

### App (authenticated)
| Route | What it is |
|---|---|
| `/onboarding` | Org setup form after first sign-up: org name, logo upload, Notion integration key, Google Doc URLs. Triggers the first document ingestion. |
| `/dashboard` | Home for a signed-in user. Shows org stats (indexed chunk count, connected source count, member count, last sync time), a recent-activity feed, action cards, and admin/member role distinction. |
| `/chat` | The heart of the product. Conversational Q&A over the org's knowledge. Renders answers with **DocumentCard** (source citation) or **StaffCard** (person to contact) inline in the conversation. |

### Admin section (org admins only)
| Route | What it is |
|---|---|
| `/admin/staff` | Member management — list of org members with roles, invite-by-email form (member vs. admin role). |
| `/admin/connections` | Knowledge-source connections — cards for Notion, Google Docs, Google Drive, file upload, each with connection status (connected / partial / disconnected / coming soon), last-sync metadata, and configure/connect actions. |
| `/admin/files` | File library — table of all indexed documents with file type (PDF, DOCX, MD, CSV), size, upload date, source (Upload / Notion / Google Docs), indexing status (indexed / processing / error), and chunk count. |
| `/admin/settings` | Org settings — re-trigger ingestion/sync, file upload card, org configuration. |
| `/admin/billing` | Plans & billing — three tiers (Starter free / Pro $10 / Enterprise custom) with limits on chunks, members, and sources. |

---

## Current components

**Marketing:** `Hero`, `FeaturesSection`, `FeatureCard`, `HowItWorks`, `Integrations`, `CallToAction`, `Footer`, `Nav` (public top nav), `AthenaBadge` (logo/brand mark).

**App shell:** `DashboardShell` (authenticated layout wrapper), `SideNav` (app sidebar navigation), `GradientBanner` (page-header banner used on dashboard/admin pages).

**Chat:** `DocumentCard` (source citation — document name, the relevant excerpt, where it came from), `StaffCard` (person fallback — name, title, department, email).

**Admin:** `ConnectionsClient` (integration cards), `StaffClient` (member list + invite form), `SettingsClient`, `FileUploadCard`.

---

## What we might need (design opportunities)

These are screens and states that don't exist yet or are thin — great candidates for Stitch to explore:

**Chat experience (highest priority — this is the product)**
- Chat empty state / first-run: suggested questions, "ask me anything about [org name]" framing
- Conversation history / past threads sidebar
- Loading and "thinking / searching your docs" states
- The two answer modes deserve strong, distinct visual identities: *answer-with-citation* vs. *route-to-a-person*
- Feedback affordances (was this helpful? flag a wrong/outdated answer)
- Multi-source answers (an answer drawn from 2–3 documents)

**Member experience**
- A non-admin member's view is currently underdesigned — most screens assume the admin. What does a regular employee's dashboard look like?
- Browse/search the knowledge base directly (not just via chat) — a searchable document list
- A staff directory page members can browse (who does what here?)

**Admin & trust**
- Ingestion progress: real-time "we're reading your docs" state during onboarding and re-syncs
- Knowledge gaps report: questions the assistant couldn't answer → tells admins what to document next (strong differentiator, no UI yet)
- Analytics: query volume, top questions, most-cited documents, active users
- Document detail view: chunks, when it was last synced, how often it's cited
- Audit log (planned feature, Pro plan)

**System states**
- Empty states everywhere (no docs yet, no members yet, no activity yet)
- Error and partial-failure states (a source disconnected, a file failed to index)
- Mobile — the chat especially should work well on a phone; our users live on WhatsApp and their phones
- Notifications / toasts (sync finished, invite accepted, indexing failed)
- Onboarding as a guided multi-step flow rather than one form (create org → connect a source → watch it index → ask your first question)

---

## Key flows to keep intact

```
Register → Onboarding (create org, connect sources) → Dashboard
Login → Dashboard (or Onboarding if no org yet)
Dashboard → Chat → ask question → cited answer OR staff contact
Admin → Connections → connect/configure source → sync → Files
Admin → Staff → invite member → member signs up → lands in Chat
```

Tech context (for feasibility): Next.js App Router frontend, auth via Clerk (their prebuilt sign-in/sign-up components render on `/login` and `/register`), FastAPI + Postgres/pgvector backend. Everything is org-scoped and role-aware (admin vs. member).

Have fun with it. The product's soul is: **ask a question, get an answer or a name — never a guess.**
