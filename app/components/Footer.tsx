"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light"
    );
  }

  return (
    <footer
      ref={footerRef}
      style={{
        background: isDark ? "#1a1a1a" : "var(--surface)",
        borderTop: `1px solid ${isDark ? "#292524" : "var(--border)"}`,
        padding: "var(--space-8) 0",
        transition: "background 500ms ease-out, border-color 500ms ease-out",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--space-6)",
        }}
      >
        {/* Top row: brand + nav + theme toggle */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            paddingBottom: "var(--space-8)",
          }}
        >
          {/* Brand */}
          <Image
            src="/athena-mind-logo.png"
            alt="Athena"
            width={48}
            height={48}
            style={{ display: "block" }}
          />

          {/* Nav links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-6)",
            }}
          >
            <a
              href="#features"
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: isDark ? "#a8a29e" : "var(--foreground-muted)",
                textDecoration: "none",
                transition: "color 200ms ease-out",
              }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: isDark ? "#a8a29e" : "var(--foreground-muted)",
                textDecoration: "none",
                transition: "color 200ms ease-out",
              }}
            >
              How it works
            </a>
            <a
              href="/privacy"
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: isDark ? "#a8a29e" : "var(--foreground-muted)",
                textDecoration: "none",
                transition: "color 200ms ease-out",
              }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: isDark ? "#a8a29e" : "var(--foreground-muted)",
                textDecoration: "none",
                transition: "color 200ms ease-out",
              }}
            >
              Terms
            </a>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              border: `1px solid ${isDark ? "#44403c" : "var(--border-strong)"}`,
              background: isDark ? "#292524" : "var(--inset-surface)",
              color: isDark ? "#fafaf9" : "var(--foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition:
                "background 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
            }}
          >
            {isDark ? (
              /* Sun icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Divider + bottom row */}
        <div
          className={`transition-all duration-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
          style={{
            borderTop: `1px solid ${isDark ? "#292524" : "var(--border-strong)"}`,
            paddingTop: "var(--space-8)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            transitionDelay: "200ms",
          }}
        >
          {/* Uzski Corp attribution */}
          <a
            href="https://uzskicorp.agency"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 400,
              color: isDark ? "#a8a29e" : "var(--foreground-muted)",
              textDecoration: "none",
              transition: "color 200ms ease-out",
            }}
          >
            A product of Uzski Corp
            <Image
              src="https://pub-0a313ba028f9423cba4b9803d081b5db.r2.dev/app%20ui/uzski-logo-nobg.png"
              alt="Uzski Corp"
              width={32}
              height={32}
              style={{ borderRadius: 9999 }}
              unoptimized
            />
          </a>

          {/* Copyright */}
          <span
            style={{
              fontSize: 13,
              color: isDark ? "#78716c" : "var(--foreground-subtle)",
              transition: "color 200ms ease-out",
            }}
          >
            &copy; {new Date().getFullYear()} Athena. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
