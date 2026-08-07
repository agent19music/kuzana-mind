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
import json
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


# ---------------------------------------------------------------------------
# Form theme labelling + sentiment
# ---------------------------------------------------------------------------

_THEME_SYSTEM = (
    "You name recurring themes in survey free-text answers. Given a question and "
    "a sample of answers that were grouped together by meaning, reply with JSON "
    'only: {"label": "...", "summary": "..."}. The label is a short noun phrase '
    "naming what these answers have in common — 2 to 5 words, sentence case, no "
    "trailing punctuation, specific rather than generic (\"flaky integration "
    "tests\" not \"testing issues\"). The summary is one plain sentence describing "
    "what respondents said. Use only what is in the answers; do not invent detail "
    "and do not state counts or proportions."
)

_SENTIMENT_SYSTEM = (
    "You classify the sentiment of survey free-text answers. For each numbered "
    "answer, decide whether the respondent's tone toward the thing they are "
    "describing is positive, negative, or neutral. Neutral covers factual or "
    "purely descriptive answers with no evaluative charge. Reply with JSON only: "
    'a list like [{"i": 1, "s": "negative"}, {"i": 2, "s": "neutral"}] '
    "containing exactly one entry per numbered answer, using only those three "
    "values."
)


def _json_only_config(system: str, max_tokens: int) -> types.GenerateContentConfig:
    kwargs = dict(
        system_instruction=system,
        temperature=0.0,
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )
    try:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except Exception:  # noqa: BLE001
        pass
    return types.GenerateContentConfig(**kwargs)


def _parse_json(raw: str):
    """Tolerate a fenced or prose-wrapped response even with a JSON mime type."""
    text_value = (raw or "").strip()
    if text_value.startswith("```"):
        text_value = text_value.strip("`")
        text_value = text_value.split("\n", 1)[-1] if "\n" in text_value else text_value
    start = min((i for i in (text_value.find("{"), text_value.find("[")) if i != -1), default=-1)
    if start == -1:
        raise ValueError("no JSON in response")
    end = max(text_value.rfind("}"), text_value.rfind("]"))
    return json.loads(text_value[start:end + 1])


def _label_theme_sync(question: str, samples: list[str]) -> dict:
    listed = "\n".join(f"- {s}" for s in samples)
    prompt = f"Question: {question}\n\nAnswers grouped together:\n{listed}\n\nJSON:"
    resp = _client.models.generate_content(
        model=GEN_MODEL,
        contents=prompt,
        config=_json_only_config(_THEME_SYSTEM, 300),
    )
    data = _parse_json(resp.text)
    return {
        "label": str(data.get("label", "")).strip()[:120],
        "summary": str(data.get("summary", "")).strip()[:600],
    }


async def label_theme(question: str, samples: list[str]) -> dict:
    """Name a cluster of answers. Falls back to a truncated representative answer
    so an unlabelled theme still reads as something rather than blank."""
    if not samples:
        return {"label": "", "summary": ""}
    try:
        result = await asyncio.to_thread(_label_theme_sync, question, samples)
        if result["label"]:
            return result
    except Exception as exc:  # noqa: BLE001
        print(f"  Theme labelling failed, using fallback: {exc}")
    fallback = samples[0].strip().replace("\n", " ")
    return {"label": fallback[:60] or "Unlabelled", "summary": ""}


def _sentiment_sync(texts: list[str]) -> list[str]:
    listed = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    resp = _client.models.generate_content(
        model=GEN_MODEL,
        contents=f"Answers:\n{listed}\n\nJSON:",
        config=_json_only_config(_SENTIMENT_SYSTEM, 40 * len(texts) + 200),
    )
    data = _parse_json(resp.text)

    allowed = {"positive", "negative", "neutral"}
    out = ["neutral"] * len(texts)
    for item in data if isinstance(data, list) else []:
        try:
            idx = int(item.get("i", 0)) - 1
        except (TypeError, ValueError):
            continue
        value = str(item.get("s", "")).lower().strip()
        if 0 <= idx < len(out) and value in allowed:
            out[idx] = value
    return out


async def classify_sentiment(texts: list[str]) -> list[str]:
    """Sentiment per answer, batched. Returns one label per input, defaulting to
    "neutral" — a failed batch must not drop answers or shift the alignment
    between inputs and results."""
    if not texts:
        return []
    try:
        return await asyncio.to_thread(_sentiment_sync, texts)
    except Exception as exc:  # noqa: BLE001
        print(f"  Sentiment classification failed, defaulting to neutral: {exc}")
        return ["neutral"] * len(texts)
