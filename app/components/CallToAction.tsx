"use client";

import Link from "next/link";

export default function CallToAction() {

  return (
    <section
      id="get-started"
      style={{
        background: "#0f0f0f",
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
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            color: "#f0f0f0",
            marginBottom: "var(--space-4)",
            maxWidth: 600,
          }}
        >
          Give your team
          <br />
          superpowers.
        </h2>

        <p
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            maxWidth: 440,
            marginBottom: "var(--space-8)",
          }}
        >
          Connect your Google Workspace and Notion. Your organization&apos;s
          knowledge, one question away.
        </p>

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

        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.38)",
            marginTop: "var(--space-4)",
          }}
        >
          No credit card required. Set up in under 5 minutes.
        </p>
      </div>
    </section>
  );
}
