"""Populate the structured form store for orgs that were indexed before it existed.

There is no offline backfill: the structured columns come from Tally's API
response (question types, per-question answers), and the only copy kept locally
is the flattened markdown in `documents` — which is exactly the lossy
representation these tables exist to replace. So a backfill *is* a re-sync.

This re-runs ingestion for every org with Tally credentials configured, which
rewrites `documents` identically and fills form_definitions / form_questions /
form_responses / form_answers. Embeddings are hash-cached, so a re-sync of
unchanged answers spends nothing on embedding.

    docker compose exec backend python scripts/backfill_form_store.py [--dry-run]

Safe to re-run: every write is an upsert keyed on
(org, form, external_id) / (response, question).
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from database import FormResponse, Organization, get_session, session_for_org  # noqa: E402
from ingest import run_ingestion  # noqa: E402


def _tally_orgs() -> list[tuple[str, str]]:
    with get_session() as session:
        rows = (
            session.query(Organization.clerk_org_id, Organization.name)
            .filter(
                Organization.tally_api_key.isnot(None),
                Organization.tally_api_key != "",
            )
            .all()
        )
    # tally_form_ids is JSONB; filter in Python so an empty list is excluded too.
    out = []
    with get_session() as session:
        for org_id, name in rows:
            org = session.query(Organization).filter_by(clerk_org_id=org_id).first()
            if org and org.tally_form_ids:
                out.append((org_id, name or org_id))
    return out


def _response_count(org_id: str) -> int:
    with session_for_org(org_id) as session:
        return session.query(FormResponse).filter(FormResponse.org_id == org_id).count()


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="list target orgs without syncing")
    parser.add_argument("--org", help="only this clerk_org_id")
    args = parser.parse_args()

    orgs = _tally_orgs()
    if args.org:
        orgs = [o for o in orgs if o[0] == args.org]

    if not orgs:
        print("No orgs with Tally credentials and form ids configured — nothing to do.")
        return 0

    print(f"{len(orgs)} org(s) with Tally configured:")
    for org_id, name in orgs:
        print(f"  {org_id}  ({name})  structured responses now: {_response_count(org_id)}")

    if args.dry_run:
        print("\n--dry-run: no changes made.")
        return 0

    failures = 0
    for org_id, name in orgs:
        print(f"\n=== re-syncing {name} ({org_id}) ===")
        try:
            await run_ingestion(org_id=org_id, trigger="backfill")
            print(f"  structured responses after: {_response_count(org_id)}")
        except Exception as exc:  # one bad tenant must not stop the rest
            failures += 1
            print(f"  FAILED: {exc}")

    print(f"\nDone. {len(orgs) - failures} succeeded, {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
