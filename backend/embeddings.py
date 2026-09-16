"""
Shared embedding layer (single source of truth for ingest and retrieval).

Provides batched, retried, rate-limit-aware embedding.

Default: Google Gemini `gemini-embedding-2` with RETRIEVAL_DOCUMENT /
RETRIEVAL_QUERY task types.

Local / quota fallback: OpenAI-compatible `/v1/embeddings` (LM Studio, Ollama,
vLLM). Nomic v1.5 is 768-d so it fits the existing pgvector column — but it is
a *different* vector space than Gemini. Use the same provider for ingest and
query; do not mix Gemini-embedded chunks with local-embedded queries.
"""
import asyncio
import os

import httpx
from google import genai
from google.genai import types

from gemini_retry import call_with_retry

EMBED_PROVIDER = os.getenv("EMBED_PROVIDER", "gemini").strip().lower()
EMBED_MODEL = os.getenv(
    "EMBED_MODEL",
    "text-embedding-nomic-embed-text-v1.5"
    if EMBED_PROVIDER in ("openai", "lmstudio", "local")
    else "gemini-embedding-2",
)
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "32" if EMBED_PROVIDER != "gemini" else "100"))
EMBED_BASE_URL = (os.getenv("EMBED_BASE_URL") or "http://host.docker.internal:1234/v1").rstrip("/")
EMBED_API_KEY = os.getenv("EMBED_API_KEY", "lm-studio")
# Nomic-embed-text-v1.5 quality prefixes. Empty string disables.
_DOC_PREFIX = os.getenv("EMBED_DOCUMENT_PREFIX", "search_document: ")
_QUERY_PREFIX = os.getenv("EMBED_QUERY_PREFIX", "search_query: ")
_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "5"))
_MAX_BACKOFF = 30.0

_gemini_client = None


class EmbedHTTPError(Exception):
    """httpx status mapped so gemini_retry.is_retryable sees .code."""

    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code


def _gemini() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _gemini_client


def _prefix(texts: list[str], task_type: str) -> list[str]:
    if EMBED_PROVIDER == "gemini":
        return texts
    prefix = _QUERY_PREFIX if task_type == "RETRIEVAL_QUERY" else _DOC_PREFIX
    if not prefix:
        return texts
    return [prefix + t for t in texts]


def _embed_openai(texts: list[str], task_type: str) -> list[list[float]]:
    payload = {
        "model": EMBED_MODEL,
        "input": _prefix(texts, task_type),
    }
    headers = {
        "Authorization": f"Bearer {EMBED_API_KEY}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=120.0) as client:
        res = client.post(f"{EMBED_BASE_URL}/embeddings", headers=headers, json=payload)
    if res.status_code >= 400:
        raise EmbedHTTPError(res.status_code, res.text[:500])
    rows = res.json().get("data") or []
    rows.sort(key=lambda row: int(row.get("index", 0)))
    vecs = [row["embedding"] for row in rows]
    if len(vecs) != len(texts):
        raise EmbedHTTPError(502, f"embed count mismatch: got {len(vecs)} want {len(texts)}")
    return vecs


def _embed_gemini(texts: list[str], task_type: str) -> list[list[float]]:
    config = types.EmbedContentConfig(
        output_dimensionality=EMBED_DIM,
        task_type=task_type,
    )
    resp = _gemini().models.embed_content(
        model=EMBED_MODEL,
        contents=texts,
        config=config,
    )
    return [e.values for e in resp.embeddings]


def _embed_call(texts: list[str], task_type: str) -> list[list[float]]:
    """One API call for a batch, with exponential backoff on transient failures."""

    def do_call() -> list[list[float]]:
        if EMBED_PROVIDER in ("openai", "lmstudio", "local"):
            return _embed_openai(texts, task_type)
        return _embed_gemini(texts, task_type)

    return call_with_retry(do_call, max_retries=_MAX_RETRIES, max_backoff=_MAX_BACKOFF)


def _embed_batch_sync(texts: list[str], task_type: str) -> list[list[float]]:
    """Embed a batch; fall back to one-at-a-time if a batch call is rejected."""
    try:
        vecs = _embed_call(texts, task_type)
        if len(vecs) == len(texts):
            return vecs
    except Exception:
        if len(texts) == 1:
            raise
    out: list[list[float]] = []
    for t in texts:
        out.extend(_embed_call([t], task_type))
    return out


async def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed stored chunks (RETRIEVAL_DOCUMENT), batched. Order preserved."""
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i : i + EMBED_BATCH_SIZE]
        out.extend(await asyncio.to_thread(_embed_batch_sync, batch, "RETRIEVAL_DOCUMENT"))
    return out


async def embed_query(text_input: str) -> list[float]:
    """Embed a single search query (RETRIEVAL_QUERY)."""
    res = await asyncio.to_thread(_embed_batch_sync, [text_input], "RETRIEVAL_QUERY")
    return res[0]
