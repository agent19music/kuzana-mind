"""Forward Sentry error events to a Discord incoming webhook (free-plan path)."""

from __future__ import annotations

import logging
import os
import threading
from typing import Any

import httpx

log = logging.getLogger(__name__)

_WEBHOOK_PREFIXES = (
    "https://discord.com/api/webhooks/",
    "https://discordapp.com/api/webhooks/",
)


def _webhook_url() -> str | None:
    url = (os.getenv("DISCORD_WEBHOOK_URL") or "").strip()
    if not url:
        return None
    if not url.startswith(_WEBHOOK_PREFIXES):
        log.warning("DISCORD_WEBHOOK_URL is set but is not a Discord webhook URL")
        return None
    return url


def _exception_bits(event: dict[str, Any], hint: dict[str, Any] | None) -> tuple[str, str]:
    if hint:
        exc_info = hint.get("exc_info")
        if exc_info:
            etype, evalue, _tb = exc_info
            title = getattr(etype, "__name__", None) or "Error"
            return title, str(evalue) or "no message"

    values = (event.get("exception") or {}).get("values") or []
    if values:
        last = values[-1]
        title = last.get("type") or "Error"
        return title, last.get("value") or "no message"

    logentry = event.get("logentry") or {}
    msg = logentry.get("message") or event.get("message") or "unhandled error"
    return "Error", str(msg)


def _payload(event: dict[str, Any], hint: dict[str, Any] | None) -> dict[str, Any]:
    title, description = _exception_bits(event, hint)
    env = event.get("environment") or os.getenv("SENTRY_ENVIRONMENT", "development")
    request = event.get("request") or {}
    request_url = request.get("url") or "—"
    transaction = event.get("transaction") or event.get("culprit") or "—"
    event_id = event.get("event_id") or ""

    fields = [
        {"name": "environment", "value": str(env)[:256], "inline": True},
        {"name": "transaction", "value": str(transaction)[:256], "inline": True},
        {"name": "request", "value": str(request_url)[:1024], "inline": False},
    ]
    if event_id:
        fields.append({"name": "event id", "value": event_id, "inline": True})

    return {
        "username": "Athena Sentry",
        "embeds": [
            {
                "title": title[:256],
                "description": description[:2000],
                "color": 0xE74C3C,
                "fields": fields,
            }
        ],
    }


def _post(url: str, payload: dict[str, Any]) -> None:
    try:
        httpx.post(url, json=payload, timeout=5.0)
    except Exception:
        log.exception("discord webhook post failed")


def before_send(event: dict[str, Any], hint: dict[str, Any] | None) -> dict[str, Any]:
    url = _webhook_url()
    if url:
        payload = _payload(event, hint)
        threading.Thread(target=_post, args=(url, payload), daemon=True).start()
    return event
