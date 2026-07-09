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

USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"
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
            "source_type": "mock",
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
                "source_type": "google_docs",
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
            "source_type": "google_docs",
        })

    return docs


# ---------------------------------------------------------------------------
# Notion loader
# ---------------------------------------------------------------------------

_NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
_NOTION_ROOT_PAGE_ID = os.getenv("NOTION_ROOT_PAGE_ID", "")


def _notion_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }


def _notion_blocks_to_markdown(blocks: list[dict]) -> str:
    """Convert Notion block objects to markdown text."""
    lines: list[str] = []
    for block in blocks:
        btype = block.get("type", "")
        data = block.get(btype, {})
        rich_texts = data.get("rich_text", [])
        text = "".join(rt.get("plain_text", "") for rt in rich_texts)

        if btype == "heading_1":
            lines.append(f"# {text}")
        elif btype == "heading_2":
            lines.append(f"## {text}")
        elif btype == "heading_3":
            lines.append(f"### {text}")
        elif btype == "paragraph":
            lines.append(text)
        elif btype == "bulleted_list_item":
            lines.append(f"- {text}")
        elif btype == "numbered_list_item":
            lines.append(f"1. {text}")
        elif btype == "to_do":
            checked = data.get("checked", False)
            marker = "x" if checked else " "
            lines.append(f"- [{marker}] {text}")
        elif btype == "toggle":
            lines.append(f"**{text}**")
        elif btype == "code":
            lang = data.get("language", "")
            lines.append(f"```{lang}\n{text}\n```")
        elif btype == "quote":
            lines.append(f"> {text}")
        elif btype == "callout":
            lines.append(f"> {text}")
        elif btype == "divider":
            lines.append("---")
        elif text:
            lines.append(text)

    return "\n\n".join(lines)


def _notion_get_page_title(page: dict) -> str:
    """Extract the title from a Notion page object."""
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            title_parts = prop.get("title", [])
            return "".join(t.get("plain_text", "") for t in title_parts)
    return page.get("id", "Untitled")


