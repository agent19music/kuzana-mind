"""Tally OAuth token refresh for org-stored credentials."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import httpx

TALLY_TOKEN_URL = "https://api.tally.so/oauth/token"
TALLY_FORMS_URL = "https://api.tally.so/forms"


class TallyOAuthError(Exception):
    def __init__(self, message: str, *, status: int | None = None, body: str = ""):
        super().__init__(message)
        self.status = status
        self.body = body


def _client_id() -> str:
    return (
        os.getenv("TALLY_OAUTH_CLIENT_ID", "").strip()
        or os.getenv("TALLY_REST_OAUTH_CLIENT_ID", "").strip()
    )


def refresh_access_token(refresh_token: str) -> dict:
    client_id = _client_id()
    if not client_id:
        raise TallyOAuthError("TALLY_OAUTH_CLIENT_ID is not configured on the backend")
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            TALLY_TOKEN_URL,
            data=data,
            headers={"Accept": "application/json"},
        )
    if res.status_code >= 400:
        raise TallyOAuthError(
            "Tally token refresh failed",
            status=res.status_code,
            body=res.text[:500],
        )
    return res.json()


def ensure_fresh_tally_token(org) -> str | None:
    """Return a usable Bearer token for REST ingest, refreshing if needed.

    Mutates ``org`` in-place when a refresh succeeds (caller must commit).
    """
    access = (getattr(org, "tally_api_key", None) or "").strip()
    refresh = (getattr(org, "tally_oauth_refresh_token", None) or "").strip()
    expires = getattr(org, "tally_oauth_expires_at", None)

    if not access and not refresh:
        return None
    if not refresh:
        return access or None

    now = datetime.now(timezone.utc)
    # Refresh 2 minutes early.
    needs_refresh = False
    if expires is None:
        needs_refresh = False  # unknown expiry — try access first
    else:
        exp = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
        needs_refresh = exp <= now + timedelta(minutes=2)

    if not needs_refresh and access:
        return access

    try:
        tokens = refresh_access_token(refresh)
    except TallyOAuthError:
        if access and not needs_refresh:
            return access
        raise

    new_access = (tokens.get("access_token") or "").strip()
    if not new_access:
        raise TallyOAuthError("Refresh response missing access_token")
    org.tally_api_key = new_access
    if tokens.get("refresh_token"):
        org.tally_oauth_refresh_token = tokens["refresh_token"]
    if tokens.get("scope"):
        org.tally_oauth_scope = tokens["scope"]
    expires_in = tokens.get("expires_in")
    if isinstance(expires_in, (int, float)) and expires_in > 0:
        org.tally_oauth_expires_at = now + timedelta(seconds=int(expires_in))
    return new_access


def list_forms(access_token: str, *, limit: int = 50) -> list[dict]:
    with httpx.Client(timeout=30.0) as client:
        res = client.get(
            TALLY_FORMS_URL,
            params={"limit": limit},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
    if res.status_code >= 400:
        raise TallyOAuthError(
            "Failed to list Tally forms",
            status=res.status_code,
            body=res.text[:500],
        )
    payload = res.json()
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("items", "forms", "data"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []
