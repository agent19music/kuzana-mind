import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata = {
  title: "Brand migration notice — Athena",
  description: "Official notice regarding the transition from Kuzana Mind to Athena.",
};

export default function MigrationPage() {
  return (
    <>
      <Nav />
      <main
        style={{
          paddingTop: 120,
          paddingBottom: 128,
          minHeight: "100vh",
          background: "var(--background)",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--foreground-subtle)", marginBottom: 16 }}>
            Effective date: August 12, 2026
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
              marginBottom: 24,
              fontWeight: 400,
            }}
          >
            Brand migration notice
          </h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                borderRadius: 9999,
                padding: "0 18px",
                background: "var(--foreground)",
                color: "var(--background)",
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              Home
            </Link>
            <Link
              href="/waitlist"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                borderRadius: 9999,
                padding: "0 18px",
                border: "1px solid var(--border-strong)",
                color: "var(--foreground)",
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              Get started
            </Link>
          </div>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--foreground-muted)",
              marginBottom: 20,
            }}
          >
            Kuzana Mind has been renamed to Athena. This rebrand reflects a clarified market
            position, a broader enterprise readiness posture, and a more precise representation of
            our knowledge intelligence platform.
          </p>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--foreground-muted)",
              marginBottom: 20,
            }}
          >
            The transition is nomenclature-only and does not, by itself, amend customer ownership
            rights, data governance controls, contractual service obligations, or existing security
            commitments. All references to Kuzana Mind across commercial materials, support
            channels, and product surfaces are being migrated to Athena in a phased and orderly
            manner.
          </p>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--foreground-muted)",
            }}
          >
            In practical terms, Athena better communicates our core value proposition: helping teams
            locate trusted internal knowledge and accountable human expertise with speed and
            confidence. This naming standard will be used prospectively across client-facing
            communications to improve consistency, memorability, and enterprise adoption.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
