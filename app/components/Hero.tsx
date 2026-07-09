import Image from "next/image";
import Link from "next/link";
import AthenaBadge from "./AthenaBadge";

export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        minHeight: 640,
        overflow: "hidden",
      }}
    >
      {/* Photo */}
      <Image
        src="/hero-image.png"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      {/* Flat dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.50)",
        }}
      />

      {/* Content — centred */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 var(--space-6)",
        }}
      >
        <AthenaBadge />

        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(48px, 9vw, 104px)",
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: "var(--space-6)",
            maxWidth: 900,
          }}
        >
          Your team's
          <br />
          second brain.
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.82)",
            fontSize: "clamp(16px, 2vw, 20px)",
            fontWeight: 400,
            lineHeight: 1.6,
            marginBottom: "var(--space-4)",
            maxWidth: 500,
          }}
        >
          Connect your Google Workspace and Notion. Give every team member
          instant answers from your organization's knowledge — no searching, no
          asking around.
        </p>

        {/* Integration badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: "var(--space-8)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Workspace
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.93 3.307 -0.683 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.077 1.36s0 3.5 -4.853 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
            </svg>
            Notion
          </span>
        </div>

        {/* Pill CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/waitlist"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "#ffffff",
              color: "#171717",
              fontSize: 15,
              fontWeight: 400,
              padding: "0 32px",
              transition: "background 200ms ease-out",
            }}
            className="hover:!bg-[#e5e5e5]"
          >
            Get started
          </Link>
          <a
            href="#how-it-works"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "transparent",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 400,
              padding: "0 32px",
              border: "1px solid rgba(255,255,255,0.55)",
              transition:
                "border-color 200ms ease-out, background 200ms ease-out",
            }}
            className="hover:!border-transparent hover:!bg-white/10"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
