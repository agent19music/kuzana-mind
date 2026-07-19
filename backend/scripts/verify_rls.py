"""
RLS / tenant-isolation smoke test. Run against a live DB *after* `alembic upgrade head`.

    cd backend && python -m scripts.verify_rls

It seeds two orgs + one chunk each (dummy embeddings, no embedding API needed),
then proves that:
  1. session_for_org(A) sees only A's rows — even with NO WHERE org_id filter.
  2. The RLS WITH CHECK blocks writing a row for another org.
  3. Deleting an org cascades its chunks (FK ON DELETE CASCADE).

Exits non-zero on any failure. Safe to re-run (cleans up its own fixtures).
"""
import sys

from sqlalchemy import text

from database import engine, get_session, session_for_org

ORG_A = "org_verify_aaa"
ORG_B = "org_verify_bbb"
ZERO_VEC = "[" + ",".join(["0.0"] * 768) + "]"


def _cleanup():
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM organizations WHERE clerk_org_id IN (:a, :b)"),
            {"a": ORG_A, "b": ORG_B},
        )  # documents cascade via FK


def _seed():
    with get_session() as s:
        for org in (ORG_A, ORG_B):
            s.execute(
                text("INSERT INTO organizations (clerk_org_id, name) VALUES (:o, :n)"),
                {"o": org, "n": org},
            )
        s.commit()
    for org in (ORG_A, ORG_B):
        with session_for_org(org) as s:
            s.execute(
                text(
                    "INSERT INTO documents (org_id, doc_id, chunk_text, embedding, source_type) "
                    "VALUES (:o, :d, :t, CAST(:e AS vector), 'mock')"
                ),
                {"o": org, "d": f"doc_{org}", "t": f"secret for {org}", "e": ZERO_VEC},
            )
            s.commit()


def check_read_isolation():
    with session_for_org(ORG_A) as s:
        # Deliberately NO WHERE org_id — RLS must still scope this to org A.
        rows = s.execute(text("SELECT org_id FROM documents")).scalars().all()
    assert rows and all(r == ORG_A for r in rows), f"read leak: saw {set(rows)}"
    print("  [ok] unfiltered SELECT under org A returned only org A rows")


def check_write_isolation():
    leaked = True
    try:
        with session_for_org(ORG_A) as s:
            s.execute(
                text(
                    "INSERT INTO documents (org_id, doc_id, chunk_text, embedding, source_type) "
                    "VALUES (:o, 'x', 'x', CAST(:e AS vector), 'mock')"
                ),
                {"o": ORG_B, "e": ZERO_VEC},  # writing B's row while scoped to A
            )
            s.commit()
    except Exception:
        leaked = False
    assert not leaked, "write leak: org A inserted a row tagged org B"
    print("  [ok] RLS WITH CHECK blocked writing another org's row")


def check_cascade():
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM organizations WHERE clerk_org_id = :o"), {"o": ORG_B})
        remaining = conn.execute(
            text("SELECT count(*) FROM documents WHERE org_id = :o"), {"o": ORG_B}
        ).scalar()
    assert remaining == 0, f"cascade failed: {remaining} org B chunks remain"
    print("  [ok] deleting org B cascaded its chunks")


def main():
    _cleanup()
    try:
        _seed()
        print("Verifying tenant isolation...")
        check_read_isolation()
        check_write_isolation()
        check_cascade()
        print("\nALL CHECKS PASSED ✓")
    except AssertionError as e:
        print(f"\nFAILED: {e}")
        sys.exit(1)
    finally:
        _cleanup()


if __name__ == "__main__":
    main()
