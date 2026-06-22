import asyncio
import json
import os
import re
from pathlib import Path

import httpx
from google import genai
from google.genai import types
from langchain_text_splitters import MarkdownHeaderTextSplitter

from database import DocumentChunk, get_session

USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"
SAMPLE_DOCS_PATH = Path(__file__).parent / "sample_docs"

# Comma-separated Google Doc IDs or full URLs, e.g.:
# PUBLIC_DOC_IDS=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms,https://docs.google.com/document/d/abc123/edit
_PUBLIC_DOC_IDS_RAW = os.getenv("PUBLIC_DOC_IDS", "")


def _parse_doc_id(id_or_url: str) -> str:
    """Extract doc ID from a full Google Docs URL or return the ID as-is."""
    match = re.search(r"/document/d/([a-zA-Z0-9_-]+)", id_or_url)
    return match.group(1) if match else id_or_url.strip()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

HEADERS_TO_SPLIT_ON = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]

splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=HEADERS_TO_SPLIT_ON,
    strip_headers=False,
)


# ---------------------------------------------------------------------------
# Source loaders
# ---------------------------------------------------------------------------

def load_from_local(path: Path) -> list[dict]:
    docs = []
    for md_file in path.glob("*.md"):
        content = md_file.read_text(encoding="utf-8")
        docs.append({
            "doc_id": md_file.stem,
            "title": md_file.stem.replace("_", " ").title(),
            "content": content,
        })
    return docs


def load_from_public_gdocs(doc_ids_raw: str) -> list[dict]:
    """
    Fetch publicly shared Google Docs by ID or URL — no auth required.
    Docs must be shared as 'Anyone with the link can view'.
    Fetches plain-text export and treats it as markdown for chunking.
    """
    ids = [_parse_doc_id(entry) for entry in doc_ids_raw.split(",") if entry.strip()]
    docs = []

    with httpx.Client(follow_redirects=True, timeout=30) as client:
        for doc_id in ids:
            url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
            resp = client.get(url)
            resp.raise_for_status()
            content = resp.text

            # Use first non-empty line as title fallback
            first_line = next((ln.lstrip("# ").strip() for ln in content.splitlines() if ln.strip()), doc_id)

            docs.append({
                "doc_id": doc_id,
                "title": first_line,
                "content": content,
            })
            print(f"  Fetched public doc '{first_line}' ({doc_id})")

    return docs


def load_from_google_drive(folder_id: str, service_account_json: str) -> list[dict]:
    """
    Production path — activate by setting USE_MOCK=false + env vars.
    """
    from google.oauth2 import service_account as sa
    from googleapiclient.discovery import build

    creds_info = json.loads(service_account_json)
    creds = sa.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    service = build("drive", "v3", credentials=creds)

    results = service.files().list(
        q=(
            f"'{folder_id}' in parents "
            "and mimeType='application/vnd.google-apps.document' "
            "and trashed=false"
        ),
        fields="files(id, name, modifiedTime)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
    ).execute()

    docs = []
    for file in results.get("files", []):
        content = service.files().export(
            fileId=file["id"],
            mimeType="text/plain",
        ).execute()
        docs.append({
            "doc_id": file["id"],
            "title": file["name"],
            "content": content.decode("utf-8"),
        })

    return docs


def load_documents() -> list[dict]:
    # Priority 1: public Google Docs (no auth — works for demo and prod)
    if _PUBLIC_DOC_IDS_RAW.strip():
        print(f"PUBLIC_DOC_IDS set — fetching public Google Docs")
        docs = load_from_public_gdocs(_PUBLIC_DOC_IDS_RAW)
        if USE_MOCK:
            # Augment with local sample docs when both are set
            print("USE_MOCK=true also set — augmenting with sample_docs/")
            docs += load_from_local(SAMPLE_DOCS_PATH)
        return docs

    # Priority 2: local mock files
    if USE_MOCK:
        print("USE_MOCK=true — loading from sample_docs/")
        return load_from_local(SAMPLE_DOCS_PATH)

    # Priority 3: authenticated Google Drive (service account)
    folder_id = os.getenv("DRIVE_FOLDER_ID")
    service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")

    if not folder_id or not service_account_json:
        raise EnvironmentError(
            "USE_MOCK=false but DRIVE_FOLDER_ID or GOOGLE_SERVICE_ACCOUNT_JSON is not set."
        )

    print(f"USE_MOCK=false — loading from Google Drive folder {folder_id}")
    return load_from_google_drive(folder_id, service_account_json)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_document(doc: dict) -> list[dict]:
    chunks = splitter.split_text(doc["content"])
    return [
        {
            "doc_id": doc["doc_id"],
            "title": doc["title"],
            "chunk_text": chunk.page_content,
            "metadata": chunk.metadata,
        }
        for chunk in chunks
    ]


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def _embed_sync(text_input: str) -> list[float]:
    response = _client.models.embed_content(
        model="gemini-embedding-2",
        contents=text_input,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values


async def embed_text(text_input: str) -> list[float]:
    return await asyncio.to_thread(_embed_sync, text_input)


# ---------------------------------------------------------------------------
# Main ingestion entry point
# ---------------------------------------------------------------------------

async def run_ingestion() -> dict:
    docs = load_documents()
    print(f"Loaded {len(docs)} documents.")

    all_chunks = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    print(f"Produced {len(all_chunks)} chunks. Embedding and upserting...")

    with get_session() as session:
        upserted = 0
        for chunk in all_chunks:
            embedding = await embed_text(chunk["chunk_text"])

            session.query(DocumentChunk).filter_by(doc_id=chunk["doc_id"]).delete()

            record = DocumentChunk(
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                chunk_text=chunk["chunk_text"],
                embedding=embedding,
                metadata_=chunk["metadata"],
            )
            session.add(record)
            upserted += 1

        session.commit()

    print(f"Ingestion complete. {upserted} chunks stored.")
    return {"status": "ok", "documents": len(docs), "chunks": upserted}
