# Athena — Pitch Deck & Scripts

---

## SLIDE 1 — COVER

**Athena**
*Your team's second brain.*

AI that answers your team's questions instantly — from your own docs, or the right person on your team.

---

## SLIDE 2 — THE HOOK

> "Right now, someone on your team is writing a Slack message to ask a question that's already been answered. It's in a Google Doc. Nobody knows which one."

Every day, in every growing organisation:

- A new hire messages HR to ask about leave policy
- A junior manager interrupts the ops lead about the expense process
- A team lead asks a founder who to escalate a client issue to

**The answer exists. The problem is finding it.**

---

## SLIDE 3 — PROBLEM STATEMENT

### Knowledge doesn't travel at the speed your org grows.

At **10 people** — everyone knows everything. Questions get answered in seconds.

At **30 people** — things start slipping. You documented it once. Nobody can find it.

At **50 people** — someone is spending their entire Monday morning being a human search engine.

**The real cost isn't the document. It's the search.**

| What's happening | The real cost |
|---|---|
| New hire asks 3 questions/day | 5 senior people interrupted |
| Ops lead answers repeated questions | 30+ hours/month lost |
| Teams can't find docs | 2 extra weeks to onboard new staff |
| Undocumented processes | Knowledge lives in one person's head |

The information exists. It's in a Google Doc, in a policy file, in someone's inbox. But by the time a new hire or a busy manager tracks it down, they've lost 30 minutes and interrupted two people.

**This is the knowledge tax. Every growing team pays it. Nobody has solved it for African teams — until now.**

---

## SLIDE 4 — PROPOSED SOLUTION

### Athena — AI Knowledge Routing for African Professional Teams

Ask a question in plain English. Get the answer from your company's own documents — instantly, accurately, with the source cited.

If the docs don't cover it, Athena tells you **exactly who to ask** — name, title, email. Not "contact HR." A real person.

**It never makes an answer up. Ever.**

> *"what is our leave policy for contractors?"*
> → Returns exact policy text from your Leave Policy doc. Source cited.

> *"we need to review an NDA with a new partner"*
> → Returns: **Zanele Mokoena, General Counsel** — name, title, email.

---

## SLIDE 5 — HOW IT WORKS

### Three steps. Under 60 seconds to live.

**1. Connect your docs**
Point Athena at your Google Drive folder. Ingestion runs in under 60 seconds. No migration. No new wiki to build. Your existing Google Docs, as-is.

**2. Ask anything**
Any team member types a question in plain English via the chat interface. Leave policies. Expense processes. Org structure. Client escalation paths. Anything documented.

**3. Get the answer or the right person**
- If it's in your docs → verbatim answer with source document cited
- If it's not documented → the exact person who owns that topic, with their contact

**Under the hood:**
- Documents chunked and embedded using Google Gemini (`text-embedding-005`, 768-dim)
- Stored in pgvector (PostgreSQL 16) — scoped per organisation
- Cosine similarity search retrieves the most relevant chunk
- Below confidence threshold → staff directory routing
- **No LLM generates the answer.** The answer IS the document excerpt. Zero hallucination surface.

---

## SLIDE 6 — KEY BENEFITS

### For the organisation

| Benefit | What it means |
|---|---|
| **Zero hallucinations** | No AI-generated guesses. Answer is verbatim doc text or a real person. Trust is earned, not assumed. |
| **No new tools to build** | Connects to Google Docs you already have. No migration. No Notion. No Confluence. |
| **Minutes to set up, not months** | Ingestion: under 60 seconds. No IT ticket. No implementation project. |
| **Multi-tenant and secure** | Every org's data is isolated. Your docs stay in your environment. Nothing shared. |
| **Scales with your team** | Works at 15 people. Works at 150. The more you document, the smarter it gets. |

### For operations leads
Stop being the human search engine. When someone asks a question you've answered 10 times before, Athena answers it for you.

