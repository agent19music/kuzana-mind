"use client";

import { useEffect, useMemo, useState } from "react";

type Analytics = {
  total_questions: number;
  unanswered_count: number;
  active_threads: number;
  volume: { day: string; count: number }[];
  top_questions: { question: string; count: number }[];
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        background: "#fff",
        border: "1px solid #EBEBEB",
        borderRadius: 12,
        padding: "20px 22px",
      }}
    >
      <p style={{ fontSize: 13, color: "#6b6b6b", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 400, color: "#111", margin: "6px 0 0", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {hint && <p style={{ fontSize: 12, color: "#a3a3a3", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function VolumeChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #EBEBEB",
        borderRadius: 12,
        padding: "22px 24px",
      }}
    >
      <p style={{ fontSize: 14, color: "#111", margin: "0 0 18px" }}>Questions over the last 14 days</p>
      {data.length === 0 ? (
        <p style={{ fontSize: 13, color: "#a3a3a3", margin: 0 }}>No questions yet.</p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {data.map((d) => (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                title={`${d.count} on ${d.day}`}
                style={{
                  width: "100%",
                  maxWidth: 28,
                  height: `${Math.max(4, (d.count / max) * 100)}%`,
                  background: "var(--brand-olive, #6b7250)",
                  borderRadius: 4,
                  transition: "height 300ms ease-out",
                }}
              />
              <span style={{ fontSize: 10, color: "#a3a3a3" }}>
                {new Date(d.day).getDate()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Module-level so it survives unmount/remount (tab switches, navigating away
// and back) — the client fetches once per session and later mounts render
// the cached cards immediately instead of showing "Loading…" again.
let analyticsCache: Analytics | null = null;

export default function AnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(analyticsCache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(analyticsCache === null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? json.detail ?? "Could not load analytics.");
        } else {
          analyticsCache = json;
          setData(json);
        }
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const answered = data.total_questions - data.unanswered_count;
    const answerRate =
      data.total_questions > 0 ? Math.round((answered / data.total_questions) * 100) : 0;
    return { answered, answerRate };
  }, [data]);

  // Loading only blocks the first-ever fetch — once cached, stale cards stay
  // on screen while a fresh fetch resolves in the background.
  if (loading && !data) {
    return <p style={{ fontSize: 14, color: "#a3a3a3" }}>Loading…</p>;
  }
  if (error && !data) {
    return <p style={{ fontSize: 14, color: "#dc2626" }}>{error}</p>;
  }
  if (!data || !derived) return null;

  const { answered, answerRate } = derived;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stat tiles */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatTile label="Questions asked" value={String(data.total_questions)} />
        <StatTile
          label="Answered from docs"
          value={`${answerRate}%`}
          hint={`${answered} of ${data.total_questions}`}
        />
        <StatTile
          label="Unanswered"
          value={String(data.unanswered_count)}
          hint="Fell back to staff directory"
        />
        <StatTile label="Conversations" value={String(data.active_threads)} />
      </div>

      {/* Volume */}
      <VolumeChart data={data.volume} />

      {/* Top questions */}
      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: "22px 24px" }}>
        <p style={{ fontSize: 14, color: "#111", margin: "0 0 16px" }}>Top questions</p>
        {data.top_questions.length === 0 ? (
          <p style={{ fontSize: 13, color: "#a3a3a3", margin: 0 }}>No questions yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.top_questions.map((q, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : "1px solid #f0f0f0",
                }}
              >
                <span style={{ fontSize: 13, color: "#a3a3a3", width: 20, flexShrink: 0 }}>{i + 1}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {q.question}
                </span>
                <span style={{ fontSize: 13, color: "#6b6b6b", flexShrink: 0 }}>
                  {q.count}×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
