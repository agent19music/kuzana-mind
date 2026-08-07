"""Theme extraction over free-text form answers.

Choice and rating answers aggregate with GROUP BY once submissions are stored as
rows. Free text does not: a thousand differently-worded answers to "what is most
painful about your CI" share no GROUP BY key, which is usually the whole reason
the question was asked.

This clusters those answers by embedding similarity, names each cluster with the
LLM once, and caches per-answer sentiment — so "what are people struggling with"
becomes a table read ("flaky tests (142), slow builds (88)") with drill-down to
real verbatims, instead of one respondent's answer picked by cosine distance to
the question.

Design constraints that matter at scale:

* **Incremental.** A new sync assigns new answers to existing centroids via
  pgvector and only re-clusters a question when the unassigned share crosses
  RECLUSTER_RATIO. Re-clustering thousands of answers every sync is not viable.
* **Cheap.** The LLM is called once per *theme* (not per answer) for labels, and
  once per batch for sentiment, and only for answers that have none. Embeddings
  are already computed at ingest.
* **No new heavy dependency.** Clustering is leader/canopy with a merge pass over
  numpy dot products — sklearn is not worth ~100MB here, and leader clustering is
  what makes incremental assignment natural anyway.
"""
import os
import uuid

import numpy as np
from sqlalchemy import text
from sqlalchemy.sql import func

from database import (
    FormAnswer,
    FormAnswerTheme,
    FormQuestion,
    FormTheme,
    session_for_org,
)
from generation import classify_sentiment, label_theme

# Clustering threshold is derived per question rather than fixed, because
# absolute cosine values are not comparable across questions. Measured on
# Gemini 768-dim embeddings of survey prose with three hand-planted themes:
#
#   within-theme  pairs: mean 0.801, p5  0.746
#   between-theme pairs: mean 0.713, p95 0.763
#
# The two distributions *overlap*, so no constant separates them — a fixed 0.72
# wrongly joined 61% of cross-theme pairs and collapsed every theme into one.
# What does separate them is position within a question's own distribution, so
# the cutoff is mean + ASSIGN_SIGMA standard deviations of that question's
# pairwise similarities, clamped to a sane band.
ASSIGN_SIGMA = float(os.getenv("THEME_ASSIGN_SIGMA", "1.0"))
ASSIGN_FLOOR = float(os.getenv("THEME_ASSIGN_FLOOR", "0.76"))
ASSIGN_CEILING = float(os.getenv("THEME_ASSIGN_CEILING", "0.92"))
# Clusters smaller than this stay unassigned rather than becoming a "theme of 1";
# they join a real theme once more answers arrive.
MIN_THEME_SIZE = int(os.getenv("THEME_MIN_SIZE", "2"))
# Agglomerative clustering is O(n^2) in memory. Above this, cluster a sample and
# attach the remainder by nearest centroid. Logged, never silent.
MAX_CLUSTER_N = int(os.getenv("THEME_MAX_CLUSTER_N", "1500"))
# Re-cluster a question when this share of its answers has no theme.
RECLUSTER_RATIO = float(os.getenv("THEME_RECLUSTER_RATIO", "0.25"))
# Answers shown to the LLM when naming a theme.
LABEL_SAMPLE_SIZE = int(os.getenv("THEME_LABEL_SAMPLES", "8"))
SENTIMENT_BATCH = int(os.getenv("THEME_SENTIMENT_BATCH", "25"))

FREE_TEXT_KINDS = ("short_text", "long_text")


