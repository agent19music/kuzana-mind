# File Preview & Passage Highlighting — Spec

## 1. Requirements

**Functional**
- Clicking a chat citation for an uploaded file opens a preview of the original document instead of a broken guessed URL.
- The preview jumps to / highlights the specific passage the answer was drawn from ("annotation" = highlight the matched excerpt, not free-form user annotations).
- Applies across all upload-derived formats: PDF, Word, Markdown, plain text, HTML, CSV (per `backend/extract.py`'s supported set).

**Non-functional**
- Must respect existing multi-tenant isolation (org-scoped, RLS-backed) — a preview must be unreachable cross-org even with a guessed doc_id.
- No regression to the existing 25MB/file upload cap or ingestion latency.
- Cost-aware: avoid paying for infrastructure (object storage, signed URL minting) for source types that don't need it.

**Constraints**
- GCP-only stack (Cloud Run, Cloud SQL + pgvector, Secret Manager, Artifact Registry). No object storage integration exists today — greenfield.
- Small team, incremental stacked-PR workflow (see recent PRs #13–#19) — favors shippable slices over one big-bang PR.
- UI rules: `fontWeight: 400` everywhere, no uppercase, minimal letter-spacing (`apps/app/CLAUDE.md`).

## 2. Root cause recap

- `DocumentCard.tsx:165-197` hardcodes two URL templates: `notion` → `notion.so/{id}`, everything else → `docs.google.com/document/d/{id}`. For `source_type: "upload"` (and `"tally"`), `sourceDocId` is just the raw filename, so it silently builds a fake Google Docs URL.
- The original file bytes are **never persisted**. `backend/main.py`'s `/upload` reads bytes → `extract_text()` → discards bytes, keeps only chunked plain text in `DocumentChunk.chunk_text`. There is no file to point at today, for any format.
- `docs/specs/file-upload-spec.md` incorrectly assumed `DocumentCard` was already source-agnostic ("no frontend chat changes needed") — that assumption is the root of the broken link.

## 3. Key design insight: PDF fidelity and "preview at all" are separable problems

Rendering docx/html/csv/txt/md natively in-browser isn't feasible without new tooling, but we already extract and store their full plain text as ordered `DocumentChunk.chunk_text` rows. Reassembling those rows gives a complete, accurate **text preview with zero new infrastructure** — no GCS, no schema change beyond an ordering key. Substring-highlighting the matched excerpt in plain text is trivial (`<mark>` + scroll-into-view).

Only true PDF page rendering (preserving visual layout) requires storing the original bytes and a PDF.js viewer. That's a materially bigger, separable investment.

This splits the feature into two independently shippable tracks:

| Track | Needs | Covers |
|---|---|---|
| **A — Text preview** | Existing DB data + 1 ordering field | All formats, including PDFs (reflowed, no original layout) |
| **B — Native PDF preview** | GCS storage + PDF.js + signed URLs | PDFs only, adds visual fidelity + real page numbers |

Track A alone fixes the reported bug end-to-end. Track B is a pure enhancement on top.

## 4. Data model

### 4.1 New table: `document_files` (one row per ingested document, not per chunk)

The existing chunk table is confusingly already named `documents` at the SQL level (`DocumentChunk.__tablename__ = "documents"`), so the new table needs a distinct name.

```python
class DocumentFile(Base):
    __tablename__ = "document_files"

    id          = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    org_id      = Column(String, ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"), nullable=False)
    doc_id      = Column(String, nullable=False)   # same value as DocumentChunk.doc_id
    source_type = Column(String, nullable=False)
    title       = Column(String)
    storage_path = Column(String, nullable=True)   # GCS object path — NULL until Track B, and NULL forever for google_docs/notion/tally/mock
    mime_type    = Column(String, nullable=True)
    byte_size    = Column(Integer, nullable=True)
    page_count   = Column(Integer, nullable=True)  # PDFs only, Track B
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("org_id", "doc_id", name="uq_document_files_org_doc"),
        Index("ix_document_files_org_doc", "org_id", "doc_id"),
    )
```

RLS: same treatment as `documents` — `org_isolation` policy + queries go through `session_for_org`. Migration follows the existing `8a3c2d5e6f20_documents_rls.py` pattern.

Only `source_type == "upload"` rows get populated at first. `google_docs`/`notion` keep using their native external links (no row needed — `DocumentCard` still special-cases them). `tally`/`mock` get no preview at all (see §7).

### 4.2 Chunk ordering (Track A requirement)

`DocumentChunk` needs a stable per-document ordering key to reassemble text correctly. Check `ingest.py::chunk_document`'s existing metadata (`breadcrumb`, `section_part`, `h1`/`h2`/`h3`) — if `section_part` is already a monotonic integer within a doc_id, reuse it directly as `ORDER BY (metadata_->>'section_part')::int`. If not, add one (`metadata_["chunk_index"] = i` at creation time, `ingest.py`) — cheap, no migration needed since `metadata_` is already JSONB.

### 4.3 `ChatResponse` needs the literal excerpt, not just the synthesized answer

`backend/main.py`'s `ChatResponse` and `retrieval.py::answer_query` currently return an LLM-synthesized answer — paraphrased text that won't literally appear in the source document, so it can't drive substring highlighting. Add `source_excerpt: str | None` = the raw `chunk_text` (or first ~500 chars) of the matched chunk, threaded through the same path as `source_doc_id`/`source_type` today.

## 5. Storage service (Track B only)

- **Bucket**: new GCS bucket, e.g. `kuzana-brain-uploads`. Layout: `uploads/{org_id}/{uuid4}/{sanitized_filename}` — a UUID path segment sidesteps filename collisions and path-injection concerns; never build object paths directly from user-supplied filenames without this indirection.
- **Access**: bucket is private. All reads go through the backend (`require_auth`, same JWT-based org check as every other endpoint) — never expose the bucket or objects publicly.
- **Serving**: mint short-lived (5 min) V4 signed URLs via the Cloud Run service account (works via the metadata server, no key file needed — same SA already used for Cloud SQL/Secret Manager access). Prefer this over backend-proxied byte-streaming: keeps large-file transfer off the Cloud Run instance's memory/timeout budget.
- **Retention**: Postgres `ON DELETE CASCADE` on `org_id` cleans up `document_files` rows automatically on org offboarding, but **cannot** reach into GCS. Must add an explicit step to the existing Clerk `organization.deleted` webhook handler (`backend/CLAUDE.md` references `POST /webhooks/clerk`) that deletes the `uploads/{org_id}/` prefix. Flag this explicitly — an orphaned-files leak is a real compliance/cost issue for a multi-tenant app, not a nice-to-have.
- **Size cap**: reuse the existing 25MB/file upload limit already enforced in the admin UI — no new cap needed, just don't forget storage cost is now durable, not transient.

## 6. Backend API surface

- `GET /documents/{doc_id}/preview` (auth: `require_auth`, org-scoped join on `document_files.org_id == jwt.org_id AND document_files.doc_id == doc_id`, 404 otherwise — same ownership-check shape as `/conversations/{id}`).
  - Track A response (no `storage_path`): `{ "mode": "text", "content": "<reassembled chunk_text, in order>", "title": ... }`
  - Track B response (`storage_path` present, PDF): `{ "mode": "pdf", "signed_url": "...", "page_count": N, "mime_type": "application/pdf" }`
- `/upload` (main.py) gains one step in Track B: after `extract_text()` succeeds, upload the original `raw` bytes to GCS before discarding them, and upsert the `document_files` row alongside the existing chunk-write transaction.
- No new auth model — this is purely user-facing, reuses `require_auth`; `require_backend_secret` is irrelevant here.

## 7. Frontend

### `DocumentCard.tsx` — fix the source-routing switch, not just add a case

```
google_docs → external link (unchanged)
notion      → external link (unchanged)
upload      → open in-app PreviewPanel (new)
tally       → suppress the link entirely, same as mock (no meaningful "source URL" exists for a form submission; revisit only if Tally's API exposes one — separate, low-priority spike)
mock        → suppress (unchanged, already correct)
```
Also widen the `sourceType` TS union (`DocumentCard.tsx:8`, `ChatClient.tsx:17`) to include `"upload" | "tally"` — currently silently untyped past `.json()`.

### New `PreviewPanel` component
- Fetches `GET /api/documents/{docId}/preview` (new thin Next.js proxy, same shape as `apps/app/app/api/files/route.ts`).
- `mode: "text"` → scrollable read-only text view, `excerpt` wrapped in `<mark>`, `scrollIntoView({block: "center"})` on mount.
- `mode: "pdf"` (Track B) → `pdfjs-dist`/`react-pdf`, jump to a page derived from client-side text-layer search for the excerpt (PDF.js exposes per-page text content — search sequentially, cache the found page), highlight via an absolutely-positioned overlay on the matched text-layer span.
- Render as a slide-over panel rather than a new route — keeps the chat thread in context, matches the existing citation-card interaction model.

## 8. Phasing (stacked PRs, matching repo convention)

| PR | Scope | Ships |
|---|---|---|
| **1** | `document_files` migration + RLS; fix `DocumentCard.tsx` routing switch (stop the broken link now, `upload`/`tally` show no link yet); widen TS types | Immediate correctness fix, zero new infra |
| **2** | `source_excerpt` threaded through `retrieval.py`→`main.py`→frontend types; chunk ordering key in `ingest.py`; `GET /documents/{doc_id}/preview` (text mode only); Next.js proxy route; `PreviewPanel` text mode | **Full Track A** — real preview + highlight for every format, PDFs included (reflowed) |
| **3** | GCS bucket + Terraform/gcloud setup; `document_files.storage_path`/`mime_type`/`page_count` write path in `/upload`; signed URL minting; org-deletion cleanup hook | Storage infra, no user-visible change yet |
| **4** | `PreviewPanel` PDF mode via PDF.js, falls back to text mode when `storage_path` is null | **Track B** — native PDF fidelity for new uploads |

**One-way door to flag now**: files uploaded before PR 3 ships have no recoverable original bytes — their preview is permanently text-mode (Track A) unless re-uploaded. This is unavoidable (the bytes are already gone) and worth saying explicitly rather than discovering later.

## 9. Open questions (need a product call before/around PR 3-4)

1. Is Track A (accurate but reflowed text preview) good enough indefinitely, or is native PDF fidelity (Track B) worth prioritizing soon? Given Track A alone fully fixes the reported bug, recommend shipping PR 1-2 first and deciding on Track B based on real usage/feedback.
2. Tally: acceptable to permanently suppress "Open in source" for form submissions, or worth a spike into whether Tally's API exposes a per-submission URL?
3. GCS delete-on-offboard: synchronous (blocks the webhook handler) or fire-and-forget/async sweep? Affects webhook handler complexity in PR 3.
4. Any appetite for backfilling Track B storage for already-uploaded files by asking users to re-upload, or is "new uploads only get native PDF preview" acceptable permanently?
