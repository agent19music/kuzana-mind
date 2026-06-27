import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { FloatingPaths } from "@/components/floating-paths";

const clerkAppearance = {
  variables: {
    colorPrimary: "#171717",
    colorBackground: "#ffffff",
    colorText: "#171717",
    colorTextSecondary: "#52525b",
    colorInputBackground: "#f4f4f5",
    colorInputText: "#171717",
    colorNeutral: "#171717",
    borderRadius: "8px",
    spacingUnit: "1.1rem",
    fontFamily: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyButtons: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { width: "100%" },
    headerTitle: { fontSize: "20px", fontWeight: "600", letterSpacing: "-0.01em" },
    headerSubtitle: { fontSize: "14px", color: "#52525b" },
    formButtonPrimary: {
      backgroundColor: "#171717",
      fontSize: "15px",
      fontWeight: "500",
      borderRadius: "9999px",
      height: "48px",
      "&:hover": { backgroundColor: "#2a2a2a" },
    },
    formFieldInput: { borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "15px", height: "48px", background: "#f4f4f5" },
    footerActionLink: { color: "#171717", fontWeight: "500" },
    identityPreviewText: { color: "#171717" },
    dividerText: { color: "#a1a1aa" },
    dividerLine: { background: "#e4e4e7" },
    socialButtonsBlockButton: { border: "1px solid #e4e4e7", borderRadius: "8px", height: "48px", background: "#ffffff" },
    socialButtonsBlockButtonText: { color: "#171717", fontWeight: "500" },
  },
};

export default function LoginPage() {
  return (
    <main style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", minHeight: "100svh", width: "100vw", overflow: "hidden" }}>
      {/* Left panel — light */}
      <div
        style={{
          position: "relative",
          background: "#f5f5f5",
          borderRight: "1px solid #e4e4e7",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          overflow: "hidden",
        }}
        className="hidden lg:flex"
      >
        {/* Bottom fade */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 60%, #f5f5f5 100%)",
            zIndex: 1,
          }}
        />

        {/* Logo */}
        <Link
          href="/"
          style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <Image src="/athena-mind-logo.png" alt="Athena" width={28} height={28} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "#171717" }}>Athena</span>
        </Link>

        {/* Bottom copy */}
        <div style={{ position: "relative", zIndex: 2, marginTop: "auto" }}>
          <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "#171717", lineHeight: 1.35, marginBottom: 12 }}>
            "Stop losing hours searching
            <br />
            for answers your docs already have."
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa", fontFamily: "monospace" }}>~ Kaila M., Operations Lead</p>
        </div>

        {/* Floating paths — dark on light */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, color: "#171717" }}>
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 48px",
          background: "#ffffff",
          minHeight: "100svh",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Subtle glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
            pointerEvents: "none",
          }}
        />

        {/* Back link */}
        <Link
          href="/"
          style={{
            position: "absolute",
            top: 28,
            left: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "#a1a1aa",
            textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>

        {/* Mobile logo */}
        <Link
          href="/"
          className="lg:hidden"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}
        >
          <Image src="/athena-mind-logo.png" alt="Athena" width={24} height={24} />
          <span style={{ fontWeight: 600, fontSize: 14, color: "#171717" }}>Athena</span>
        </Link>

        {/* Headline above Clerk form */}
        <div style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#171717", marginBottom: 6, lineHeight: 1.2 }}>
              Welcome back.
            </h1>
            <p style={{ fontSize: 14, color: "#71717a", lineHeight: 1.6 }}>
              Your team&apos;s knowledge is waiting for you.
            </p>
          </div>

          <SignIn
            appearance={clerkAppearance}
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/register"
          />
        </div>
      </div>
    </main>
  );
}