### For HR & people leads
Everything you've documented becomes answerable on day one. New hires don't need a buddy to find the leave policy.

### For founders & COOs
As you grow, knowledge stops travelling as easily. Athena is the layer that makes institutional knowledge accessible without you in the room.

### For new hires
Ask anything. Get the answer in 3 seconds or the right person to call. No more wandering through Drive folders or interrupting busy colleagues.

---

## SLIDE 7 — THE ECOSYSTEM

### Built for how African professional teams actually work

African professional teams are scaling faster than their knowledge systems. The playbook from San Francisco doesn't apply:

- Most teams run on **Google Workspace**, not Atlassian
- No appetite for 6-month knowledge base implementations
- Flatter org structures — "who handles procurement" isn't always in the org chart
- Knowledge lives in **WhatsApp threads, personal Drive folders, and people's heads**
- Teams wear multiple hats — the same person may own HR, finance, and client ops

**Athena is built for this reality.**

### Our initial ecosystem

```
Google Workspace (Docs, Drive)
         ↓
    [Athena Ingest]
         ↓
  pgvector on Cloud SQL
         ↓
    [Athena Chat UI]
         ↓
  Answer (from docs) OR Person (from staff directory)
```

**Current integrations:**
- Google Docs (public links + service account, post-MVP full Drive)
- Notion (integration key + root page)
- Staff Directory (JSON, bulk upload, future: Slack/HR system sync)

**Planned ecosystem expansion:**
- Slack integration — ask Athena without leaving chat
- WhatsApp Business — for teams not yet on Slack
- Google Drive real-time sync — instead of scheduled ingest
- HR system connectors (BambooHR, Workday)
- Avalanche on-chain audit trail — immutable log of who asked what (compliance use case)

### Geographic focus
**Nigeria · Kenya · South Africa · Ghana** — expanding across Sub-Saharan Africa

Target: 10M+ professional SMEs in SSA underserved by Western enterprise SaaS

---

## SLIDE 8 — COMPETITIVE LANDSCAPE

### The honest comparison

| | Ask Colleague | Google Drive Search | ChatGPT | Notion AI | Confluence | **Athena** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Answers from your docs | Depends | Keyword only | ✗ | If wiki exists | If wiki exists | **✓** |
| Hallucination risk | Low | None | **High** | Medium | None | **Zero** |
| Routes to right person | Sometimes | ✗ | ✗ | ✗ | ✗ | **✓** |
| Works on existing Google Docs | — | ✓ | ✗ | ✗ | ✗ | **✓** |
| Setup time | None | None | None | Weeks | Months | **Minutes** |
| Interrupts senior staff | Always | No | No | No | No | **No** |
| Africa-first design | — | ✗ | ✗ | ✗ | ✗ | **✓** |

**Where we win every time:**
- Buyer has existing Google Docs (not Notion/Confluence) ← almost every African SME
- No appetite for long implementation
- Real cost from "go ask someone" — usually ops, HR, or the founder
- Team > 10 people and growing

**Category we're creating:** AI Knowledge Routing — not knowledge management (that's writing things down), but knowledge retrieval and routing, without hallucination, without requiring a new knowledge base.

---

## SLIDE 9 — KEY DELIVERABLES

### What's built (MVP — Hackathon)

| Deliverable | Status |
|---|---|
| FastAPI backend with pgvector similarity search | ✅ Live |
| Multi-tenant org isolation (per Clerk org) | ✅ Live |
| Public Google Doc ingestion (no auth required) | ✅ Live |
| Notion ingestion (integration key + root page) | ✅ Live |
| Staff directory fallback — zero hallucination routing | ✅ Live |
| Next.js chat UI with source citation + staff contact cards | ✅ Live |
| Clerk authentication (sign up, sign in, org creation) | ✅ Live |
| Onboarding flow (org setup, doc URLs, Notion keys) | ✅ Live |
| Dashboard with live org stats | ✅ Live |
| Header-based chunking (LangChain MarkdownHeaderTextSplitter) | ✅ Live |
| Gemini embeddings (text-embedding-005, 768-dim) | ✅ Live |

