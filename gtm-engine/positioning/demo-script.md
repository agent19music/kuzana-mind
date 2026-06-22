# Demo Script — Kuzana Brain
**Audience:** Judges / potential customers / investors
**Duration:** 5–7 minutes
**Format:** Live product demo

---

## The Setup (30 seconds — say this before touching the screen)

> "Every growing team has the same problem. The information exists — it's in a doc, in a policy file, in someone's inbox. But by the time a new hire or a busy manager tracks it down, they've interrupted two people and lost 30 minutes.
>
> What we built is simple: you ask a question in plain English. Kuzana finds the answer in your company's own documents — and tells you exactly who to ask if the docs don't cover it. It never makes an answer up.
>
> Let me show you."

---

## Demo Flow

### Scene 1 — Finance (Score: 0.81 — strongest hit)

**Type this exactly:**
```
what is the process for submitting expenses?
```

**What it returns:**
> Client Billing Workflow — expense reimbursements section. Source cited. Similarity score shown.

**What to say:**
> "That came from our actual expense policy document. It cited the source. Notice it didn't summarise the internet — it pulled from *this company's* process. If I'm a new hire, I just got my answer in 3 seconds instead of messaging someone in Finance."

---

### Scene 2 — HR (Score: 0.77 — clean leave policy hit)

**Type this exactly:**
```
what happens if I need emergency leave?
```

**What it returns:**
> Leave Policy — emergency leave section. Exact policy text, source cited.

**What to say:**
> "Same thing for HR. Leave policy, onboarding process, performance review timeline — anything that's been written down, Kuzana finds. The HR team stops getting the same 10 questions every week."

---

### Scene 3 — Org Chart (Score: 0.78 — renders the full reporting tree)

**Type this exactly:**
```
who reports to the CTO?
```

**What it returns:**
> Org Structure doc — full ASCII reporting tree with Siyanda Nkosi and all direct reports (Naledi, Tariq, Amina).

**What to say:**
> "And it's not just policies. Who reports to who, what each team owns, how decisions get made — if it's in a document, it's answerable. New hires don't need an org chart meeting. They just ask."

---

### Scene 4 — The Honest Answer (Staff Routing — this is the differentiator)

**Type this exactly:**
```
we need to review an NDA with a new partner
```

**What it returns:**
> Staff fallback → **Zanele Mokoena, General Counsel, Legal & Compliance** — name, title, department, email.

**What to say:**
> "Now watch what happens when Kuzana doesn't have the answer in the docs. It doesn't guess. It doesn't make something up. It says: 'I don't have this documented — here's exactly who to ask.' Zanele Mokoena, General Counsel, her email right there.
>
> This is what makes it trustworthy. The moment an AI fabricates an answer about your legal process or your HR policy, people stop using it. Kuzana never does that."

---

### Scene 5 — Second Staff Routing (show it's consistent)

**Type this exactly:**
```
I want to understand how our sales pipeline works
```

**What it returns:**
> Staff fallback → **Fatima Al-Hassan, VP of Sales** — name, title, email.

**What to say:**
> "Same behaviour. Not documented yet? Here's the person who owns it. Kuzana becomes the fastest route to both the answer *and* the right person."

---

## The Close (30 seconds)

> "What you're looking at runs on your existing Google Docs. No new knowledge base to build. No wiki to maintain. You point it at your Drive folder, it ingests in under a minute, and your team can start asking questions immediately.
>
> And when your docs are incomplete — which they always are — it tells you who to ask instead of pretending it knows.
>
> We built this because African professional teams are scaling fast, and the knowledge problem scales faster. Kuzana is the layer that makes institutional knowledge accessible without the founder or the ops lead in the room every time."

---

## Anticipated Questions — With Answers

### "What if our documents are messy or out of date?"
> "Good question — and honestly, most docs are. Kuzana surfaces what's there and scores its confidence. When a document answer is below our threshold, it routes to a person instead. So messy docs don't produce wrong answers — they produce an honest 'I'm not sure, ask this person.' Over time that actually tells you *which* topics need better documentation."

