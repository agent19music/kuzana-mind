"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 72,
        display: "flex",
        alignItems: "center",
        background: scrolled ? "var(--surface)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border)" : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "background 200ms ease-out, border-color 200ms ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--space-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}
        >
          <Image
            src="/kuzana-mind-logo.png"
            alt="Athena"
            width={64}
            height={64}
            style={{
              filter: scrolled ? "none" : "invert(1)",
              transition: "filter 200ms ease-out",
            }}
          />
          <span
            style={{
              color: scrolled ? "var(--foreground)" : "#ffffff",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.01em",
              transition: "color 200ms ease-out",
            }}
          >
            Athena
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Link
            href="/chat"
            style={{
              textDecoration: "none",
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 9999,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 500,
              transition: "background 200ms ease-out, color 200ms ease-out, border-color 200ms ease-out",
              ...(scrolled
                ? {
                    background: "var(--foreground)",
                    color: "var(--background)",
                    border: "none",
                  }
                : {
                    background: "transparent",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.55)",
                  }),
            }}
          >
            Ask a question
          </Link>

          <Link
            href="/chat"
            style={{
              textDecoration: "none",
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 9999,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 200ms ease-out",
              background: scrolled ? "var(--inset-surface)" : "rgba(255,255,255,0.12)",
              color: scrolled ? "var(--foreground)" : "#ffffff",
              border: scrolled ? "1px solid var(--border-strong)" : "1px solid rgba(255,255,255,0.3)",
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