def load_from_notion(api_key: str, root_page_id: str) -> list[dict]:
    """
    Fetch pages from Notion under a root page and convert to docs.
    The root page's children are treated as individual documents.
    """
    headers = _notion_headers(api_key)
    docs = []

    with httpx.Client(timeout=30) as client:
        # List child blocks of the root page to find sub-pages
        child_pages = []
        cursor = None
        while True:
            params = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor
            resp = client.get(
                f"https://api.notion.com/v1/blocks/{root_page_id}/children",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            for block in data.get("results", []):
                if block.get("type") == "child_page":
                    child_pages.append(block["id"])
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")

        # If no child pages, treat the root page itself as the document
        page_ids = child_pages if child_pages else [root_page_id]

        for page_id in page_ids:
            # Get page metadata for title
            page_resp = client.get(
                f"https://api.notion.com/v1/pages/{page_id}",
                headers=headers,
            )
            page_resp.raise_for_status()
            page_data = page_resp.json()
            title = _notion_get_page_title(page_data)

            # Fetch all blocks (content) for this page
            all_blocks = []
            cursor = None
            while True:
                params = {"page_size": 100}
                if cursor:
                    params["start_cursor"] = cursor
                blocks_resp = client.get(
                    f"https://api.notion.com/v1/blocks/{page_id}/children",
                    headers=headers,
                    params=params,
                )
                blocks_resp.raise_for_status()
                blocks_data = blocks_resp.json()
                all_blocks.extend(blocks_data.get("results", []))
                if not blocks_data.get("has_more"):
                    break
                cursor = blocks_data.get("next_cursor")

            content = _notion_blocks_to_markdown(all_blocks)

            docs.append({
                "doc_id": page_id,
                "title": title,
                "content": content,
                "source_type": "notion",
            })
            print(f"  Fetched Notion page '{title}' ({page_id})")

    return docs


# ---------------------------------------------------------------------------
# Multi-source document loading
# ---------------------------------------------------------------------------

def load_documents(
    notion_api_key: str | None = None,
    notion_root_page_id: str | None = None,
    public_doc_ids: list[str] | None = None,
) -> list[dict]:
    """Load documents from all configured sources (additive, not exclusive).

    Per-request overrides (from onboarding form) take precedence over env vars.
    """
    docs = []

    # Source 1: Public Google Docs — per-request list takes precedence over env var
    effective_public_ids = ",".join(public_doc_ids) if public_doc_ids else _PUBLIC_DOC_IDS_RAW
    if effective_public_ids.strip():
        print("PUBLIC_DOC_IDS set — fetching public Google Docs")
        docs += load_from_public_gdocs(effective_public_ids)

    # Source 2: Notion — per-request credentials take precedence over env vars
    effective_notion_key = notion_api_key or _NOTION_API_KEY
    effective_notion_root = notion_root_page_id or _NOTION_ROOT_PAGE_ID
    if effective_notion_key and effective_notion_root:
        print(f"NOTION_API_KEY set — fetching from Notion root page {effective_notion_root}")
        docs += load_from_notion(effective_notion_key, effective_notion_root)

    # Source 3: Google Drive (service account)
    folder_id = os.getenv("DRIVE_FOLDER_ID")
    service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if folder_id and service_account_json:
        print(f"Loading from Google Drive folder {folder_id}")
        docs += load_from_google_drive(folder_id, service_account_json)

    # Source 4: Local mock files (fallback or augmentation)
    if USE_MOCK:
        print("USE_MOCK=true — augmenting with sample_docs/")
        docs += load_from_local(SAMPLE_DOCS_PATH)

    if not docs:
        raise EnvironmentError(
            "No document sources configured. Set PUBLIC_DOC_IDS, NOTION_API_KEY + "
            "NOTION_ROOT_PAGE_ID, DRIVE_FOLDER_ID + GOOGLE_SERVICE_ACCOUNT_JSON, "
            "or USE_MOCK=true."
        )

    return docs


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
            "source_type": doc.get("source_type", "mock"),
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

async def run_ingestion(
    org_id: str | None = None,
    org_name: str | None = None,
    org_logo_url: str | None = None,
    notion_api_key: str | None = None,
    notion_root_page_id: str | None = None,
    public_doc_ids: list[str] | None = None,
) -> dict:
    # Upsert org record if org_id provided
    if org_id:
        from database import Organization
        with get_session() as session:
            org = session.query(Organization).filter_by(clerk_org_id=org_id).first()
            if org:
                if org_name:
                    org.name = org_name
                if org_logo_url:
                    org.logo_url = org_logo_url
                if notion_api_key:
                    org.notion_api_key = notion_api_key
                if notion_root_page_id:
                    org.notion_root_page_id = notion_root_page_id
                if public_doc_ids is not None:
                    org.public_doc_ids = public_doc_ids
            else:
                org = Organization(
                    clerk_org_id=org_id,
                    name=org_name or "Unnamed Organisation",
                    logo_url=org_logo_url,
                    notion_api_key=notion_api_key,
                    notion_root_page_id=notion_root_page_id,
                    public_doc_ids=public_doc_ids or [],
                )
                session.add(org)
            session.commit()

    docs = load_documents(
        notion_api_key=notion_api_key,
        notion_root_page_id=notion_root_page_id,
        public_doc_ids=public_doc_ids,
    )
    print(f"Loaded {len(docs)} documents.")

    all_chunks = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    print(f"Produced {len(all_chunks)} chunks. Embedding and upserting...")

    with get_session() as session:
        upserted = 0
        for chunk in all_chunks:
            embedding = await embed_text(chunk["chunk_text"])

            # Scope deletion to this org if provided, else delete all matching doc_id rows
            q = session.query(DocumentChunk).filter_by(doc_id=chunk["doc_id"])
            if org_id:
                q = q.filter_by(org_id=org_id)
            q.delete()

            record = DocumentChunk(
                org_id=org_id,
                doc_id=chunk["doc_id"],
                title=chunk["title"],
                chunk_text=chunk["chunk_text"],
                embedding=embedding,
                metadata_=chunk["metadata"],
                source_type=chunk["source_type"],
            )
            session.add(record)
            upserted += 1

        session.commit()

    print(f"Ingestion complete. {upserted} chunks stored.")
    return {"status": "ok", "documents": len(docs), "chunks": upserted}
