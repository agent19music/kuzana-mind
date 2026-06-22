# GTM Engine — Kuzana

Go-to-market operations for **Kuzana Brain** — the AI knowledge assistant built for African professional teams. This directory holds strategy documents, campaign briefs, copy, analysis, and launch assets.

The product: a chat interface backed by a RAG pipeline (pgvector + Gemini embeddings) that answers team questions from company docs and routes to the right person when docs don't cover it. It's a knowledge layer that removes the "who do I ask about X?" friction.

---

## How to Work in This Directory

Each section below is a skill area. When working on GTM tasks, anchor every output to:
1. **The problem it solves** — friction for African professional teams navigating internal knowledge
2. **The proof** — cite specific product behaviour (the fallback to staff contact, source citation, etc.)
3. **The audience** — operations leads, HR managers, and founders at 10–200 person companies

---

## Skills

### 1. Ideation
**When:** Generating campaign angles, positioning statements, product narrative frames, launch themes, or content pillars.

**How to approach:**
- Start with the user's daily frustration, not the product's features
- Generate 5–10 raw angles before narrowing — diverge first, then converge
- For each angle: write a one-line insight (the tension), one-line product response (how Kuzana resolves it), and a sample hook (headline or first sentence)
- Test each against the Kuzana brand voice: **direct, warm, no fluff** — think Linear's writing, not Salesforce's

**Output format for an ideation session:**
```
## Angle: [Name]
Tension: [what the user experiences today]
Resolution: [what Kuzana does about it]
Hook: [headline or opening line]
Channel fit: [LinkedIn / email / demo / landing page / etc.]
```

---

### 2. Producing
**When:** Writing final copy — landing pages, emails, LinkedIn posts, demo scripts, one-pagers, sales decks, case study drafts.

**Brand voice:**
- Short sentences. One idea per sentence.
- No filler: remove "leverage", "empower", "seamlessly", "cutting-edge"
- Use second person ("you") for marketing copy; first person ("we") sparingly in thought leadership
- Numbers beat adjectives: "answers in under 2 seconds" > "responds instantly"
- Show the product doing something specific; never just describe what it is

**Asset types and what belongs in each:**

| Asset | Goal | Max length |
|---|---|---|
| LinkedIn post | Thought leadership / product stories | 250 words |
| Email (cold outreach) | Book a demo | 120 words |
| Email (nurture) | Build credibility | 200 words |
| Landing page hero | Convert first impression | Headline ≤8 words, sub ≤20 words |
| One-pager | Leave behind after demo | 1 page, 3 sections: problem / solution / proof |
| Demo script | Guide a live walkthrough | 10–15 min, 5 steps max |
| Case study | Pipeline acceleration | 400–600 words, must include a quote and a metric |

---

### 3. Shipping
**When:** Planning a launch — new feature, beta, public launch, partnership announcement, or hackathon demo.

**Launch tiers:**

| Tier | Scope | Lead time | Channels |
|---|---|---|---|
| Soft launch | Beta users, internal demo | 1 week | Email, Slack, personal LinkedIn |
| Feature drop | Existing users + waitlist | 2 weeks | Email, LinkedIn, Product Hunt teaser |
| Public launch | Full market | 4–6 weeks | LinkedIn, Product Hunt, press, partners |

**Standard launch checklist (adapt per tier):**
- [ ] Positioning locked (one-liner, hero copy)
- [ ] Demo video or GIF (30–60 sec) ready
- [ ] Landing page live and tested
- [ ] Email sequence drafted (announcement + follow-up)
- [ ] Social posts scheduled (day of + day 3 + week 1 recap)
- [ ] Stakeholder briefing done (anyone who needs to know before it goes live)
- [ ] Analytics in place (conversion tracking, UTM params)
- [ ] Support / FAQ doc ready for inbound questions

**For hackathon demo specifically:**
- Lead with the problem (30 sec), show the live product (4 min), end with the roadmap (1 min)
- Have a fallback screen recording — live demos break
- Prep 3 canned queries that show the best responses

---

### 4. Analyzing
**When:** Reviewing campaign performance, demo conversion rates, user feedback, cohort data, or competitive signals.

**Standard analysis structure:**
```
## [Campaign / Activity Name] — [Date range]
### What we measured
[Metric | Target | Actual | Delta]

### What worked
[2–3 specific observations with evidence]

### What didn't
[2–3 specific observations — be direct, no hedging]

### Why (hypothesis)
[Root cause for the biggest delta]

### What to change
[Concrete next action, owner, deadline]
```

**Metrics by stage:**

| Stage | Primary metric | Secondary metric |
|---|---|---|
| Awareness | Impressions, reach | Engagement rate |
| Interest | Link clicks, demo requests | Email open rate |
| Demo | Show rate | Time in demo |
| Conversion | Paid / signed contracts | Time to close |
| Retention | Weekly active users | Query volume |

