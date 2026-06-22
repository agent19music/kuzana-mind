import asyncio
import json
import os
from pathlib import Path

from google import genai
from google.genai import types
from sqlalchemy import text

from database import get_session

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
STAFF_DIRECTORY_PATH = Path(__file__).parent / "staff_directory.json"

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _embed_sync(text_input: str) -> list[float]:
    response = _client.models.embed_content(
        model="gemini-embedding-2",
        contents=text_input,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values


async def get_embedding(text_input: str) -> list[float]:
    return await asyncio.to_thread(_embed_sync, text_input)


async def similarity_search(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    sql = text("""
        SELECT
            id,
            doc_id,
            title,
            chunk_text,
            metadata,
            1 - (embedding <=> cast(:embedding AS vector)) AS similarity_score
        FROM documents
        ORDER BY embedding <=> cast(:embedding AS vector)
        LIMIT :top_k
    """)

    with get_session() as session:
        rows = session.execute(sql, {"embedding": embedding_str, "top_k": top_k}).mappings().all()

    return [dict(row) for row in rows]


def staff_fallback(query: str) -> dict | None:
    with open(STAFF_DIRECTORY_PATH) as f:
        staff = json.load(f)

    query_lower = query.lower()
    scored = []

    for member in staff:
        topic_hits = sum(1 for topic in member["topics"] if topic in query_lower)
        if topic_hits > 0:
            scored.append((topic_hits, member))

    if not scored:
        return staff[0] if staff else None

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


async def answer_query(query: str) -> dict:
    query_embedding = await get_embedding(query)
    results = await similarity_search(query_embedding)

    # ----------------------------------------------------------------
    # Core branch: document hit vs. staff fallback
    # ----------------------------------------------------------------
    if results and results[0]["similarity_score"] >= SIMILARITY_THRESHOLD:
        best = results[0]
        return {
            "answer": best["chunk_text"],
            "type": "document",
            "source_title": best["title"],
            "source_doc_id": best["doc_id"],
            "similarity_score": round(best["similarity_score"], 4),
        }

    # Low confidence — never hallucinate, route to staff directory
    staff = staff_fallback(query)

    if staff:
        title_line = f" ({staff['title']}, {staff['department']})" if "title" in staff else ""
        return {
            "answer": (
                f"I don't have exact documentation on this, but {staff['name']}{title_line} "
                f"handles {staff['domain']}. You should ask them because {staff['reason']}"
            ),
            "type": "staff_fallback",
            "staff_name": staff["name"],
            "staff_email": staff["email"],
            "staff_domain": staff["domain"],
            "staff_title": staff.get("title"),
            "staff_department": staff.get("department"),
            "similarity_score": results[0]["similarity_score"] if results else None,
        }

    return {
        "answer": "I don't have documentation on this topic and couldn't identify a relevant team member. Please reach out to your manager.",
        "type": "staff_fallback",
        "similarity_score": results[0]["similarity_score"] if results else None,
    }
