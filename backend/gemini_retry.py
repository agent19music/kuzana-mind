"""
Shared Gemini retry/backoff classification.

Used by both embeddings.py (ingestion) and generation.py (chat) so a 429
(quota) or 5xx from Gemini gets retried the same way everywhere instead of
each call site reimplementing its own backoff loop.
"""
import time
from typing import Callable, TypeVar

try:
    from google.genai import errors as genai_errors
    _API_ERROR: type[Exception] = genai_errors.APIError
except Exception:  # pragma: no cover - SDK shape fallback
    _API_ERROR = Exception

T = TypeVar("T")


def is_retryable(exc: Exception) -> bool:
    """Retry rate limits (429) and server errors (5xx); also naked network errors."""
    code = getattr(exc, "code", None)
    if code is None:
        return not isinstance(exc, _API_ERROR)  # network/timeout, not a clean API error
    try:
        code = int(code)
    except (TypeError, ValueError):
        return False
    return code == 429 or 500 <= code < 600


def call_with_retry(
    fn: Callable[[], T],
    *,
    max_retries: int = 5,
    max_backoff: float = 30.0,
    initial_delay: float = 1.0,
) -> T:
    """Call fn() with exponential backoff on retryable errors. Re-raises the
    last exception once retries are exhausted or the error isn't retryable —
    callers decide what "give up" means (raise further vs. degrade)."""
    delay = initial_delay
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - classify then decide
            last_exc = exc
            if attempt == max_retries - 1 or not is_retryable(exc):
                raise
            time.sleep(delay)
            delay = min(delay * 2, max_backoff)
    raise RuntimeError(f"Gemini call failed: {last_exc}")  # unreachable, keeps type-checkers happy
