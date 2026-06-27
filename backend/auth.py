"""
Clerk JWT verification for FastAPI.

Two auth paths:
  - require_auth       → verifies a Clerk session JWT (Bearer token from the browser)
  - require_backend_secret → verifies X-API-Key header (server-to-server calls: cron, Next.js API routes)

JWKS keys are fetched once from Clerk and cached in memory for 1 hour.
"""
import base64
import json
import os
import time
from dataclasses import dataclass

import httpx
import jwt
from fastapi import Header, HTTPException

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BACKEND_API_SECRET = os.getenv("BACKEND_API_SECRET", "")

_CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")
_CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")


def _resolve_jwks_url() -> str:
    if _CLERK_JWKS_URL:
        return _CLERK_JWKS_URL

    if _CLERK_PUBLISHABLE_KEY.startswith("pk_"):
        # pk_test_<base64_frontend_api>$  or  pk_live_<base64_frontend_api>$
        # base64 decodes to e.g. "sharing-satyr-59.clerk.accounts.dev$"
        try:
            _, _, encoded = _CLERK_PUBLISHABLE_KEY.partition("_")[2].partition("_")
            # rstrip ensures we handle the trailing $
            padded = encoded + "=" * (-len(encoded) % 4)
            frontend_api = base64.b64decode(padded).decode().rstrip("$")
            return f"https://{frontend_api}/.well-known/jwks.json"
        except Exception:
            pass

    raise RuntimeError(
        "Cannot resolve Clerk JWKS URL. "
        "Set CLERK_JWKS_URL or CLERK_PUBLISHABLE_KEY in backend/.env"
    )


# ---------------------------------------------------------------------------
# JWKS cache
# ---------------------------------------------------------------------------

_jwks_cache: list[dict] = []
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600  # seconds


def _get_public_key(kid: str):
    global _jwks_cache, _jwks_fetched_at

    now = time.monotonic()
    if not _jwks_cache or (now - _jwks_fetched_at) > _JWKS_TTL:
        url = _resolve_jwks_url()
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json().get("keys", [])
        _jwks_fetched_at = now

    for key_data in _jwks_cache:
        if key_data.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))

    # Kid not found — keys may have rotated; force refresh once
    url = _resolve_jwks_url()
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json().get("keys", [])
    _jwks_fetched_at = time.monotonic()

    for key_data in _jwks_cache:
        if key_data.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))

    return None


# ---------------------------------------------------------------------------
# Auth types
# ---------------------------------------------------------------------------

@dataclass
class AuthContext:
    clerk_user_id: str
    clerk_org_id: str | None
    org_role: str | None   # "org:admin" | "org:member" | None

    @property
    def is_admin(self) -> bool:
        return self.org_role == "org:admin"


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def require_auth(
    authorization: str | None = Header(default=None),
) -> AuthContext:
    """
    Verifies a Clerk session JWT from the Authorization: Bearer <token> header.
    Raises 401 if missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization[7:]

    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as e:
        raise HTTPException(status_code=401, detail=f"Malformed token: {e}")

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing 'kid' header.")

    public_key = _get_public_key(kid)
    if not public_key:
        raise HTTPException(status_code=401, detail="Unknown token signing key.")

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    return AuthContext(
        clerk_user_id=payload["sub"],
        clerk_org_id=payload.get("org_id"),
        org_role=payload.get("org_role"),
    )


def require_backend_secret(
    x_api_key: str | None = Header(default=None),
) -> None:
    """
    Verifies X-API-Key header for server-to-server calls (Next.js routes, cron).
    If BACKEND_API_SECRET is not configured, the check is skipped (dev mode).
    """
    if not BACKEND_API_SECRET:
        return  # Not configured — open in dev

    if x_api_key != BACKEND_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key.")