### What's next (Post-MVP Roadmap)

| Deliverable | Phase |
|---|---|
| Google Drive full connector (service account) | Phase 2 |
| Real-time Drive sync (replace weekly cron) | Phase 2 |
| Staff management UI (invite, bulk upload, roles) | Phase 3 |
| Admin settings (re-trigger ingest, update sources) | Phase 3 |
| Slack integration — ask Athena from Slack | Phase 4 |
| Avalanche on-chain audit trail | Phase 4 |
| Notion OAuth (client self-service auth) | Phase 4 |
| Usage analytics (most asked questions, doc gap analysis) | Phase 5 |
| WhatsApp Business connector | Phase 5 |
| Multi-language UI (Swahili, French, Pidgin) | Phase 5 |

---

## SLIDE 10 — PROJECT TIMELINE

```
JUNE 2026          JULY 2026          AUG 2026          Q4 2026
    │                  │                  │                 │
    ▼                  ▼                  ▼                 ▼
[MVP / Demo]     [Early Access]     [Drive + Slack]   [Scale]
    │                  │                  │                 │
    ├─ RAG pipeline     ├─ 5 pilot orgs    ├─ Drive SA       ├─ Slack app
    ├─ Staff routing    ├─ Onboarding      ├─ Real-time sync ├─ WhatsApp
    ├─ Chat UI          ├─ Feedback loop   ├─ Staff mgmt UI  ├─ Analytics
    ├─ Clerk auth       ├─ Pricing model   ├─ Admin panel    ├─ Audit trail
    └─ Notion ingest    └─ 2-3 pilots      └─ Multi-language └─ Series A prep
```

### Milestone targets

| Milestone | Target Date |
|---|---|
| Hackathon demo | June 2026 ✅ |
| 5 pilot org commitments | July 2026 |
| First paying customer | August 2026 |
| Google Drive full connector live | August 2026 |
| Slack integration beta | September 2026 |
| 20 paying orgs | Q4 2026 |
| $10K MRR | Q4 2026 |
| Series A readiness | Q1 2027 |

---

## SLIDE 11 — BUSINESS MODEL

### Simple, predictable SaaS

**Target pricing (to be validated with pilots):**
- **Starter** — Up to 25 users, 5 doc sources — $99/month
- **Growth** — Up to 100 users, unlimited sources — $299/month
- **Enterprise** — Custom, on-prem option, audit trail, SSO

**Why flat-rate over per-seat:**
African SME buyers prefer predictable invoices. Per-seat pricing creates friction at team expansion moments — we want to be the thing that scales invisibly.

**Revenue path to $10K MRR:**
- 34 Starter orgs, OR
- 12 Growth orgs, OR
- Mix — realistic at 20 paying orgs across tiers

**Early access strategy:**
First 10 pilot orgs — free for 60 days in exchange for weekly feedback sessions and a reference customer commitment.

---

## SLIDE 12 — TRACTION & PROOF

### What the demo proves (live, every time)

| Query | What it returns | What it proves |
|---|---|---|
| "what is the process for submitting expenses?" | Exact policy text, source cited (score: 0.81) | Retrieval works, no hallucination |
| "what happens if I need emergency leave?" | Leave policy verbatim (score: 0.77) | Consistent across HR docs |
| "who reports to the CTO?" | Full org reporting tree (score: 0.78) | Works on structure, not just policy |
| "we need to review an NDA with a new partner" | Zanele Mokoena, General Counsel — name, title, email | Fallback routing when docs don't cover it |
| "how does the sales pipeline work?" | Fatima Al-Hassan, VP of Sales | Routing to correct domain owner |

**Setup time: under 60 seconds.** Query response: under 2 seconds.

