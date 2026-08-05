"""
LLM answer synthesis.

Retrieval finds the best-matching document chunk; this turns that chunk into a
short, plain-language answer to the employee's question. The model is grounded
strictly on the chunk — no outside knowledge, no invention — so the answer stays
traceable to the cited source card the UI shows alongside it.

Falls back to returning the raw chunk if generation fails (bad model name,
quota, network) so chat never hard-fails on the synthesis step.
"""
import asyncio
import os

from google import genai
from google.genai import types

GEN_MODEL = os.getenv("GEN_MODEL", "gemini-2.5-flash")

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_SYSTEM = (
    "You are Athena, an internal knowledge assistant for a company. "
    "Answer the employee's question in plain, everyday language using ONLY the "
    "document excerpt provided. Be concise — 1 to 3 short sentences, or a few "
    "bullet points if the answer is a list. Translate legal, technical, or "
    "corporate jargon into simple terms a normal person understands. "
    "Do not add information that is not in the excerpt, and do not quote code or "
    "reference numbers unless the user asked for them. If the excerpt does not "
    "actually answer the question, say so plainly in one sentence."
)


def _build_config() -> types.GenerateContentConfig:
    kwargs = dict(
        system_instruction=_SYSTEM,
        temperature=0.2,
        max_output_tokens=800,
    )
    # gemini-2.5-* are thinking models: reasoning tokens count against
    # max_output_tokens, so the visible answer gets truncated mid-sentence.
    # A short grounded answer needs no thinking — turn it off (also faster).
    # Guarded so older SDKs without ThinkingConfig still work.
    try:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except Exception:  # noqa: BLE001
        pass
    return types.GenerateContentConfig(**kwargs)


def _history_block(history: list[dict] | None, limit: int = 6) -> str:
    """Render the last `limit` turns as a compact transcript for prompting."""
    if not history:
        return ""
    recent = history[-limit:]
    lines = []
    for turn in recent:
        who = "User" if turn.get("role") == "user" else "Athena"
        lines.append(f"{who}: {turn.get('content', '').strip()}")
    return "\n".join(lines)


def _generate_sync(query: str, chunk_text: str, history: list[dict] | None) -> str:
    convo = _history_block(history)
    convo_section = f"Conversation so far:\n{convo}\n\n" if convo else ""
    prompt = (
        f"{convo_section}"
        f"Current question: {query}\n\n"
        f'Document excerpt:\n"""\n{chunk_text}\n"""\n\n'
        "Answer:"
    )
    resp = _client.models.generate_content(
        model=GEN_MODEL,
        contents=prompt,
        config=_build_config(),
    )
    return (resp.text or "").strip()


async def synthesize_answer(
    query: str, chunk_text: str, history: list[dict] | None = None
) -> str:
    """Plain-language answer grounded on chunk_text, aware of prior turns. Never
    raises — on failure it returns the raw chunk so the user still gets material."""
    try:
        answer = await asyncio.to_thread(_generate_sync, query, chunk_text, history)
        return answer or chunk_text
    except Exception as exc:  # noqa: BLE001 - degrade gracefully, never break chat
        print(f"Answer synthesis failed, returning raw chunk: {exc}")
        return chunk_text


_CONDENSE_SYSTEM = (
    "You rewrite a follow-up question into a standalone search query. Given the "
    "conversation so far and a follow-up, output a single self-contained question "
    "that includes the subject the follow-up refers to, so it can be searched "
    "without the conversation. Output ONLY the rewritten question, nothing else. "
    "If the follow-up is already self-contained, return it unchanged."
)


def _condense_sync(query: str, history: list[dict]) -> str:
    convo = _history_block(history)
    prompt = f"Conversation so far:\n{convo}\n\nFollow-up: {query}\n\nStandalone question:"
    kwargs = dict(
        system_instruction=_CONDENSE_SYSTEM,
        temperature=0.0,
        max_output_tokens=120,
    )
    try:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except Exception:  # noqa: BLE001
        pass
    resp = _client.models.generate_content(
        model=GEN_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(**kwargs),
    )
    return (resp.text or "").strip()


async def condense_question(query: str, history: list[dict] | None) -> str:
    """Turn a context-dependent follow-up ("how much notice?") into a standalone
    query ("how much notice is required for leave?") for retrieval. Falls back to
    the raw query on any failure or when there is no history."""
    if not history:
        return query
    try:
        rewritten = await asyncio.to_thread(_condense_sync, query, history)
        return rewritten or query
    except Exception as exc:  # noqa: BLE001
        print(f"Follow-up condense failed, using raw query: {exc}")
        return query
