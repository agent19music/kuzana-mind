const steps = [
  {
    n: "01",
    label: "Connect your sources",
    body: "Link your Google Workspace, Notion, or both. We handle permissions and never store raw credentials.",
  },
  {
    n: "02",
    label: "We index everything",
    body: "Your documents are chunked, embedded, and indexed automatically. New content syncs weekly — zero maintenance.",
  },
  {
    n: "03",
    label: "Your team asks",
    body: "Anyone on the team can ask in plain language and get the exact answer with a link to the source — or the right person to talk to.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
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
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "var(--foreground)",
            marginBottom: "var(--space-12)",
          }}
        >
          Up and running in minutes.
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
                  fontWeight: 400,
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
                  fontWeight: 400,
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