### Early signals
- Built and demoed in 1 week
- Architecture validated: zero hallucination in 100% of test queries
- Staff routing accuracy: 100% on test directory (5 departments, 12 staff)

---

## SLIDE 13 — THE ASK

### What we're looking for

**Design Partners (now)**
5–10 organisations (10–200 people, Google Workspace users, Sub-Saharan Africa) willing to run Athena as their internal knowledge layer for 60 days. Free. In exchange for weekly feedback calls and a reference.

*If you walk out of this room and your team has a Google Drive full of docs nobody can find — you are the design partner we need.*

**What we need from a pilot org:**
- Access to one Google Drive folder with internal docs
- 30 minutes to onboard
- One question your team asks most often that they should already know the answer to

We handle the rest. Your team can start asking questions same day.

**Contact:** [Your details]
**Book a 15-min demo:** [Calendar link]

---

## SLIDE 14 — CLOSE

### The knowledge tax is real. And it compounds.

At 15 people, one new hire asking 3 questions a day interrupts 5 senior staff.
At 30 people, your ops lead is spending 30+ hours a month being a human search engine.
At 50 people, critical processes live in one person's head and nowhere else.

**Athena is the layer that makes your institutional knowledge accessible — without the founder or ops lead in the room every time.**

No new wiki to build.
No migration from Google Docs.
No hallucinations. Ever.

Just your existing docs, made answerable. In minutes.

> *"Your team's knowledge is already documented. Athena makes it findable."*

---
---

# PITCH SCRIPTS

---

## SCRIPT A — FOR ORG HEADS
### (Founders, COOs, Ops Managers, HR Leads)

---

**THE HOOK (first 20 seconds — say this before you open a laptop)**

> "I want to ask you something. Think about the last time someone on your team came to you with a question — and the moment they asked it, you thought: *we have a document for that.*
>
> Maybe you answered it anyway. Maybe you sent a link. Maybe you told them to ask someone else.
>
> Whatever you did — you stopped what you were doing. For something that was already written down.
>
> That's not a people problem. That's a systems problem. And it compounds every time you hire someone new.
>
> What we built is simple: your team asks a question. Athena finds the answer in your company's own documents and returns it in 3 seconds — with the source cited. And if the docs don't cover it, it tells your team *exactly* who to ask. Name. Title. Email. Not 'contact HR.' A real person.
>
> It never makes an answer up. Let me show you."

---

**THE DEMO FLOW**

