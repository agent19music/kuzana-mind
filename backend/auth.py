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


def _resolve_issuer() -> str | None:
    """The expected `iss` claim: the Clerk frontend API origin.

    JWKS lives at `https://{frontend_api}/.well-known/jwks.json`, so the issuer
    is that same origin. Returns None if it can't be resolved, in which case the
    issuer check is skipped (signature + expiry still enforced).
    """
    explicit = os.getenv("CLERK_ISSUER", "")
    if explicit:
        return explicit.rstrip("/")
    try:
        return _resolve_jwks_url().split("/.well-known/")[0]
    except RuntimeError:
        return None


# Optional hardening — enforced only when configured:
#   CLERK_AUDIENCE           → verify the `aud` claim (Clerk session tokens omit
#                              aud by default; set only if you mint via a JWT
#                              template that adds one).
#   CLERK_AUTHORIZED_PARTIES → comma-separated allowed `azp` values (your app
#                              origins), so a token minted for another origin
#                              on the same Clerk instance is rejected.
_CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE", "") or None
_AUTHORIZED_PARTIES = [
    p.strip() for p in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()
]


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
            issuer=_resolve_issuer(),
            audience=_CLERK_AUDIENCE,
            options={"verify_exp": True, "verify_aud": _CLERK_AUDIENCE is not None},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Token issuer mismatch.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Token audience mismatch.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # Authorized-party check: the token must have been minted for one of our
    # own origins. Only enforced when CLERK_AUTHORIZED_PARTIES is configured.
    if _AUTHORIZED_PARTIES:
        azp = payload.get("azp")
        if not azp or azp not in _AUTHORIZED_PARTIES:
            raise HTTPException(
                status_code=401,
                detail="Token authorized party (azp) is not permitted.",
            )

    # Org claims. Clerk emits two session-token shapes: the legacy flat claims
    # (org_id / org_role, "org:admin") and the current compact `o` object
    # ({id, rol, slg} where rol is "admin"/"member"). Default session tokens use
    # `o`, so we must read both or every org-scoped request 403s despite an
    # active org. Normalise the role back to the "org:<role>" form the rest of
    # the app (AuthContext.is_admin) expects.
    org_id = payload.get("org_id")
    org_role = payload.get("org_role")
    if not org_id:
        o = payload.get("o")
        if isinstance(o, dict):
            org_id = o.get("id")
            rol = o.get("rol")
            org_role = f"org:{rol}" if rol else None

    if not org_id:
        # Every protected endpoint is org-scoped. A token with no active org
        # must never fall through to an unscoped (cross-tenant) query path.
        raise HTTPException(
            status_code=403,
            detail="No active organization on this session. Select or create an org first.",
        )

    return AuthContext(
        clerk_user_id=payload["sub"],
        clerk_org_id=org_id,
        org_role=org_role,
    )


async def require_read_auth(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
    x_org_id: str | None = Header(default=None, alias="x-org-id"),
) -> AuthContext:
    """
    Dual-auth for read endpoints called from Next.js server components.

    Accepts either:
      - Bearer <clerk-jwt>  (user request, org_id must be in the token)
      - X-API-Key + X-Org-Id  (server-to-server from a trusted Next.js component)

    The server-to-server path is safe because BACKEND_API_SECRET is only known
    to the Next.js server, and X-Org-Id comes from Clerk's own auth() which has
    already verified the session.
    """
    if x_api_key:
        if not BACKEND_API_SECRET:
            raise HTTPException(status_code=500, detail="BACKEND_API_SECRET not configured.")
        if x_api_key != BACKEND_API_SECRET:
            raise HTTPException(status_code=401, detail="Invalid API key.")
        if not x_org_id:
            raise HTTPException(status_code=400, detail="X-Org-Id header required.")
        return AuthContext(clerk_user_id="server", clerk_org_id=x_org_id, org_role="org:admin")

    return await require_auth(authorization)


def require_backend_secret(
    x_api_key: str | None = Header(default=None),
) -> None:
    """
    Verifies X-API-Key header for server-to-server calls (Next.js routes, cron).
    Fails closed: if BACKEND_API_SECRET is not configured, the endpoint is
    rejected rather than left open. Set BACKEND_API_SECRET in every environment.
    """
    if not BACKEND_API_SECRET:
        raise HTTPException(
            status_code=500,
            detail="BACKEND_API_SECRET is not configured; server-to-server endpoints are disabled.",
        )

    if x_api_key != BACKEND_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key.")
