"""
Shared embedding layer (single source of truth for ingest and retrieval).

Provides batched, retried, rate-limit-aware embedding with the correct Gemini
task types — RETRIEVAL_DOCUMENT for stored chunks, RETRIEVAL_QUERY for queries
(asymmetric embedding materially improves retrieval quality).

All calls are sync under the hood and exposed as async wrappers via
asyncio.to_thread so they don't block the event loop.
"""
import asyncio
import os

from google import genai
from google.genai import types

from gemini_retry import call_with_retry

EMBED_MODEL = os.getenv("EMBED_MODEL", "gemini-embedding-2")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
# Texts per API request. Set to 1 to disable batching if the model rejects it.
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "100"))
_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "5"))
_MAX_BACKOFF = 30.0

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _embed_call(texts: list[str], task_type: str) -> list[list[float]]:
    """One API call for a batch, with exponential backoff on transient failures."""
    config = types.EmbedContentConfig(
        output_dimensionality=EMBED_DIM,
        task_type=task_type,
    )

    def do_call() -> list[list[float]]:
        resp = _client.models.embed_content(
            model=EMBED_MODEL,
            contents=texts,
            config=config,
        )
        return [e.values for e in resp.embeddings]

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
        # Non-retryable batch failure (e.g. model doesn't accept multi-content) —
        # degrade to sequential rather than losing the whole run.
    out: list[list[float]] = []
    for t in texts:
        out.extend(_embed_call([t], task_type))
    return out


async def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed stored chunks (RETRIEVAL_DOCUMENT), batched. Order preserved."""
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i:i + EMBED_BATCH_SIZE]
        out.extend(await asyncio.to_thread(_embed_batch_sync, batch, "RETRIEVAL_DOCUMENT"))
    return out


async def embed_query(text_input: str) -> list[float]:
    """Embed a single search query (RETRIEVAL_QUERY)."""
    res = await asyncio.to_thread(_embed_batch_sync, [text_input], "RETRIEVAL_QUERY")
    return res[0]
