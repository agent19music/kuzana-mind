# Tally Forms Connector — Implementation Spec

Feedback/survey ingestion so staff can ask Athena about feedback they've received on any connected Tally form, grounded in the actual submissions instead of a hallucinated summary.

---

## Why REST ingestion, not the Tally MCP server

Tally ships an official MCP server (`api.tally.so/mcp`, beta) that lets an AI agent call live tools — list forms, fetch submissions — via OAuth at question time. That's a different shape than everything else in Athena: `retrieval.py::answer_query` answers from a pre-indexed pgvector similarity search, not a tool-calling agent loop. Adopting MCP would mean a second answer path plus a new OAuth flow, for a server that's explicitly beta/subject to change. Revisit once it's stable and if Athena ever needs live (non-indexed) lookups.

---

## What changes

| Area | What |
|---|---|
| `backend/database.py` | `Organization.tally_api_key` (String), `Organization.tally_form_ids` (JSONB) |
| `backend/alembic/versions/d4e5f6a7b8c9_tally_connector.py` | Migration adding the two columns |
| `backend/ingest.py` | `load_from_tally()` — fetches submissions per form, one document per submission |
| `backend/main.py` | `/ingest` accepts optional `tally_api_key` + `tally_form_ids` |
| `apps/app/app/onboarding/page.tsx` | Tally API key + form IDs fields |
| `apps/app/app/api/orgs/route.ts` | Passes `tallyApiKey`/`tallyFormIds` through to `/ingest` |
| `apps/app/app/admin/connections/ConnectionsClient.tsx` | Tally connection card |

---

## Ingestion flow

```
GET https://api.tally.so/forms/{formId}
  Authorization: Bearer <tally_api_key>
  → { name, ... }                          # form title, for citations

GET https://api.tally.so/forms/{formId}/submissions?page=1&limit=50
  → {
      page, limit, hasMore,
      questions: [{ id, title, ... }],     # question label lookup
      submissions: [{
        id, formId, respondentId, submittedAt,
        responses: [{ questionId, answer }]
      }]
    }
```

Each submission is rendered as one markdown document — question labels resolved from `questions`, answers flattened to text (handles string/number/choice-list/dict shapes) — and chunked through the same header-split + recursive-splitter pipeline as every other source. Keeping one respondent's answers in a single document (rather than one chunk per question) means a match returns that person's full feedback, not an isolated answer stripped of context.

`doc_id` is `{formId}_{submissionId}`, namespaced per org by `namespaced_doc_id("tally", org_id, ...)` like every other source — a re-ingest replaces exactly that submission's chunks, never another tenant's.

---

## Getting a Tally API key

1. `tally.so/settings/api` → **Generate new access token**
2. Copy the token into the onboarding form's "Tally API key" field, or set `TALLY_API_KEY` for a single-tenant local-dev fallback
3. Form IDs come from the form's edit URL (`tally.so/forms/{formId}/edit`) or the `GET /forms` list endpoint

---

## Not in scope (post-MVP)

- Tally OAuth (Tally doesn't currently offer a public OAuth app model for third parties — personal access tokens are the supported path)
- Filtering submissions by date range / completion status
- Re-visiting the official Tally MCP server once it leaves beta, as a live-lookup complement to indexed search
