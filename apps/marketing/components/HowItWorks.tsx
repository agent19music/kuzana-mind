const steps = [
  {
    n: "01",
    label: "Deploy on your compute",
    body: "Run Athena where your security team expects it — your cloud, your VPC, your rules. Proprietary knowledge does not need a detour through a consumer AI product.",
  },
  {
    n: "02",
    label: "Index inside your perimeter",
    body: "Connect Google Workspace, Notion, and uploads. Documents are chunked and indexed under your access model, with sync that stays under admin control.",
  },
  {
    n: "03",
    label: "Ask with citations",
    body: "Staff get grounded answers with links back to source — so decisions stay auditable and knowledge never becomes an anonymous chatbot reply.",
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
          Private by design. Operational in days.
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
