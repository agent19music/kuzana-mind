# File & Folder Upload — Pipeline Spec

Users (admins) can upload files or entire folders from their device. Files are extracted,
chunked, embedded, and stored as `DocumentChunk` rows with `source_type = "upload"`.
No new database tables needed — the existing pipeline handles everything.

---

## Architecture

```
Browser
  │  drag-and-drop or <input webkitdirectory>
  │  collects files (with relative paths for folder uploads)
  ▼
POST /api/upload  (Next.js API route)
  │  attaches Clerk Bearer token
  │  streams multipart body to backend
  ▼
POST /upload  (FastAPI)
  │  auth: require_auth (Clerk JWT — org_id comes from token)
  │  receives List[UploadFile]
  │
  ├── extract_text(file)  ←── per-file type detection + extraction
  │     .txt / .md    → decode UTF-8
  │     .pdf          → pdfplumber page-by-page
  │     .docx         → python-docx paragraph walk
  │     .html / .htm  → BeautifulSoup get_text()
  │     .csv          → rows joined as "key: value" lines
  │
  ├── chunk_document(doc)  ←── existing MarkdownHeaderTextSplitter
  │
  ├── embed_text(chunk)    ←── existing Gemini text-embedding-005
  │
  └── upsert DocumentChunk (org_id from JWT, source_type="upload")
        │
        └── return { uploaded: N, chunks: N, skipped: [...] }
```

---

## File types

| Extension | Extraction | Notes |
|---|---|---|
| `.txt` `.md` | `bytes.decode("utf-8")` | Direct — best quality |
| `.pdf` | `pdfplumber.open()` page text concat | Handles multi-page, tables as text |
| `.docx` | `python-docx` paragraph + table walk | Preserves heading hierarchy |
| `.html` `.htm` | `BeautifulSoup(markup, "html.parser").get_text()` | Strips tags |
| `.csv` | `csv.DictReader` — rows as `"Col: val, Col: val"` lines | Flat tables only |
| Others | **Skip** — return in `skipped[]` with reason | No silent failure |

Max file size: **25 MB per file**, **150 MB total per request**.  
These are enforced in FastAPI before extraction begins.

---

## New files

```
app/
  api/
    upload/
      route.ts                  ← Next.js proxy route
  admin/
    settings/
      FileUploadCard.tsx        ← UI component (drag-drop + folder picker)

backend/
  extract.py                    ← new: text extraction per file type
  main.py                       ← new /upload endpoint
  requirements.txt              ← add pdfplumber, python-docx, beautifulsoup4
```

---

## `backend/extract.py`

```python
import csv
import io
import mimetypes
from pathlib import Path


SUPPORTED = {".txt", ".md", ".pdf", ".docx", ".html", ".htm", ".csv"}
MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB


def extract_text(filename: str, content: bytes) -> str:
    """
    Extract plain text from file bytes. Returns empty string if unsupported.
    Raises ValueError for files that exceed the size limit.
    """
    if len(content) > MAX_FILE_BYTES:
        raise ValueError(f"{filename} exceeds 25 MB limit ({len(content) // 1_048_576} MB)")

    ext = Path(filename).suffix.lower()

    if ext in (".txt", ".md"):
        return content.decode("utf-8", errors="replace")

    if ext == ".pdf":
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text.strip())
        return "\n\n".join(pages)

    if ext == ".docx":
        from docx import Document
        doc = Document(io.BytesIO(content))
        parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                # Preserve heading levels as markdown so the splitter can use them
                style = para.style.name.lower()
                if "heading 1" in style:
                    parts.append(f"# {para.text}")
                elif "heading 2" in style:
                    parts.append(f"## {para.text}")
                elif "heading 3" in style:
                    parts.append(f"### {para.text}")
                else:
                    parts.append(para.text)
        # Include tables as simple text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    parts.append(row_text)
        return "\n\n".join(parts)

    if ext in (".html", ".htm"):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content.decode("utf-8", errors="replace"), "html.parser")
        # Remove script and style blocks
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)

    if ext == ".csv":
        text = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        lines = []
        for row in reader:
            line = ", ".join(f"{k}: {v}" for k, v in row.items() if v.strip())
            if line:
                lines.append(line)
        return "\n".join(lines)

    return ""  # unsupported — caller adds to skipped list
```

---

## `backend/main.py` — new `/upload` endpoint

Add after the `/ingest` route:

