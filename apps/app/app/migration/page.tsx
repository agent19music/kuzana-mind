import Link from "next/link";

export const metadata = {
  title: "Brand migration notice — Athena",
  description: "Official notice regarding the transition from Kuzana Mind to Athena.",
};

export default function MigrationPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8f8f8",
        padding: "64px 24px 96px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e9e9e9",
          padding: "32px 28px",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: "#6c6c6c" }}>Effective date: August 12, 2026</p>
        <h1
          style={{
            marginTop: 16,
            marginBottom: 20,
            fontSize: "clamp(30px, 4vw, 44px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#141414",
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
              background: "#111111",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            Home
          </Link>
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 40,
              borderRadius: 9999,
              padding: "0 18px",
              border: "1px solid #d8d8d8",
              color: "#1a1a1a",
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            Login
          </Link>
        </div>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "#3f3f3f", marginBottom: 18 }}>
          Kuzana Mind has been renamed to Athena. This update is intended to align brand identity
          with the current scope of our product and with our long-term enterprise positioning
          strategy.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "#3f3f3f", marginBottom: 18 }}>
          This change is administrative in nature and does not alter customer entitlements, service
          continuity, confidentiality commitments, data-processing controls, or existing contractual
          responsibilities except where expressly updated in writing.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "#3f3f3f", marginBottom: 28 }}>
          Going forward, Athena will serve as the official name across the application interface,
          onboarding collateral, sales communications, and support documentation in order to improve
          market clarity and strengthen client confidence.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 40,
              borderRadius: 9999,
              padding: "0 18px",
              background: "#111111",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            Back to home
          </Link>
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 40,
              borderRadius: 9999,
              padding: "0 18px",
              border: "1px solid #d8d8d8",
              color: "#1a1a1a",
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
