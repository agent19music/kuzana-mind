import os

from sqlalchemy import text

from database import session_for_org
from embeddings import embed_query
from generation import condense_question, synthesize_answer

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))


def _provider_doc_id(doc_id: str) -> str:
    """Reverse namespaced_doc_id ("{source}:{org}:{provider_id}") back to the raw
    provider id, so the UI source link (docs.google.com/document/d/<id>) resolves.
    Provider ids never contain ':', so the part after the second colon is safe."""
    return doc_id.split(":", 2)[-1]


async def similarity_search(
    query_embedding: list[float],
    org_id: str,
    top_k: int = 5,
) -> list[dict]:
    # org_id is mandatory: an unscoped vector search would read across every
    # tenant. There is no fallback branch by design.
    if not org_id:
        raise ValueError("similarity_search requires an org_id")

    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    # The explicit WHERE is belt-and-suspenders; RLS on the org-scoped session
    # already restricts rows to this tenant even without it.
    sql = text("""
        SELECT
            id, doc_id, title, chunk_text, metadata, source_type,
            1 - (embedding <=> cast(:embedding AS vector)) AS similarity_score
        FROM documents
        WHERE org_id = :org_id
        ORDER BY embedding <=> cast(:embedding AS vector)
        LIMIT :top_k
    """)
    params = {"embedding": embedding_str, "top_k": top_k, "org_id": org_id}

    with session_for_org(org_id) as session:
        rows = session.execute(sql, params).mappings().all()

    return [dict(row) for row in rows]


async def answer_query(
    query: str, org_id: str, history: list[dict] | None = None
) -> dict:
    if not org_id:
        raise ValueError("answer_query requires an org_id")
    # Multi-turn: rewrite a context-dependent follow-up into a standalone query
    # so retrieval finds the right chunk ("how much notice?" → "...for leave?").
    search_query = await condense_question(query, history)
    query_embedding = await embed_query(search_query)
    results = await similarity_search(query_embedding, org_id=org_id)

    if results and results[0]["similarity_score"] >= SIMILARITY_THRESHOLD:
        best = results[0]
        # Synthesise a plain-language answer from the chunk instead of returning
        # the raw (often legalese) text. The source card still cites the chunk.
        answer = await synthesize_answer(query, best["chunk_text"], history)
        return {
            "answer": answer,
            "type": "document",
            "source_title": best["title"],
            "source_doc_id": _provider_doc_id(best["doc_id"]),
            "source_type": best.get("source_type", "mock"),
            "similarity_score": round(best["similarity_score"], 4),
        }

    # Low confidence — never hallucinate a document answer, and never invent a
    # contact either. There is no per-org staff directory yet, so the only
    # honest answer here is "no match" — see docs/planning/DEV-PATH.md.
    return {
        "answer": "I don't have documentation on this topic. Try rephrasing, or check with your team directly.",
        "type": "staff_fallback",
        "similarity_score": results[0]["similarity_score"] if results else None,
    }
