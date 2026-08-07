import os
import uuid
from datetime import timedelta
from pathlib import Path

from google.cloud import storage as gcs

# Unset in any environment that hasn't provisioned the bucket yet (e.g. local
# dev) — every function here is a no-op gated behind enabled(), so the
# upload/preview paths degrade gracefully to Track A (text-only preview, see
# docs/specs/file-preview-spec.md) rather than failing.
GCS_BUCKET = os.getenv("GCS_BUCKET")

_client: gcs.Client | None = None


def enabled() -> bool:
    return bool(GCS_BUCKET)


def _get_client() -> gcs.Client:
    global _client
    if _client is None:
        _client = gcs.Client()
    return _client


def _bucket() -> gcs.Bucket:
    return _get_client().bucket(GCS_BUCKET)


def upload_original(org_id: str, filename: str, raw: bytes, content_type: str | None) -> str:
    """
    Uploads the original file bytes, returns the GCS object path (not a URL).
    The path never uses the filename directly as an address component — only
    as the final leaf under a random uuid segment — so collisions and any
    path-injection concern from a user-supplied filename are sidestepped.
    """
    safe_name = Path(filename).name  # strips any directory components
    object_path = f"uploads/{org_id}/{uuid.uuid4()}/{safe_name}"
    blob = _bucket().blob(object_path)
    blob.upload_from_string(raw, content_type=content_type)
    return object_path


def signed_url(object_path: str, expires_seconds: int = 300) -> str:
    """Short-lived V4 signed URL — the bucket itself is never public. Signing
    works off the Cloud Run service account's ambient credentials, no key
    file needed."""
    blob = _bucket().blob(object_path)
    return blob.generate_signed_url(version="v4", expiration=timedelta(seconds=expires_seconds))


def delete_org_prefix(org_id: str) -> None:
    """
    Deletes every stored object under an org's prefix. Postgres's
    ON DELETE CASCADE on org_id cleans up document_files rows automatically
    on org offboarding, but cannot reach into GCS — this must be called
    explicitly from the organization.deleted webhook handler.
    """
    if not enabled():
        return
    for blob in _get_client().list_blobs(GCS_BUCKET, prefix=f"uploads/{org_id}/"):
        blob.delete()
