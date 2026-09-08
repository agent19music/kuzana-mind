import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athena.uzskicorp.agency";

export const metadata = {
  title: "Welcome — Athena",
  description: "Your Athena subscription is ready.",
};

export default function WelcomePage() {
  return (
    <>
      <Nav />
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 80px",
          background: "var(--background)",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--foreground-subtle)",
              marginBottom: 12,
            }}
          >
            You&apos;re in
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Welcome to Athena.
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--foreground-muted)",
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Your checkout completed. Open the app to finish setup and start
            asking.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <a
              href={`${APP_URL}/dashboard`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                padding: "0 24px",
                borderRadius: 9999,
                background: "var(--foreground)",
                color: "var(--background)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Go to dashboard
            </a>
            <Link
              href="/#pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                padding: "0 24px",
                borderRadius: 9999,
                border: "1px solid var(--border-strong)",
                color: "var(--foreground)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Back to pricing
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