### "How is this different from just using ChatGPT?"
> "Ask ChatGPT what your expense approval limit is. It'll give you a confident, completely wrong answer — because it knows nothing about your company. Kuzana only answers from your actual company documents. If the answer isn't there, it doesn't guess."

### "What about hallucinations?"
> "The architecture prevents it. We use cosine similarity against your document embeddings. If the best match is below our confidence threshold, we don't return a document answer at all — we route to a staff member. There's no generative step that could invent information. The answer is either a chunk from your document, verbatim and cited, or a person's contact details."

### "How long does setup take?"
> "For the demo you just saw — under 60 seconds. Point it at a folder, call the ingest endpoint, done. Production setup with a Google Drive service account adds maybe 30 minutes of GCP configuration. No migration, no rebuilding anything you already have."

### "What happens when documents get updated?"
> "Re-ingest runs on a weekly cron job — or you can trigger it manually via a single API call. Old chunks are deleted, new ones replace them. The whole pipeline runs in the background, no user action required."

### "Does our data leave our environment?"
> "Documents are fetched from your Google Drive with your own credentials. Embeddings are generated through the Gemini API and stored in your own pgvector database — on Cloud SQL in production, or your own server. Nothing is shared, nothing is stored by us."

### "What's the pricing?"
> "We're in early access. We're talking to companies now to shape the pricing model. Likely per-seat SaaS or per-company flat rate. If you're interested in being a design partner, we'd love to run this on your actual docs."

### "Can it handle multiple languages?"
> "The embedding model handles multilingual input well — English, Swahili, French. If your docs are in multiple languages, it'll retrieve across them. Formal multi-language UI is on the roadmap."

### "How does it handle sensitive documents — payroll, contracts?"
> "Access control is inherited from Google Drive permissions. If a document is in a folder the service account can read, Kuzana can retrieve it. Restricting access to sensitive docs is done the same way you'd restrict Drive access — the integration respects those boundaries."

### "What's the roadmap?"
> "Three things coming next: real-time Google Drive sync instead of scheduled ingest, Slack integration so people can ask questions without leaving where they work, and usage analytics so ops leads can see which questions come up most — which is basically a gap analysis for your documentation."

---

## Technical Deep Dive (for engineers or technical judges)

Use this section when a technical evaluator wants to go under the hood. Adapt freely — this is the real architecture, not a simplified pitch.

---

### The pipeline in one sentence

> "It's a RAG pipeline: documents are chunked, embedded with Gemini, stored in pgvector, and retrieved by cosine similarity at query time. There's no LLM generating answers — the retrieval result *is* the answer."

---

### Ingestion pipeline

When you call `POST /ingest`, three things happen:

**1. Document loading**
Documents come from one of three sources, resolved in priority order:
- Public Google Docs fetched via export URL (`/export?format=txt`) — no auth, for demo
- Local markdown files in `sample_docs/` (mock mode, `USE_MOCK=true`)
- Google Drive via service account (production path, post-MVP)

**2. Chunking**
We use LangChain's `MarkdownHeaderTextSplitter` — splits on `#`, `##`, `###` headers. This preserves semantic section boundaries instead of naively splitting on character count. Each chunk keeps its header metadata so you know *which section* of a document answered the query.

**3. Embedding + storage**
Each chunk is embedded with `gemini-embedding-2` at 768 dimensions, using the `RETRIEVAL_DOCUMENT` task type. Stored in PostgreSQL with the `pgvector` extension — IVFFlat index on the `embedding` column. Upsert logic: existing chunks for a `doc_id` are deleted before re-inserting, so re-ingesting is idempotent.

---

### Retrieval pipeline

At query time:

**1. Query embedding**
The user's question is embedded with the same `gemini-embedding-2` model, using `RETRIEVAL_QUERY` task type. Using the correct task type matters — Gemini optimises the embedding space differently for documents vs. queries.

**2. Cosine similarity search**
pgvector's `<=>` operator computes cosine distance. We convert to similarity: `1 - (embedding <=> query_vector)`. Top 5 results returned, ranked by score.

