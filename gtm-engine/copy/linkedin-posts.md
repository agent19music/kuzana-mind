# LinkedIn Posts — Kuzana Brain

Ready-to-post content. Adapt voice to the founder posting. Keep under 250 words each.

---

## Post 1 — The Problem Post

**Best for:** First post. Problem-awareness. No product mention until the end.

---

Every growing team has a knowledge tax.

At 10 people, everyone knows everything. At 30, things start slipping. At 50, someone is spending their entire Monday answering questions that are already documented.

"Where's the expense form?"
"What's our leave policy for contractors?"
"Who handles client escalations?"

The answers exist. They're in a Google Doc somewhere. But by the time someone finds it, they've interrupted two senior people and lost 30 minutes.

This is the problem we're solving with Kuzana Brain — an AI that answers your team's questions from your own company docs. And when the docs don't cover it, it tells you exactly who to ask.

No hallucinations. No new wiki to build. Just your existing docs, made findable.

More soon. We're demoing this week.

---

## Post 2 — The Demo Moment

**Best for:** After the hackathon demo or first live demo. Social proof + product in action.

---

We demoed Kuzana Brain at [Event Name] this week. Here's the moment that landed:

I typed: "We need to review an NDA with a new partner."

Kuzana didn't have that in the docs. So instead of making something up, it returned:

**Zanele Mokoena, General Counsel, Legal & Compliance** — with her email.

That's the whole point. Most AI tools guess when they don't know. Kuzana routes you to the right human. Every time.

The other queries we showed:
- "What's the process for submitting expenses?" → exact policy, source cited
- "Who reports to the CTO?" → full reporting tree from the org doc
- "What happens if I need emergency leave?" → leave policy section, verbatim

All from existing Google Docs. No new knowledge base. Setup took under 60 seconds.

If your team has more than 15 people and a Google Drive full of docs nobody can find — this is built for you.

DM me if you want to see it on your own documents.

---

## Post 3 — The Builder Post

**Best for:** Technical credibility. Appeals to founders and engineers.

---

We built an AI knowledge assistant in a week. Here's the architecture:

**The problem:** Teams document everything in Google Docs. Nobody can find any of it. New hires interrupt 5 people a day asking questions that are already written down.

**The solution:** A RAG pipeline that turns your Google Docs into a searchable, answerable knowledge layer.

Stack:
- Gemini embeddings (768-dim, multilingual)
- pgvector on PostgreSQL 16
- FastAPI backend (async)
- Next.js chat interface
- LangChain header-based chunking

The key design decision: **no LLM in the response path.**

Most RAG systems pass retrieved chunks to an LLM to synthesise an answer. We don't. The answer is a verbatim excerpt from your document, with source cited. If the confidence score is below threshold, we route to a staff member instead.

Zero hallucination surface. The system literally cannot make things up.

Why? For HR policies, finance processes, and org structure — verbatim text from the policy doc is more trustworthy than a paraphrase. Accuracy beats eloquence.

Building this as Kuzana Brain — starting with African professional teams where the knowledge gap scales fast.

Open to design partners. DM me.

---

## Post 4 — The Africa Angle

**Best for:** Positioning in the African tech ecosystem. Thought leadership.

---

African professional teams are scaling faster than their knowledge systems.

A fintech in Lagos goes from 12 to 45 people in 18 months. The ops lead who knew everything when it was small is now drowning in Slack messages every Monday.

The playbook in SF is "buy Confluence" or "set up Notion." That playbook doesn't work here.

Why not:
- Most teams run on Google Workspace, not Atlassian
- Nobody has time for a 6-month knowledge base implementation
- The team WhatsApp group is doing the job of a wiki, badly

We built Kuzana Brain for this reality. It connects to your existing Google Docs — the ones you already have — and makes them answerable through a simple chat interface.

Ask a question. Get the answer from your own docs. Or get the exact person to ask.

No migration. No new tools. No hallucinations.

This isn't about bringing a Western tool to Africa. It's about building the right tool for how African teams actually work.

Early access open. Link in comments.

---

## Post 5 — The Onboarding Post

**Best for:** HR-focused audience. Speaks directly to the onboarding pain.

---

Your onboarding docs are great. Nobody reads them.

I've talked to HR leads at 20+ companies in Nairobi and Lagos. Same story every time:

"I wrote the onboarding guide. It's thorough. It covers everything. And every new hire still messages me on day 2 asking where the leave policy is."

The docs aren't the problem. Discoverability is.

New hires don't know what to search for. They don't know which folder to look in. They don't know the doc exists. So they ask someone — and that someone is usually you.

Kuzana Brain changes that. New hire types a question. Gets the answer from the onboarding docs you already wrote. Source cited.

And when the question isn't documented? Kuzana tells them exactly who to ask — name, title, email. Not "contact HR." An actual person.

Your onboarding gets faster. Your Slack gets quieter. You get your Mondays back.

DM me if you want to see it work on your actual documents.
