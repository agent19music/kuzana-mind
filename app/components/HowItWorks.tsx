const steps = [
  {
    n: "01",
    label: "You ask",
    body: "Type your question in plain language — no keywords, no filters.",
  },
  {
    n: "02",
    label: "Brain searches",
    body: "Semantic search across all indexed documentation, ranked by relevance.",
  },
  {
    n: "03",
    label: "You get an answer",
    body: "The exact passage and source link — or the right person to contact.",
  },
];

export default function HowItWorks() {
  return (
    <section
      style={{
        background: "var(--background)",
        borderTop: "1px solid var(--border-strong)",
        padding: "var(--space-32) 0",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--space-6)",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 40px)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "var(--foreground)",
            marginBottom: "var(--space-12)",
          }}
        >
          Three steps.
        </h2>

        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: "var(--space-12)" }}
        >
          {steps.map((s) => (
            <div key={s.n}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  color: "var(--foreground-subtle)",
                  marginBottom: "var(--space-4)",
                }}
              >
                {s.n}
              </p>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "var(--foreground)",
                  marginBottom: "var(--space-3)",
                }}
              >
                {s.label}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--foreground-muted)",
                  lineHeight: 1.65,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
