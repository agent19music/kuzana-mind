"""Paddle Billing API client (not Classic).

Env:
  PADDLE_API_KEY          — server secret (Bearer)
  PADDLE_WEBHOOK_SECRET   — endpoint secret for Paddle-Signature
  PADDLE_PRICE_ID_PRO     — optional override for Pro monthly price id
  PADDLE_PRICE_ID_PLUS    — optional override (maps to Advanced; legacy name)
  PADDLE_PRICE_ID_ADVANCED — optional override for Advanced monthly price id
  PADDLE_ENVIRONMENT      — sandbox | production
  PADDLE_CLIENT_TOKEN     — client-side token for Paddle.js (frontend only)
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx

PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "")
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "")
PADDLE_PRICE_ID_PRO = os.getenv("PADDLE_PRICE_ID_PRO", "")
PADDLE_PRICE_ID_PLUS = os.getenv("PADDLE_PRICE_ID_PLUS", "")
PADDLE_PRICE_ID_ADVANCED = os.getenv("PADDLE_PRICE_ID_ADVANCED", "") or PADDLE_PRICE_ID_PLUS
PADDLE_ENVIRONMENT = os.getenv("PADDLE_ENVIRONMENT", "sandbox").lower()

# Sandbox catalog created for Athena (month + year). Env overrides win when set.
_DEFAULT_PRICE_PLAN: dict[str, str] = {
    # Starter
    "pri_01m215b0ecq2b4ax936hxkg1zp": "starter",
    "pri_01m215b1hh683530gdj8xcc8c1": "starter",
    # Pro
    "pri_01m215b3khx25g48jem5rbk8tb": "pro",
    "pri_01m215b4y93q0h63peaj2w7ga6": "pro",
    # Advanced
    "pri_01m215b757n462c86r7tev62vq": "advanced",
    "pri_01m215b83z0avwsv0va5tdxteq": "advanced",
}

_API_BASE = (
    "https://api.paddle.com"
    if PADDLE_ENVIRONMENT == "production"
    else "https://sandbox-api.paddle.com"
)


class PaddleError(Exception):
    def __init__(self, message: str, status: int | None = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


def catalog_price_ids() -> dict[str, str]:
    """price_id → plan id for known catalog prices."""
    mapping = dict(_DEFAULT_PRICE_PLAN)
    if PADDLE_PRICE_ID_PRO:
        mapping[PADDLE_PRICE_ID_PRO] = "pro"
    if PADDLE_PRICE_ID_ADVANCED:
        mapping[PADDLE_PRICE_ID_ADVANCED] = "advanced"
    if PADDLE_PRICE_ID_PLUS:
        mapping[PADDLE_PRICE_ID_PLUS] = "advanced"
    return mapping


def price_id_for_plan(plan: str) -> str:
    """Monthly price id for seat-sync / legacy transaction checkout."""
    normalized = "advanced" if plan in ("plus", "advanced") else plan
    if normalized == "advanced":
        pid = PADDLE_PRICE_ID_ADVANCED or "pri_01m215b757n462c86r7tev62vq"
        return pid
    if normalized == "starter":
        return "pri_01m215b0ecq2b4ax936hxkg1zp"
    # pro
    return PADDLE_PRICE_ID_PRO or "pri_01m215b3khx25g48jem5rbk8tb"


def configured() -> bool:
    return bool(PADDLE_API_KEY)


def _headers() -> dict[str, str]:
    if not PADDLE_API_KEY:
        raise PaddleError("PADDLE_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {PADDLE_API_KEY}",
        "Content-Type": "application/json",
    }


def _request(method: str, path: str, json_body: dict | None = None) -> dict:
    url = f"{_API_BASE}{path}"
    with httpx.Client(timeout=30.0) as client:
        resp = client.request(method, url, headers=_headers(), json=json_body)
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    if resp.status_code >= 400:
        raise PaddleError(
            f"Paddle {method} {path} failed: {resp.status_code}",
            status=resp.status_code,
            body=data,
        )
    return data if isinstance(data, dict) else {"data": data}


def create_checkout_transaction(
    *,
    quantity: int,
    clerk_org_id: str,
    plan: str = "pro",
    customer_email: str | None = None,
    paddle_customer_id: str | None = None,
) -> dict:
    """Create a draft/ready transaction for Paddle.js overlay checkout."""
    price_id = price_id_for_plan(plan)
    qty = max(1, int(quantity))
    payload: dict[str, Any] = {
        "items": [{"price_id": price_id, "quantity": qty}],
        "custom_data": {"clerk_org_id": clerk_org_id, "plan": plan},
        "collection_mode": "automatic",
    }
    if paddle_customer_id:
        payload["customer_id"] = paddle_customer_id
    elif customer_email:
        payload["customer"] = {"email": customer_email}

    result = _request("POST", "/transactions", payload)
    return result.get("data") or result


def update_subscription_quantity(subscription_id: str, quantity: int, *, price_id: str | None = None) -> dict:
    qty = max(1, int(quantity))
    pid = price_id or PADDLE_PRICE_ID_PRO or PADDLE_PRICE_ID_PLUS
    if not pid:
        raise PaddleError("No Paddle price id configured")
    payload = {
        "items": [{"price_id": pid, "quantity": qty}],
        "proration_billing_mode": "prorated_immediately",
    }
    result = _request("PATCH", f"/subscriptions/{subscription_id}", payload)
    return result.get("data") or result


def cancel_subscription(subscription_id: str, *, effective_from: str = "next_billing_period") -> dict:
    payload = {"effective_from": effective_from}
    result = _request("POST", f"/subscriptions/{subscription_id}/cancel", payload)
    return result.get("data") or result


def get_subscription(subscription_id: str) -> dict:
    result = _request("GET", f"/subscriptions/{subscription_id}")
    return result.get("data") or result


def verify_webhook_signature(raw_body: bytes, signature_header: str | None) -> bool:
    """Verify Paddle-Signature: ts=…;h1=…

    See https://developer.paddle.com/webhooks/signature-verification
    """
    if not PADDLE_WEBHOOK_SECRET:
        # Fail closed in production-ish configs; allow local without secret only
        # when explicitly sandbox and no secret set — still reject forged events
        # if a secret *is* configured.
        return PADDLE_ENVIRONMENT != "production" and not PADDLE_WEBHOOK_SECRET

    if not signature_header:
        return False

    ts = None
    h1 = None
    for part in signature_header.split(";"):
        part = part.strip()
        if part.startswith("ts="):
            ts = part[3:]
        elif part.startswith("h1="):
            h1 = part[3:]

    if not ts or not h1:
        return False

    try:
        ts_i = int(ts)
    except ValueError:
        return False

    # Reject stale timestamps (>5 minutes).
    if abs(int(time.time()) - ts_i) > 300:
        return False

    signed_payload = ts.encode() + b":" + raw_body
    expected = hmac.new(
        PADDLE_WEBHOOK_SECRET.encode(),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, h1)


def parse_rfc3339(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # Paddle uses RFC 3339; fromisoformat handles most forms with Z → +00:00.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def clerk_org_from_custom_data(entity: dict | None) -> str | None:
    if not entity:
        return None
    custom = entity.get("custom_data") or {}
    if isinstance(custom, dict):
        org = custom.get("clerk_org_id")
        if isinstance(org, str) and org.strip():
            return org.strip()
    return None


def seats_from_subscription(sub: dict) -> int:
    items = sub.get("items") or []
    known = catalog_price_ids()
    total = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        price = item.get("price") or {}
        price_id = item.get("price_id") or (price.get("id") if isinstance(price, dict) else None)
        if known and price_id and price_id not in known:
            continue
        q = item.get("quantity")
        if isinstance(q, int):
            total += q
    return max(1, total or 1)


def plan_from_subscription(sub: dict) -> str:
    known = catalog_price_ids()
    custom = sub.get("custom_data") or {}
    if isinstance(custom, dict):
        plan = custom.get("plan")
        if plan in ("starter", "pro", "advanced"):
            return plan
        if plan == "plus":
            return "advanced"
    for item in sub.get("items") or []:
        if not isinstance(item, dict):
            continue
        price = item.get("price") or {}
        price_id = item.get("price_id") or (price.get("id") if isinstance(price, dict) else None)
        if price_id in known:
            mapped = known[price_id]
            return "advanced" if mapped == "plus" else mapped
    return "pro"


def item_price_id(sub: dict) -> str | None:
    for item in sub.get("items") or []:
        if not isinstance(item, dict):
            continue
        price = item.get("price") or {}
        price_id = item.get("price_id") or (price.get("id") if isinstance(price, dict) else None)
        if isinstance(price_id, str) and price_id:
            return price_id
    return None


def period_end_from_subscription(sub: dict) -> datetime | None:
    # Prefer current_billing_period.ends_at, then next_billed_at.
    period = sub.get("current_billing_period") or {}
    if isinstance(period, dict):
        end = parse_rfc3339(period.get("ends_at"))
        if end:
            return end
    return parse_rfc3339(sub.get("next_billed_at"))


def map_paddle_status(status: str | None) -> str:
    s = (status or "").lower()
    if s in ("active", "trialing", "past_due", "canceled", "paused"):
        return "canceled" if s == "paused" else s
    if s == "cancelled":
        return "canceled"
    return "active"


def apply_subscription_event(session, sub: dict, *, clerk_org_id: str | None = None) -> str | None:
    """Upsert org_subscriptions from a Paddle subscription entity. Returns org id."""
    from billing import upsert_subscription

    org_id = clerk_org_id or clerk_org_from_custom_data(sub)
    if not org_id:
        # Look up by paddle subscription id.
        from database import OrgSubscription

        existing = (
            session.query(OrgSubscription)
            .filter(OrgSubscription.paddle_subscription_id == sub.get("id"))
            .first()
        )
        if existing:
            org_id = existing.clerk_org_id
    if not org_id:
        return None

    # Webhooks can arrive before onboarding / Clerk org webhook wrote the row.
    # org_subscriptions FKs to organizations — create a stub if missing.
    from database import ensure_organization_exists

    ensure_organization_exists(org_id)

    status = map_paddle_status(sub.get("status"))
    paid = status in ("active", "trialing", "past_due") or (
        status == "canceled"
        and period_end_from_subscription(sub)
        and period_end_from_subscription(sub) > datetime.now(timezone.utc)
    )
    plan = plan_from_subscription(sub) if paid or status == "canceled" else "starter"
    if status == "canceled":
        plan = plan_from_subscription(sub)

    upsert_subscription(
        session,
        org_id,
        plan=plan,
        status=status,
        source="paddle",
        seats=seats_from_subscription(sub),
        current_period_end=period_end_from_subscription(sub),
        paddle_customer_id=sub.get("customer_id"),
        paddle_subscription_id=sub.get("id"),
    )
    return org_id
