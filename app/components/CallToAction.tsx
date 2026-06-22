import Link from "next/link";

export default function CallToAction() {
  return (
    <section
      style={{
        background: "var(--foreground)",
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
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            color: "var(--background)",
            marginBottom: "var(--space-6)",
            maxWidth: 600,
          }}
        >
          Stop searching.
          <br />
          Start knowing.
        </h2>

        <p
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            maxWidth: 380,
            marginBottom: "var(--space-8)",
          }}
        >
          Your team's institutional knowledge, one question away.
        </p>

        <Link
          href="/chat"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            height: 52,
            borderRadius: 9999,
            background: "#ffffff",
            color: "#171717",
            fontSize: 15,
            fontWeight: 500,
            padding: "0 32px",
            transition: "background 200ms ease-out",
          }}
          className="hover:bg-[#e5e5e5]"
        >
          Ask your first question →
        </Link>
      </div>
    </section>
  );
}
