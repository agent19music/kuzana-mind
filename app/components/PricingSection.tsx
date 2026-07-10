"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    tagline: "For small teams getting started",
    features: [
      "Notion + Google Docs",
      "2,500 knowledge chunks",
      "Up to 20 members",
      "Manual sync",
      "7-day history",
      "Community support",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$10",
    period: "/ mo",
    tagline: "For growing teams that need more",
    features: [
      "All starter features",
      "25,000 knowledge chunks",
      "Up to 100 members",
      "Google Drive connector",
      "Weekly auto-sync",
      "Audit logs",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    tagline: "For orgs with serious requirements",
    features: [
      "All Pro features",
      "Unlimited everything",
      "SSO / SAML",
      "99.9% SLA",
      "Dedicated sync",
      "On-prem option",
    ],
    highlight: false,
  },
];

const CheckIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    style={{ flexShrink: 0, marginTop: 3 }}
  >
    <path
      d="M2 6.5L5 9.5L11 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        background: "var(--background)",
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
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "0.01em",
            color: "var(--foreground-subtle)",
            marginBottom: "var(--space-3)",
          }}
        >
          Pricing
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            fontSize: "clamp(28px, 3.5vw, 40px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "var(--foreground)",
            marginBottom: "var(--space-4)",
            maxWidth: 480,
          }}
        >
          Pricing that scales with your team.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "var(--foreground-muted)",
            marginBottom: "var(--space-12)",
            maxWidth: 440,
            lineHeight: 1.6,
          }}
        >
          Start free. Upgrade when you're ready.
        </motion.p>

        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: "var(--space-6)", alignItems: "stretch" }}
        >
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: plan.highlight ? "var(--foreground)" : "var(--card)",
                border: plan.highlight
                  ? "none"
                  : "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-8)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: "var(--space-6)" }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    color: plan.highlight
                      ? "rgba(255,255,255,0.45)"
                      : "var(--foreground-subtle)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {plan.name}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: "var(--space-2)" }}>
                  <span
                    style={{
                      fontSize: "clamp(34px, 4vw, 46px)",
                      fontWeight: 400,
                      letterSpacing: "-0.03em",
                      color: plan.highlight ? "#ffffff" : "var(--foreground)",
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      style={{
                        fontSize: 14,
                        color: plan.highlight
                          ? "rgba(255,255,255,0.4)"
                          : "var(--foreground-subtle)",
                      }}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: plan.highlight
                      ? "rgba(255,255,255,0.5)"
                      : "var(--foreground-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {plan.tagline}
                </p>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: plan.highlight
                    ? "rgba(255,255,255,0.10)"
                    : "var(--border)",
                  marginBottom: "var(--space-6)",
                }}
              />

              {/* Feature list — flex-grow pushes CTA to bottom */}
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  flexGrow: 1,
                  marginBottom: "var(--space-8)",
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      fontWeight: 400,
                      color: plan.highlight
                        ? "rgba(255,255,255,0.75)"
                        : "var(--foreground-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        color: plan.highlight
                          ? "rgba(255,255,255,0.4)"
                          : "var(--foreground-subtle)",
                      }}
                    >
                      <CheckIcon />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA — always at the bottom */}
              <Link
                href="/waitlist"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 44,
                  borderRadius: 9999,
                  fontSize: 14,
                  fontWeight: 400,
                  textDecoration: "none",
                  transition: "opacity 200ms ease-out",
                  flexShrink: 0,
                  ...(plan.highlight
                    ? {
                        background: "#ffffff",
                        color: "#171717",
                      }
                    : {
                        background: "transparent",
                        color: "var(--foreground)",
                        border: "1px solid var(--border-strong)",
                      }),
                }}
              >
                Join waitlist
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