def _normalise(matrix: np.ndarray) -> np.ndarray:
    """Unit-length rows, so a dot product is cosine similarity."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def adaptive_threshold(sims: np.ndarray) -> float:
    """Similarity cutoff for one question, from its own pairwise distribution.

    `sims` is the full similarity matrix. Uses mean + ASSIGN_SIGMA * std over the
    off-diagonal pairs, clamped: a question whose answers are all near-identical
    would otherwise produce a cutoff so high nothing groups, and one with very
    diverse answers a cutoff so low everything does.
    """
    n = sims.shape[0]
    if n < 2:
        return ASSIGN_FLOOR
    off = sims[~np.eye(n, dtype=bool)]
    cutoff = float(off.mean() + ASSIGN_SIGMA * off.std())
    return float(np.clip(cutoff, ASSIGN_FLOOR, ASSIGN_CEILING))


def _agglomerate(vectors: np.ndarray) -> tuple[list[list[int]], float]:
    """Average-linkage agglomerative clustering under an adaptive cutoff.

    Replaces a greedy leader pass with a merge step, which failed badly here:
    leader assignment is order-sensitive, and comparing *centroids* to decide
    merges is biased toward merging, because averaging cancels the noise that
    keeps individual answers apart. Centroids of genuinely distinct themes
    measured ~0.85+ similar while their members averaged 0.71, so a merge pass
    collapsed every theme into one.

    Average linkage compares the mean of real pairwise similarities between two
    clusters, which has no such bias. Kept O(n^2) overall by carrying summed
    similarities and dividing by the size product, rather than recomputing.
    """
    unit = _normalise(vectors)
    sims = unit @ unit.T
    cutoff = adaptive_threshold(sims)

    n = len(unit)
    members: dict[int, list[int]] = {i: [i] for i in range(n)}
    # sums[a, b] = total pairwise similarity between members of a and b.
    sums = sims.astype(np.float64).copy()
    np.fill_diagonal(sums, -np.inf)   # never merge a cluster with itself
    alive = list(range(n))

    while len(alive) > 1:
        idx = np.asarray(alive)
        sub = sums[np.ix_(idx, idx)]
        sizes = np.asarray([len(members[i]) for i in alive], dtype=np.float64)
        # Average linkage: mean similarity across every cross-cluster pair.
        avg = sub / np.outer(sizes, sizes)

        flat = int(np.argmax(avg))
        ai, bi = np.unravel_index(flat, avg.shape)
        if avg[ai, bi] < cutoff:
            break

        a, b = alive[int(ai)], alive[int(bi)]
        members[a].extend(members[b])
        # Summed similarity is additive under a merge — this is what keeps the
        # whole run O(n^2) instead of recomputing linkages each step.
        sums[a, :] += sums[b, :]
        sums[:, a] += sums[:, b]
        sums[a, a] = -np.inf
        alive.remove(b)
        del members[b]

    return [members[i] for i in alive], cutoff


def _free_text_questions(org_id: str) -> list[tuple[str, str, str]]:
    with session_for_org(org_id) as session:
        rows = (
            session.query(FormQuestion.form_id, FormQuestion.question_id, FormQuestion.label)
            .filter(FormQuestion.org_id == org_id, FormQuestion.kind.in_(FREE_TEXT_KINDS))
            .all()
        )
    return [(r.form_id, r.question_id, r.label or "") for r in rows]


async def _fill_sentiment(org_id: str, form_id: str, question_id: str) -> int:
    """Classify answers that have no sentiment yet, reusing by text hash.

    Identical text gets one classification regardless of how many respondents
    wrote it, and a re-cluster never re-pays for sentiment.
    """
    with session_for_org(org_id) as session:
        pending = (
            session.query(FormAnswer.id, FormAnswer.answer_text, FormAnswer.text_hash)
            .filter(
                FormAnswer.org_id == org_id,
                FormAnswer.form_id == form_id,
                FormAnswer.question_id == question_id,
                FormAnswer.sentiment.is_(None),
                FormAnswer.answer_text.isnot(None),
            )
            .all()
        )
        if not pending:
            return 0

        # Reuse anything already classified for this org with the same text.
        hashes = [p.text_hash for p in pending if p.text_hash]
        known: dict[str, str] = {}
        if hashes:
            for h, s in (
                session.query(FormAnswer.text_hash, FormAnswer.sentiment)
                .filter(
                    FormAnswer.org_id == org_id,
                    FormAnswer.text_hash.in_(hashes),
                    FormAnswer.sentiment.isnot(None),
                )
                .all()
            ):
                known.setdefault(h, s)

    unknown = [p for p in pending if not (p.text_hash and p.text_hash in known)]
    # De-duplicate by text so a repeated answer costs one classification.
    by_text: dict[str, list] = {}
    for p in unknown:
        by_text.setdefault(p.answer_text, []).append(p)

    texts = list(by_text)
    fresh: dict[str, str] = {}
    for i in range(0, len(texts), SENTIMENT_BATCH):
        batch = texts[i:i + SENTIMENT_BATCH]
        fresh.update(zip(batch, await classify_sentiment(batch)))

    with session_for_org(org_id) as session:
        for p in pending:
            value = known.get(p.text_hash or "") or fresh.get(p.answer_text)
            if value:
                session.query(FormAnswer).filter(FormAnswer.id == p.id).update({"sentiment": value})
        session.commit()

    return len(texts)


async def recompute_question_themes(
    org_id: str, form_id: str, question_id: str, question_label: str, force: bool = False
) -> dict:
    """Cluster (or incrementally extend) the themes for one free-text question."""
    with session_for_org(org_id) as session:
        answers = (
            session.query(FormAnswer.id, FormAnswer.answer_text, FormAnswer.embedding)
            .filter(
                FormAnswer.org_id == org_id,
                FormAnswer.form_id == form_id,
                FormAnswer.question_id == question_id,
                FormAnswer.embedding.isnot(None),
            )
            .order_by(FormAnswer.created_at, FormAnswer.id)   # deterministic clustering
            .all()
        )
        theme_count = (
            session.query(FormTheme)
            .filter(
                FormTheme.org_id == org_id,
                FormTheme.form_id == form_id,
                FormTheme.question_id == question_id,
            )
            .count()
        )
        assigned = (
            session.execute(
                text("""
                    SELECT count(*) FROM form_answer_themes t
                    JOIN form_answers a ON a.id = t.answer_id
                    WHERE t.org_id = :org AND a.form_id = :form AND a.question_id = :q
                """),
                {"org": org_id, "form": form_id, "q": question_id},
            ).scalar()
            or 0
        )

    total = len(answers)
    if total < MIN_THEME_SIZE:
        return {"question_id": question_id, "skipped": "too few answers", "answers": total}

    unassigned_ratio = (total - assigned) / total if total else 0.0
    full_recluster = force or theme_count == 0 or unassigned_ratio > RECLUSTER_RATIO

    if full_recluster:
        stats = await _full_recluster(org_id, form_id, question_id, question_label, answers)
    else:
        stats = await _incremental_assign(org_id, form_id, question_id, answers)

    classified = await _fill_sentiment(org_id, form_id, question_id)
    _refresh_theme_stats(org_id, form_id, question_id)

    return {
        "question_id": question_id,
        "question": question_label[:60],
        "answers": total,
        "mode": "recluster" if full_recluster else "incremental",
        "sentiment_classified": classified,
        **stats,
    }


async def _full_recluster(
    org_id: str, form_id: str, question_id: str, question_label: str, answers: list
) -> dict:
    vectors = np.asarray([np.asarray(a.embedding, dtype=np.float32) for a in answers])

    # Clustering is O(n^2) in memory; above the cap, cluster a deterministic
    # sample and let the incremental pass attach the rest by nearest centroid.
    sampled = None
    if len(vectors) > MAX_CLUSTER_N:
        step = len(vectors) / MAX_CLUSTER_N
        sampled = [int(i * step) for i in range(MAX_CLUSTER_N)]
        print(
            f"  {len(vectors)} answers exceeds THEME_MAX_CLUSTER_N={MAX_CLUSTER_N}; "
            f"clustering a {len(sampled)}-answer sample, remainder assigned incrementally"
        )
        cluster_vectors = vectors[sampled]
    else:
        cluster_vectors = vectors

    raw_clusters, cutoff = _agglomerate(cluster_vectors)
    # Map sample-local indices back to positions in `answers`.
    if sampled is not None:
        raw_clusters = [[sampled[i] for i in c] for c in raw_clusters]
    clusters = [c for c in raw_clusters if len(c) >= MIN_THEME_SIZE]
    print(f"  cutoff={cutoff:.3f} → {len(clusters)} themes of size >= {MIN_THEME_SIZE}")

    unit = _normalise(vectors)

    with session_for_org(org_id) as session:
        # Themes cascade to their assignments, so this clears both.
        session.query(FormTheme).filter(
            FormTheme.org_id == org_id,
            FormTheme.form_id == form_id,
            FormTheme.question_id == question_id,
        ).delete()
        session.commit()

    created = 0
    for members in sorted(clusters, key=len, reverse=True):
        centroid = unit[members].mean(axis=0)
        centroid = centroid / (np.linalg.norm(centroid) or 1.0)

        # Label from the answers nearest the centroid — the most representative
        # of the cluster, not an arbitrary slice.
        order = np.argsort(-(unit[members] @ centroid))
        samples = [answers[members[i]].answer_text for i in order[:LABEL_SAMPLE_SIZE]]
        named = await label_theme(question_label, [s for s in samples if s])

        theme_id = uuid.uuid4()
        with session_for_org(org_id) as session:
            session.add(FormTheme(
                id=theme_id,
                org_id=org_id,
                form_id=form_id,
                question_id=question_id,
                label=named["label"],
                summary=named["summary"],
                size=len(members),
                centroid=centroid.tolist(),
                assign_cutoff=cutoff,
                labelled_at=func.now(),
            ))
            # No ORM relationship is declared between these tables, so the unit
            # of work has no dependency to sort on and would batch the child
            # inserts first, violating the FK. Flush the parent explicitly.
            session.flush()
            for i in members:
                session.add(FormAnswerTheme(
                    org_id=org_id,
                    answer_id=answers[i].id,
                    theme_id=theme_id,
                    distance=float(1.0 - float(unit[i] @ centroid)),
                ))
            session.commit()
        created += 1

    return {"themes": created, "clustered": sum(len(c) for c in clusters)}


async def _incremental_assign(org_id: str, form_id: str, question_id: str, answers: list) -> dict:
    """Attach answers with no theme to the nearest existing centroid.

    Answers too far from every centroid are left unassigned on purpose — they
    accumulate until their share triggers a re-cluster, which is what lets a new
    theme emerge instead of being forced into an existing one.
    """
    with session_for_org(org_id) as session:
        # Deliberately the ORM rather than raw SQL: a raw text() query returns
        # the pgvector column as its literal string form, since the type adapter
        # is only applied for mapped columns.
        already = session.query(FormAnswerTheme.answer_id).filter(
            FormAnswerTheme.org_id == org_id
        )
        rows = (
            session.query(FormAnswer.id, FormAnswer.embedding)
            .filter(
                FormAnswer.org_id == org_id,
                FormAnswer.form_id == form_id,
                FormAnswer.question_id == question_id,
                FormAnswer.embedding.isnot(None),
                FormAnswer.id.notin_(already),
            )
            .all()
        )

        themes = (
            session.query(FormTheme.id, FormTheme.centroid, FormTheme.assign_cutoff)
            .filter(
                FormTheme.org_id == org_id,
                FormTheme.form_id == form_id,
                FormTheme.question_id == question_id,
                FormTheme.centroid.isnot(None),
            )
            .all()
        )

    if not rows or not themes:
        return {"assigned": 0, "left_unassigned": len(rows)}

    centroids = _normalise(np.asarray([np.asarray(t.centroid, dtype=np.float32) for t in themes]))
    # Reuse the cutoff the clustering ran under rather than inventing a second
    # constant. Compared against a centroid it is a slightly stricter bar than
    # average linkage was, which is the safe direction: a borderline answer stays
    # unassigned and counts toward triggering the next re-cluster, where a new
    # theme can form for it.
    cutoffs = np.asarray([t.assign_cutoff or ASSIGN_FLOOR for t in themes], dtype=np.float32)
    assigned = 0

    with session_for_org(org_id) as session:
        for row in rows:
            vec = np.asarray(row.embedding, dtype=np.float32)
            vec = vec / (np.linalg.norm(vec) or 1.0)
            sims = centroids @ vec
            best = int(np.argmax(sims))
            if sims[best] < cutoffs[best]:
                continue
            session.add(FormAnswerTheme(
                org_id=org_id,
                answer_id=row.id,
                theme_id=themes[best].id,
                distance=float(1.0 - float(sims[best])),
            ))
            assigned += 1
        session.commit()

    return {"assigned": assigned, "left_unassigned": len(rows) - assigned}


def _refresh_theme_stats(org_id: str, form_id: str, question_id: str) -> None:
    """Recount size and the sentiment split from the assignments themselves, so
    the cached numbers can never drift from the rows they summarise."""
    with session_for_org(org_id) as session:
        session.execute(
            text("""
                UPDATE form_themes th SET
                    size = s.total,
                    sentiment_positive = s.pos,
                    sentiment_negative = s.neg,
                    sentiment_neutral  = s.neu,
                    updated_at = now()
                FROM (
                    SELECT t.theme_id,
                           count(*) AS total,
                           count(*) FILTER (WHERE a.sentiment = 'positive') AS pos,
                           count(*) FILTER (WHERE a.sentiment = 'negative') AS neg,
                           count(*) FILTER (WHERE a.sentiment = 'neutral')  AS neu
                    FROM form_answer_themes t
                    JOIN form_answers a ON a.id = t.answer_id
                    WHERE t.org_id = :org AND a.form_id = :form AND a.question_id = :q
                    GROUP BY t.theme_id
                ) s
                WHERE th.id = s.theme_id AND th.org_id = :org
            """),
            {"org": org_id, "form": form_id, "q": question_id},
        )
        session.commit()


async def recompute_themes(org_id: str, form_id: str | None = None, force: bool = False) -> dict:
    """Refresh themes for every free-text question in an org (or one form)."""
    if not org_id:
        raise ValueError("recompute_themes requires an org_id")

    questions = _free_text_questions(org_id)
    if form_id:
        questions = [q for q in questions if q[0] == form_id]

    results = []
    for fid, qid, label in questions:
        result = await recompute_question_themes(org_id, fid, qid, label, force=force)
        results.append(result)
        print(f"  themes[{label[:40]!r}]: {result}")

    return {"questions": len(results), "results": results}
