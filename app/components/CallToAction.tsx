"use client";

import { useState } from "react";

export default function CallToAction() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to actual waitlist/lead endpoint
    setSubmitted(true);
  }

  return (
    <section
      id="get-started"
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
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            maxWidth: 440,
            marginBottom: "var(--space-8)",
          }}
        >
          Connect your Google Workspace and Notion. Your organization's
          knowledge, one question away.
        </p>

        {submitted ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 52,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "0 28px",
              fontSize: 15,
              fontWeight: 500,
              color: "#ffffff",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3.75 9.75L7.5 13.5L14.25 4.5"
                stroke="#34A853"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            We'll be in touch soon.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              style={{
                height: 52,
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 400,
                padding: "0 24px",
                outline: "none",
                fontFamily: "var(--font-sans)",
                minWidth: 260,
                transition: "border-color 200ms ease-out",
              }}
            />
            <button
              type="submit"
              style={{
                height: 52,
                borderRadius: 9999,
                background: "#ffffff",
                color: "#171717",
                fontSize: 15,
                fontWeight: 500,
                padding: "0 32px",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "background 200ms ease-out",
              }}
              className="hover:bg-[#e5e5e5]"
            >
              Get started
            </button>
          </form>
        )}

        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.3)",
            marginTop: "var(--space-4)",
          }}
        >
          No credit card required. Set up in under 5 minutes.
        </p>
      </div>
    </section>
  );
}