*[Open Athena. Show the chat interface. Type live — don't pre-load answers.]*

**Query 1:** *"what is the process for submitting expenses?"*

> "Watch this. I'm asking about expense claims — one of the most common repeated questions in any ops team."

*[Result comes back: verbatim policy text, source doc cited.]*

> "That came from the expense policy document. Verbatim. Source cited right there. If I'm your new finance analyst, I got my answer in 3 seconds instead of messaging the ops lead."

**Query 2:** *"what happens if I need emergency leave?"*

> "HR questions. Same thing."

*[Result: leave policy section, source cited.]*

> "Your HR lead stops getting the same 10 questions every Monday morning. They wrote the policy once. Athena answers it forever."

**Query 3 — The differentiator:** *"we need to review an NDA with a new partner"*

> "Now watch what happens when the answer isn't in the documents."

*[Result: staff routing card — Zanele Mokoena, General Counsel, email.]*

> "It doesn't guess. It doesn't make something up. It says: *I don't have this — here's who does.* Zanele Mokoena, General Counsel, her email right there. This is what makes it trustworthy. The moment an AI fabricates an answer about your legal process or your HR policy, people stop using it. Athena never does that."

---

**THE CLOSE**

> "Everything you just saw ran on existing Google Docs. We ingested 7 documents in under 60 seconds. No new wiki. No migration. No IT ticket.
>
> What I want to know is: what's the question your team asks most often that they should already know the answer to?
>
> Tell me that, and I'll show you what Athena returns — live, on your actual documents — in the next 15 minutes.
>
> That's our ask. One question. 15 minutes. And if it works, we'd love to run an early access pilot with your team. No cost. No commitment. Just your docs and an open Slack channel."

---

**OBJECTION RESPONSES**

*"We already use ChatGPT."*
> "Try asking ChatGPT what your expense approval limit is. It'll give you a confident, completely wrong answer. Athena only answers from your actual documents. It literally cannot answer from anywhere else."

*"Our docs are a mess."*
> "Good. That's exactly why this works. Athena surfaces what's there and routes to a person when docs are missing. Messy docs don't produce wrong answers — they produce honest ones. You'll also learn fast which topics need better documentation."

*"We tried building something like this."*
> "A basic RAG pipeline takes an engineer 2–3 weeks to get right. Maintenance, multi-tenancy, the staff fallback logic, the zero-hallucination architecture — add another 2 months. Athena is that system, running today. What would you rather your engineer be working on?"

*"Is our data secure?"*
> "Your documents are fetched with your own Google credentials. Embeddings are generated via Gemini and stored in your own database. Nothing is shared with us or any third party. Your data stays in your environment."

---
---

## SCRIPT B — FOR NEW HIRES
### (First week, all-hands intro, onboarding session)

---

**THE HOOK (casual, conversational — not a sales pitch)**

> "Quick show of hands — who here has ever sent a message to someone asking a question, and then found the answer in a Google Doc 20 minutes later?
>
> *[pause for hands / laughter]*
>
> Yeah. We've all done it. And when you're new, it's even worse — you don't know what's documented, you don't know where to look, and you don't want to bother people who are clearly busy.
>
> So we built something. It's called Athena. Think of it as a colleague who has read every document this company has ever written — and has a perfect memory.
>
> You ask it a question. It finds the answer. If it doesn't know, it tells you who does.
>
> Let me show you what that looks like."

---

**THE DEMO (keep it casual, use real questions)**

> "I'll use the kinds of questions you might actually have in your first week."

*[Type live in chat:]*

**"what's our leave policy?"**
> "Boom. Leave policy, right there. Source document linked. I didn't have to message anyone."

**"how do I submit an expense claim?"**
> "Exact process. Step by step. From the actual expense policy doc."

**"who do I talk to about IT access?"**
> *(If in docs)* "Here's the process."
> *(If routes to person)* "Here's the person who handles it — name, email, right there."

---

**THE CLOSE (make it feel like a gift, not a tool)**

> "That's it. It's on [URL / Slack channel / wherever you've deployed it]. You can ask it anything — org structure, processes, policies, who owns what. It won't judge you for asking something you 'should' already know.
>
> And if it doesn't have the answer, it'll tell you who to ask — so you're never stuck wondering who the right person is.
>
> One rule: if you ask Athena something and the answer isn't there, tell us. That's how we know what we haven't documented yet. Every gap you surface makes it better for everyone who joins after you.
>
> Welcome to the team. Your first question is free."

---
---

# QUICK REFERENCE

## The one-liner (pick by context)

| Situation | Line |
|---|---|
| Cold intro | "AI that knows your company — finds answers in your docs, tells you exactly who to ask when it doesn't." |
| Demo opening | "Every team has a knowledge problem. Someone always knows the answer — but nobody knows who that someone is. Athena fixes that." |
| Investor | "Building the internal knowledge layer for African professional teams — AI that answers from company docs and routes to the right person when docs fall short." |
| 5-second version | "Ask a question. Get an answer or a name." |

## Stats to use

- **30 minutes** lost every time someone tracks down an answer
- **5–8 interruptions/day** for the average ops lead at a 40-person company
- **30+ hours/month** spent being a human search engine
- **2 weeks** longer to reach productivity for new hires when knowledge is scattered
- **60 seconds** to ingest 7 documents and go live
- **< 2 seconds** query response time
- **Zero** hallucinations in architecture (no generative step in response path)