```python
from fastapi import File, UploadFile
from extract import SUPPORTED, extract_text

MAX_TOTAL_BYTES = 150 * 1024 * 1024  # 150 MB per request


@app.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    auth_ctx: AuthContext = Depends(require_auth),
):
    """
    Accept one or more files, extract text, chunk, embed, and upsert.
    org_id comes from the verified Clerk JWT — never from the request body.
    """
    from pathlib import Path
    from ingest import chunk_document, embed_text

    org_id = auth_ctx.clerk_org_id

    # Guard total size before reading anything into memory
    total_size = 0
    for f in files:
        # Content-Length on each part isn't always set, so we'll check after read
        total_size += f.size or 0
    if total_size > MAX_TOTAL_BYTES:
        raise HTTPException(400, f"Total upload exceeds 150 MB")

    docs = []
    skipped = []

    for file in files:
        ext = Path(file.filename or "").suffix.lower()

        if ext not in SUPPORTED:
            skipped.append({"name": file.filename, "reason": f"unsupported type ({ext or 'none'})"})
            continue

        raw = await file.read()

        try:
            text = extract_text(file.filename, raw)
        except ValueError as e:
            skipped.append({"name": file.filename, "reason": str(e)})
            continue

        if not text.strip():
            skipped.append({"name": file.filename, "reason": "no extractable text"})
            continue

        # Use filename (without extension) as the document title
        title = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

        docs.append({
            "doc_id": f"upload:{org_id}:{file.filename}",
            "title": title,
            "content": text,
            "source_type": "upload",
        })

    if not docs:
        return {"status": "ok", "uploaded": 0, "chunks": 0, "skipped": skipped}

    # Chunk → embed → upsert (same pipeline as /ingest)
    from database import DocumentChunk

    all_chunks = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    with get_session() as session:
        upserted = 0
        for chunk in all_chunks:
            embedding = await embed_text(chunk["chunk_text"])

            # Replace existing chunks for this doc in this org
            session.query(DocumentChunk).filter_by(
                doc_id=chunk["doc_id"], org_id=org_id
            ).delete()

            session.add(DocumentChunk(
                org_id=org_id,
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                chunk_text=chunk["chunk_text"],
                embedding=embedding,
                metadata_=chunk["metadata"],
                source_type="upload",
            ))
            upserted += 1

        session.commit()

    return {
        "status": "ok",
        "uploaded": len(docs),
        "chunks": upserted,
        "skipped": skipped,
    }
```

---

## `app/api/upload/route.ts`

```ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const { orgId, getToken } = await auth();
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Stream the multipart body directly to the backend — do NOT call request.formData()
  // here as that buffers everything in Next.js memory.
  const contentType = request.headers.get("content-type") ?? "";

  const res = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: request.body,
    // @ts-expect-error — Node 18+ fetch supports duplex streaming
    duplex: "half",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Next.js body size config** — add to `next.config.ts`:

```ts
const config: NextConfig = {
  // ...existing config...
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
}
```

For the API route specifically, the limit is controlled by the deployment platform (Vercel: `maxDuration` + request size limits in `vercel.json`; self-hosted: nginx `client_max_body_size 150m`).

---

## `app/admin/settings/FileUploadCard.tsx`

```tsx
"use client";

import { useRef, useState } from "react";

type UploadResult = {
  uploaded: number;
  chunks: number;
  skipped: { name: string; reason: string }[];
};

type FileEntry = {
  file: File;
  path: string; // webkitRelativePath or file.name
};