---

### 5. Market
**When:** Researching the competitive landscape, identifying ICP (ideal customer profile), sizing opportunity, or understanding buyer behaviour in African professional markets.

**ICP for Kuzana Brain (current):**
- **Company size:** 10–200 employees
- **Geography:** Sub-Saharan Africa (Nigeria, Kenya, South Africa, Ghana primary)
- **Sector:** Professional services, fintech, NGOs, fast-growing startups
- **Role:** Operations manager, HR lead, founder/COO
- **Pain:** Knowledge is trapped in people's heads or in Google Drive folders nobody can find
- **Signal they're ready:** >3 departments, onboarding someone new, or just had an "I didn't know who to ask" failure

**Market framing:**
- Category: Internal knowledge management / AI assistant for teams
- Adjacent players: Notion AI, Guru, Confluence, ChatGPT (used ad hoc)
- Kuzana's edge: African context (staff, org structures, informal comms norms), no hallucination (always cites source or routes to person), runs on your existing Google Docs

**Competitive positioning table:**

| Dimension | Notion AI | Guru | Kuzana Brain |
|---|---|---|---|
| Setup time | High (build the wiki first) | Medium | Low (connects to existing Docs) |
| Hallucination risk | Medium | Low | Zero (never fabricates) |
| Staff directory routing | No | No | Yes |
| Africa-first | No | No | Yes |
| Price point | $$ | $$$ | TBD |

---

### 6. Campaigns
**When:** Designing a multi-touch campaign — from hypothesis through execution plan.

**Campaign brief template:**
```
## Campaign: [Name]
Date: [Start – End]
Owner: [Name]

### Objective
[One sentence: what business outcome does this drive?]

### Audience
[Who specifically — job title, company size, pain point]

### Core message
[The single idea this campaign communicates]

### Proof point
[The specific product behaviour or stat that backs the message]

### Channel plan
| Channel | Content | Cadence | Owner |
|---|---|---|---|
| LinkedIn | [type] | [frequency] | |
| Email | [type] | [sequence] | |
| Community | [type] | [frequency] | |

### Success metrics
[Primary KPI + threshold that means it worked]

### Budget
[Cost or time investment]
```

**Campaign types for Kuzana at this stage:**
- **Problem-awareness campaigns** — "Does your team spend more time asking than doing?" — runs before people know Kuzana exists
- **Category campaigns** — position the AI knowledge layer as a category (like how Slack positioned async comms)
- **Social proof campaigns** — once there are real users, testimonials + use-case stories
- **Partnership campaigns** — co-market with African HR platforms, accelerators, or professional associations

---

### 7. Activities
**When:** Planning specific tactical activities — events, webinars, partnerships, community plays, sponsored posts, outbound sequences.

**Activity log format (track everything here):**
```
## Activity: [Name]
Type: [Event / Outreach / Partnership / Content / Paid / Community]
Date: [Date or date range]
Channel: [Where it happens]
Audience size: [Estimated reach]
Goal: [Specific outcome — demos booked, signups, press mentions, etc.]
Status: [Planned / In progress / Done]
Result: [Fill in after — quantified]
Learning: [One sentence — what this activity taught us]
```

**High-leverage activities for early-stage GTM:**

| Activity | Why it works at this stage |
|---|---|
| Founder-led LinkedIn content | Trust travels through people, not logos |
| Direct outreach to ops managers | 10 personal DMs beat 1,000 cold emails |
| Demo at accelerator demo days | Concentrated ICP audience, warm room |
| Slack/WhatsApp community presence | Where African professionals actually talk |
| Guest post on African tech blogs (Techpoint, Disrupt Africa) | SEO + credibility |
| Partnership with HR/ops consultants | They already have the trust; you have the tool |

---

## File Naming Convention

```
gtm-engine/
├── CLAUDE.md                        # This file
├── positioning/
│   ├── one-liner.md
│   └── competitive-matrix.md
├── campaigns/
│   └── [YYYY-MM]_[campaign-name].md
├── copy/
│   ├── landing-page.md
│   ├── email-sequences.md
│   └── linkedin-posts.md
├── analysis/
│   └── [YYYY-MM]_[activity]-retrospective.md
└── activities/
    └── activity-log.md
```

---

## Working with Claude on GTM

Tell me which skill you're in, and give me:
- **Context:** what stage are we at, what's the audience
- **Goal:** what specific output do you need
- **Constraints:** tone, word count, channel, deadline

I'll follow the frameworks above. If something needs to be challenged (a weak angle, a metric that doesn't reflect reality, copy that sounds like every other SaaS), I'll say so.
