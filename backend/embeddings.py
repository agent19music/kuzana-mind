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
import time

from google import genai
from google.genai import types

try:
    from google.genai import errors as genai_errors
    _API_ERROR: type[Exception] = genai_errors.APIError
except Exception:  # pragma: no cover - SDK shape fallback
    _API_ERROR = Exception

EMBED_MODEL = os.getenv("EMBED_MODEL", "gemini-embedding-2")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
# Texts per API request. Set to 1 to disable batching if the model rejects it.
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "100"))
_MAX_RETRIES = int(os.getenv("EMBED_MAX_RETRIES", "5"))
_MAX_BACKOFF = 30.0

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _is_retryable(exc: Exception) -> bool:
    """Retry rate limits (429) and server errors (5xx); also naked network errors."""
    code = getattr(exc, "code", None)
    if code is None:
        return not isinstance(exc, _API_ERROR)  # network/timeout, not a clean API error
    try:
        code = int(code)
    except (TypeError, ValueError):
        return False
    return code == 429 or 500 <= code < 600


def _embed_call(texts: list[str], task_type: str) -> list[list[float]]:
    """One API call for a batch, with exponential backoff on transient failures."""
    config = types.EmbedContentConfig(
        output_dimensionality=EMBED_DIM,
        task_type=task_type,
    )
    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            resp = _client.models.embed_content(
                model=EMBED_MODEL,
                contents=texts,
                config=config,
            )
            return [e.values for e in resp.embeddings]
        except Exception as exc:  # noqa: BLE001 - classify then decide
            last_exc = exc
            if attempt == _MAX_RETRIES - 1 or not _is_retryable(exc):
                raise
            time.sleep(delay)
            delay = min(delay * 2, _MAX_BACKOFF)
    # Unreachable, but keeps type-checkers happy.
    raise RuntimeError(f"Embedding failed: {last_exc}")


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