```sql
SELECT title, chunk_text, 1 - (embedding <=> cast(:query AS vector)) AS score
FROM documents
ORDER BY embedding <=> cast(:query AS vector)
LIMIT 5;
```

**3. Threshold gate**
If the top result's similarity score is ≥ 0.75, we return that chunk verbatim — title, text, score. No LLM synthesis. The answer is a direct excerpt from your document.

If the top score is below 0.75, we skip the document result entirely. No hallucination risk because there's no generation step.

**4. Staff fallback**
Below-threshold queries go to `staff_directory.json` — a static file of team members with their domain, topics, and reason to contact. Topic-matching is keyword-based against the query. The system returns a name, title, email, and a one-line reason to contact them.

This two-path architecture is intentional: **either we're confident in a document answer, or we route to a human. We never synthesise.**

---

### Why no LLM in the response path?

Most RAG systems pass retrieved chunks to an LLM to generate a summary. We don't, deliberately:

- **No hallucination surface.** Synthesis is where models drift. If we're not generating, we can't fabricate.
- **Auditability.** The answer is a verbatim excerpt. The user can verify it against the source doc.
- **Speed.** One embedding call + one SQL query. No second model call in the hot path.
- **Trust.** For HR policies and finance processes, verbatim text from the policy document is more trustworthy than a paraphrase.

The tradeoff: answers aren't as fluent. For MVP with internal ops teams, that's fine — accuracy beats eloquence.

---

### Stack summary

| Layer | Choice | Why |
|---|---|---|
| Embedding model | `gemini-embedding-2` (768-dim) | Multilingual, strong semantic alignment, same vendor as potential Gemini LLM upgrade |
| Vector store | PostgreSQL 16 + pgvector | Runs locally in Docker, same SQL on Cloud SQL in production — zero migration cost |
| Chunking | LangChain `MarkdownHeaderTextSplitter` | Section-aware splits, preserves hierarchy metadata |
| Backend | FastAPI (async) | Embedding calls are I/O-bound, async fits naturally |
| Similarity threshold | 0.75 cosine similarity | Tunable per deployment — raise it to tighten precision, lower it to increase recall |
| Fallback | Static `staff_directory.json` | No moving parts, no second model call, always returns a real human |

---

### "Why pgvector instead of a dedicated vector DB like Pinecone or Weaviate?"

> "For this use case — a single company's internal docs — the dataset is small enough that pgvector's IVFFlat index handles it with no performance penalty. We gain operational simplicity: one database for everything, no additional service to manage. In production it's Cloud SQL for PostgreSQL, which the customer's GCP team already knows how to run and monitor. Pinecone is the right call at millions of vectors and multi-tenant isolation requirements; we're not there."

### "Why not fine-tune the embedding model on company-specific language?"

> "Gemini's embedding model already handles domain-specific terminology well enough for retrieval at this scale. Fine-tuning is expensive and requires labelled query-document pairs the customer doesn't have yet. The right time to consider it is after we have query logs showing where retrieval is failing — which is a post-MVP problem."

### "What's the cold start problem — what if someone asks before ingestion runs?"

> "The similarity search returns no results, which falls below threshold, which routes to staff fallback. The system degrades gracefully — it never errors, it always returns a useful response. The worst case is 'I don't have docs on this, here's who to ask' rather than a 500."

### "How do you handle documents that are too long to be one chunk?"

> "LangChain's header splitter breaks them into sections — typically 200–800 tokens each. Long documents become multiple chunks, each independently searchable. The ingest endpoint handles a document of any length; chunking is proportional. We haven't hit a document yet where section-based chunking produced chunks too large to embed."

---

## Fallback Plan (if the demo breaks)

Have this screen recording ready: a 90-second run-through of Scenes 1–4 above, no audio needed. If the live demo fails, play it and narrate over it.

Queries that are most reliable if you need to re-run live:
1. `what is the process for submitting expenses?` — highest score (0.81)
2. `what happens if I need emergency leave?` — clean hit, clean copy
3. `we need to review an NDA with a new partner` — cleanest staff fallback
