"""Org-specific chat starter questions, grounded on indexed chunks.

Generated with Gemini from real excerpts (uploads first), then kept only if
pgvector retrieval would actually answer them. Cached per org until the chunk
set changes so the chat empty state can prerender without a Gemini call on
every page load.
"""
from sqlalchemy import func, text

from database import DocumentChunk, session_for_org
from embeddings import embed_query
from generation import suggest_starter_questions
from retrieval import SIMILARITY_THRESHOLD, similarity_search

_CACHE: dict[str, tuple[str, list[str]]] = {}
_MAX_QUESTIONS = 4
_EXCERPT_CHARS = 900


def _fingerprint(org_id: str) -> str:
    with session_for_org(org_id) as db:
        chunk_count = db.query(DocumentChunk).filter(DocumentChunk.org_id == org_id).count()
        last = (
            db.query(func.max(DocumentChunk.created_at))
            .filter(DocumentChunk.org_id == org_id)
            .scalar()
        )
    stamp = last.isoformat() if last else ""
    return f"{chunk_count}:{stamp}"


def _sample_excerpts(org_id: str) -> list[dict]:
    sql = text("""
        SELECT doc_id, title, source_type, left(chunk_text, :limit) AS excerpt
        FROM (
          SELECT DISTINCT ON (doc_id)
            doc_id, title, source_type, chunk_text, created_at,
            CASE WHEN source_type = 'upload' THEN 0 ELSE 1 END AS upload_rank
          FROM documents
          WHERE org_id = :org_id
          ORDER BY doc_id, created_at DESC
        ) d
        ORDER BY upload_rank ASC, created_at DESC
        LIMIT 10
    """)
    with session_for_org(org_id) as db:
        rows = db.execute(sql, {"org_id": org_id, "limit": _EXCERPT_CHARS}).mappings().all()
    return [dict(row) for row in rows]


async def _keep_answerable(org_id: str, questions: list[str]) -> list[str]:
    kept: list[str] = []
    for question in questions:
        embedding = await embed_query(question)
        results = await similarity_search(embedding, org_id=org_id, top_k=1)
        if results and results[0]["similarity_score"] >= SIMILARITY_THRESHOLD:
            kept.append(question)
        if len(kept) >= _MAX_QUESTIONS:
            break
    return kept


async def questions_for_org(org_id: str) -> list[str]:
    if not org_id:
        return []
    fp = _fingerprint(org_id)
    cached = _CACHE.get(org_id)
    if cached and cached[0] == fp:
        return cached[1]

    excerpts = _sample_excerpts(org_id)
    if not excerpts:
        _CACHE[org_id] = (fp, [])
        return []

    candidates = await suggest_starter_questions(excerpts)
    kept = await _keep_answerable(org_id, candidates) if candidates else []
    _CACHE[org_id] = (fp, kept)
    return kept
