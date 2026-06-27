import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

const clerkAppearance = {
  variables: {
    colorPrimary: "#171717",
    colorBackground: "#fafafa",
    colorText: "#171717",
    colorTextSecondary: "#52525b",
    colorInputBackground: "#f5f5f5",
    colorInputText: "#171717",
    colorNeutral: "#171717",
    borderRadius: "8px",
    fontFamily: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyButtons: "var(--font-manrope), -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15px",
  },
  elements: {
    card: {
      boxShadow: "none",
      border: "1px solid #e8e8e8",
      borderRadius: "12px",
      padding: "32px",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: "600",
      letterSpacing: "-0.01em",
    },
    headerSubtitle: {
      fontSize: "14px",
      color: "#52525b",
    },
    formButtonPrimary: {
      backgroundColor: "#171717",
      fontSize: "15px",
      fontWeight: "500",
      borderRadius: "9999px",
      height: "48px",
      "&:hover": { backgroundColor: "#2a2a2a" },
    },
    formFieldInput: {
      borderRadius: "8px",
      border: "1px solid #e8e8e8",
      fontSize: "15px",
      height: "48px",
    },
    footerActionLink: {
      color: "#171717",
      fontWeight: "500",
    },
    identityPreviewText: { color: "#171717" },
    dividerText: { color: "#a1a1aa" },
    socialButtonsBlockButton: {
      border: "1px solid #e8e8e8",
      borderRadius: "8px",
      height: "48px",
    },
  },
};

export default function RegisterPage() {
  return (
    <div
      style={{
        minHeight: "100svh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-8)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/kuzana-mind-logo.png" alt="Kuzana Mind" width={40} height={40} />
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
            }}
          >
            Kuzana Mind
          </span>
        </Link>

        <SignUp
          appearance={clerkAppearance}
          fallbackRedirectUrl="/onboarding"
          signInUrl="/login"
        />
      </div>
    </div>
  );
}