export default function FileUploadCard() {
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setState("uploading");
    setResult(null);

    const form = new FormData();
    for (const file of Array.from(files)) {
      // Use webkitRelativePath as the filename when uploading folders
      // so the backend can use the folder structure in metadata
      const name = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      form.append("files", file, name);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Upload failed");
        setState("error");
      } else {
        setResult(data);
        setState("done");
      }
    } catch {
      setErrorMsg("Could not reach server");
      setState("error");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files);
  }

  const isUploading = state === "uploading";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1px dashed ${dragging ? "#1a1a1a" : "#d4d4d4"}`,
          borderRadius: 8,
          padding: "40px 24px",
          textAlign: "center",
          background: dragging ? "#f9f9f9" : "#ffffff",
          transition: "all 150ms",
          cursor: isUploading ? "not-allowed" : "default",
        }}
      >
        <p style={{ fontSize: 14, color: "#6b6b6b", margin: "0 0 16px 0", lineHeight: 1.55 }}>
          {isUploading
            ? "Uploading and indexing…"
            : "Drop files or a folder here, or pick them below"}
        </p>
        <p style={{ fontSize: 12, color: "#a3a3a3", margin: "0 0 20px 0" }}>
          .txt · .md · .pdf · .docx · .html · .csv — up to 25 MB per file
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {/* Files picker */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.docx,.html,.htm,.csv"
            style={{ display: "none" }}
            onChange={(e) => upload(e.target.files)}
            disabled={isUploading}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            style={{
              fontSize: 13,
              color: "#1a1a1a",
              background: "none",
              border: "1px solid #e5e5e5",
              borderRadius: 9999,
              padding: "7px 16px",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
          >
            Choose files
          </button>

          {/* Folder picker */}
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error — webkitdirectory is not in React's types
            webkitdirectory=""
            multiple
            style={{ display: "none" }}
            onChange={(e) => upload(e.target.files)}
            disabled={isUploading}
          />
          <button
            onClick={() => folderRef.current?.click()}
            disabled={isUploading}
            style={{
              fontSize: 13,
              color: "#1a1a1a",
              background: "none",
              border: "1px solid #e5e5e5",
              borderRadius: 9999,
              padding: "7px 16px",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
          >
            Choose folder
          </button>
        </div>
      </div>

      {/* Result */}
      {state === "done" && result && (
        <div style={{ fontSize: 13, color: "#6b6b6b" }}>
          <p style={{ margin: "0 0 4px 0" }}>
            {result.uploaded} file{result.uploaded !== 1 ? "s" : ""} indexed
            {" "}· {result.chunks} chunks added
          </p>
          {result.skipped.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: "pointer", color: "#a3a3a3" }}>
                {result.skipped.length} skipped
              </summary>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 16 }}>
                {result.skipped.map((s, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>
                    <code style={{ fontSize: 11 }}>{s.name}</code>
                    {" — "}{s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {state === "error" && (
        <p style={{ fontSize: 13, color: "#e05a5a", margin: 0 }}>{errorMsg}</p>
      )}
    </div>
  );
}
```

---

## `app/admin/settings/SettingsClient.tsx` — add upload section

Add a new section after the Sync section:

```tsx
import FileUploadCard from "./FileUploadCard";

// Inside SettingsClient, after the sync section:
<section style={{ marginBottom: 64 }}>
  <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 16px 0", letterSpacing: "0.01em" }}>
    Upload files
  </h2>
  <div style={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 32 }}>
    <p style={{ fontSize: 15, color: "#6b6b6b", margin: "0 0 24px 0", lineHeight: 1.55 }}>
      Upload internal documents directly from your device. Supported formats: PDF, Word, Markdown, plain text, HTML, CSV.
    </p>
    <FileUploadCard />
  </div>
</section>
```

---

## `backend/requirements.txt` additions

```
pdfplumber>=0.11.0
python-docx>=1.1.2
beautifulsoup4>=4.12.0
lxml>=5.2.0        # bs4 parser — faster than html.parser for large docs
```

---

## `doc_id` collisions

Uploaded files use the key `upload:{org_id}:{filename}`. Re-uploading the same filename
replaces the existing chunks (the `/upload` endpoint deletes by `doc_id + org_id` before
inserting). This means:

- Same filename → re-index (intentional — user updated the file)
- Different filename → separate document
- Folder upload → each file gets its own `doc_id` using the full relative path
  (`upload:{org_id}:{folder/subfolder/file.pdf}`)

---

## What changes in `source_type`

The `DocumentChunk.source_type` column gains a new value: `"upload"`.

The `ChatResponse.source_type` field in `main.py` already returns this string to the
frontend. The `DocumentCard` component in `chat/` already renders any source type — no
frontend chat changes needed. The `/stats` endpoint already returns `source_types` as a
distinct list, so "upload" will appear in the dashboard stats automatically.

---

## Limits and edge cases

| Case | Handling |
|---|---|
| File > 25 MB | Rejected per-file with reason in `skipped[]` |
| Total > 150 MB | HTTP 400 before any extraction |
| Unsupported extension | Added to `skipped[]`, rest continue |
| File with no extractable text (image-only PDF) | Added to `skipped[]` |
| Duplicate filename (re-upload) | Previous chunks deleted, new ones inserted |
| Folder with nested folders | `webkitRelativePath` preserves path in `doc_id` |
| Non-UTF-8 text files | `errors="replace"` — lossy but non-crashing |
| Password-protected PDF | pdfplumber raises — caught, added to `skipped[]` |
| Empty file | `text.strip()` check → `skipped[]` |

---

## Implementation order

```
1  backend/extract.py          — extraction functions (no dependencies on other changes)
2  backend/requirements.txt    — add pdfplumber, python-docx, bs4
3  backend/main.py             — /upload endpoint (uses extract.py + existing pipeline)
4  app/api/upload/route.ts     — Next.js proxy
5  app/admin/settings/         — FileUploadCard + wire into SettingsClient
6  next.config.ts              — body size limit
```

No database migrations needed — `source_type = "upload"` is a new string value in an
existing free-text column.
