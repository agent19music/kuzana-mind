"""Notion helpers for OAuth-connected workspaces (search pages for root picker)."""
from __future__ import annotations

import httpx

NOTION_VERSION = "2022-06-28"
NOTION_SEARCH = "https://api.notion.com/v1/search"


class NotionOAuthError(Exception):
    def __init__(self, message: str, *, status: int | None = None, body: str = ""):
        super().__init__(message)
        self.status = status
        self.body = body


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _page_title(page: dict) -> str:
    props = page.get("properties") or {}
    if isinstance(props, dict):
        for value in props.values():
            if not isinstance(value, dict):
                continue
            if value.get("type") == "title" and isinstance(value.get("title"), list):
                parts = "".join(
                    (t.get("plain_text") or "") for t in value["title"] if isinstance(t, dict)
                )
                if parts:
                    return parts
    return "Untitled"


def search_pages(access_token: str, *, page_size: int = 50) -> list[dict]:
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            NOTION_SEARCH,
            headers=_headers(access_token),
            json={
                "filter": {"property": "object", "value": "page"},
                "page_size": page_size,
            },
        )
    if res.status_code >= 400:
        raise NotionOAuthError(
            "Failed to search Notion pages",
            status=res.status_code,
            body=res.text[:500],
        )
    payload = res.json()
    out: list[dict] = []
    for page in payload.get("results") or []:
        if not isinstance(page, dict) or page.get("object") != "page":
            continue
        pid = page.get("id")
        if not pid:
            continue
        out.append(
            {
                "id": pid,
                "title": _page_title(page),
                "url": page.get("url"),
            }
        )
    return out
