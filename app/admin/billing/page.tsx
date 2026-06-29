"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import DashboardShell from "../../components/DashboardShell";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    priceMonthly: 0,
    chunks: "2,500",
    members: "20",
    sources: "2",
    features: ["Notion + Google Docs", "Manual sync", "7-day history", "Community support"],
    current: true,
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$10",
    priceMonthly: 10,
    chunks: "25,000",
    members: "100",
    sources: "Unlimited",
    features: ["All starter features", "Google Drive connector", "Weekly auto-sync", "Audit logs", "Priority support", "Custom domain"],
    current: false,
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    priceMonthly: null,
    chunks: "Unlimited",
    members: "Unlimited",
    sources: "Unlimited",
    features: ["All Pro features", "SSO / SAML", "99.9% SLA", "Dedicated sync", "On-prem option", "Custom integrations"],
    current: false,
    highlight: false,
  },
];

const BILLING_HISTORY = [
  { date: "Jun 1, 2025", description: "Starter plan", amount: "$0.00", status: "Free" },
  { date: "May 1, 2025", description: "Starter plan", amount: "$0.00", status: "Free" },
  { date: "Apr 1, 2025", description: "Starter plan", amount: "$0.00", status: "Free" },
];

function UpgradeModal({ plan, onClose }: { plan: typeof PLANS[1]; onClose: () => void }) {
  const [step, setStep] = useState<"review" | "payment" | "done">("review");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: 480,
          maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 28px 20px",
            borderBottom: "1px solid #F0F0F0",
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", margin: "4px 0 0" }}>
              {plan.name} · {plan.price}/mo
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#ccc", lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {step === "done" ? (
          <div style={{ padding: "48px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontSize: 20, fontWeight: 400, color: "#111", letterSpacing: "-0.02em", marginBottom: 8 }}>
              You&apos;re on {plan.name}
            </h3>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 32 }}>
              Your plan has been upgraded. New limits are active immediately.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 32px",
                fontSize: 14,
                fontWeight: 400,
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)",
              }}
            >
              Done
            </button>
          </div>
        ) : step === "review" ? (
          <div>
            {/* What you get */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  [`${plan.chunks} document chunks`, "Up from 2,500"],
                  [`${plan.members} team members`, "Up from 20"],
                  ["Google Drive connector", "Full Shared Drive sync"],
                  ["Weekly auto-sync", "vs. manual only"],
                  ["Audit logs", "All query history"],
                ].map(([title, sub]) => (
                  <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#22c55e", flexShrink: 0, fontSize: 15, lineHeight: 1.3 }}>✓</span>
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 400, color: "#222" }}>{title}</span>
                      <span style={{ fontSize: 12, color: "#aaa", marginLeft: 8 }}>{sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing summary */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: "#888" }}>Pro plan · per user / month</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111" }}>{plan.price} / user / mo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5, color: "#888" }}>Billed today</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111" }}>{plan.price}</span>
              </div>
            </div>

            <div style={{ padding: "20px 28px" }}>
              <button
                onClick={() => setStep("payment")}
                style={{
                  width: "100%",
                  background: "#2563EB",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  padding: "13px",
                  fontSize: 14,
                  fontWeight: 400,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(37,99,235,0.25)",
                  letterSpacing: "-0.01em",
                }}
              >
                Continue to payment →
              </button>
              <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 10 }}>
                Cancel anytime. No lock-in.
              </p>
            </div>
          </div>
        ) : (
          /* Payment step */
          <div style={{ padding: "24px 28px" }}>
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>Payment details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 400, color: "#666", display: "block", marginBottom: 6 }}>
                  Card number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={e => setCard(c => ({ ...c, number: e.target.value }))}
                  maxLength={19}
                  style={{
                    width: "100%",
                    border: "1px solid #E2E2E2",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#111",
                    outline: "none",
                    background: "#FAFAFA",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 400, color: "#666", display: "block", marginBottom: 6 }}>
                    Expiry
                  </label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={card.expiry}
                    onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))}
                    maxLength={7}
                    style={{
                      width: "100%",
                      border: "1px solid #E2E2E2",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#111",
                      outline: "none",
                      background: "#FAFAFA",
                      boxSizing: "border-box",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 400, color: "#666", display: "block", marginBottom: 6 }}>
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="•••"
                    value={card.cvc}
                    onChange={e => setCard(c => ({ ...c, cvc: e.target.value }))}
                    maxLength={4}
                    style={{
                      width: "100%",
                      border: "1px solid #E2E2E2",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#111",
                      outline: "none",
                      background: "#FAFAFA",
                      boxSizing: "border-box",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep("done")}
              style={{
                width: "100%",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "13px",
                fontSize: 14,
                fontWeight: 400,
                cursor: "pointer",
                letterSpacing: "-0.01em",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)",
              }}
            >
              Upgrade to {plan.name} — {plan.price}/mo
            </button>
            <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 10 }}>
              Secured · 256-bit encryption
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GradientBanner() {
  const ref = useRef<HTMLCanvasElement>(null);
  // ponytail: canvas gradient animation — framer shader not available in React, this is equivalent
  useAnimationFrame((t) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const s = t / 4000;

    // Three animated radial blobs
    const blobs = [
      { x: w * (0.15 + 0.25 * Math.sin(s * 0.7)), y: h * (0.5 + 0.4 * Math.cos(s * 0.5)), r: w * 0.6, color: "rgba(255,255,255,0.55)" },
      { x: w * (0.55 + 0.3 * Math.cos(s * 0.9)), y: h * (0.5 + 0.35 * Math.sin(s * 0.6)), r: w * 0.55, color: "rgba(120,230,220,0.70)" },
      { x: w * (0.75 + 0.2 * Math.sin(s * 1.1)), y: h * (0.5 + 0.4 * Math.cos(s * 0.8)), r: w * 0.5, color: "rgba(100,210,255,0.60)" },
    ];

    ctx.clearRect(0, 0, w, h);
    // Base: Tiffany blue
    ctx.fillStyle = "#3ecfbf";
    ctx.fillRect(0, 0, w, h);

    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });

  return (
    <canvas
      ref={ref}
      width={480}
      height={160}
      style={{ width: "100%", height: 140, display: "block", borderRadius: 10 }}
    />
  );
}

function ProCard({ plan, onUpgrade }: { plan: typeof PLANS[1]; onUpgrade: () => void }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8E8E8",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      {/* Animated gradient banner */}
      <div style={{ position: "relative", margin: "10px 10px 0" }}>
        <GradientBanner />
        {/* Overlay: plan name + badge + subtitle */}
        <div style={{ position: "absolute", inset: 0, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span style={{ fontSize: 22, fontWeight: 400, color: "#fff", letterSpacing: "-0.02em" }}>Pro</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "#fff",
                background: "rgba(0,0,0,0.55)",
                borderRadius: 20,
                padding: "3px 9px",
              }}
            >
              Popular
            </span>
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 400 }}>Unlock more powerful features</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 22px 22px", display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
        {/* Price */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 42, fontWeight: 400, letterSpacing: "-0.04em", color: "#111" }}>{plan.price}</span>
          <span style={{ fontSize: 13.5, color: "#999", marginLeft: 4 }}>/month, per user</span>
        </div>

        {/* CTA */}
        <button
          onClick={onUpgrade}
          style={{
            width: "100%",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "13px",
            fontSize: 14,
            fontWeight: 400,
            cursor: "pointer",
            marginBottom: 24,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          Get Started
        </button>

        {/* Features */}
        <p style={{ fontSize: 13, color: "#111", fontWeight: 400, margin: "0 0 14px" }}>What&apos;s Included</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plan.features.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* 4-point sparkle */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="#111">
                <path d="M6.5 0 L7.2 5.8 L13 6.5 L7.2 7.2 L6.5 13 L5.8 7.2 L0 6.5 L5.8 5.8 Z" />
              </svg>
              <span style={{ fontSize: 13, color: "#555" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [modal, setModal] = useState<typeof PLANS[1] | null>(null);

  const used = { chunks: 1247, maxChunks: 2500, members: 12, maxMembers: 20 };

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, margin: 0 }}>
              Billing
            </h1>
          </div>

          {/* Current plan */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 12,
              padding: "28px 32px",
              marginBottom: 32,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", margin: 0 }}>
                  Starter · Free
                </p>
              </div>
              <button
                onClick={() => setModal(PLANS[1])}
                style={{
                  background: "#2563EB",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontSize: 13.5,
                  fontWeight: 400,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(37,99,235,0.2)",
                  letterSpacing: "-0.01em",
                }}
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Usage bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {[
                { label: "Document chunks", used: used.chunks, max: used.maxChunks, unit: "chunks" },
                { label: "Team members", used: used.members, max: used.maxMembers, unit: "members" },
              ].map(bar => {
                const pct = Math.min((bar.used / bar.max) * 100, 100);
                const warn = pct > 75;
                return (
                  <div key={bar.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, color: "#888", fontWeight: 400 }}>{bar.label}</span>
                      <span style={{ fontSize: 12.5, color: warn ? "#D97706" : "#aaa" }}>
                        {bar.used.toLocaleString()} / {bar.max.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "#F0F0F0", borderRadius: 99, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: warn
                            ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                            : "linear-gradient(90deg, #2563EB, #60A5FA)",
                          borderRadius: 99,
                          transition: "width 600ms ease-out",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan comparison */}
          <h2 style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", marginBottom: 20 }}>
            Plans
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
            {PLANS.map(plan => plan.highlight ? (
              <ProCard key={plan.id} plan={plan} onUpgrade={() => setModal(plan)} />
            ) : (
              <div
                key={plan.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E8E8",
                  borderRadius: 12,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  position: "relative",
                }}
              >
                <p style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.03em", color: "#111", margin: "0 0 4px" }}>
                  {plan.price}
                  {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa" }}>/mo</span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 24px" }}>
                  {plan.chunks} chunks · {plan.members} members
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#22c55e", fontSize: 13 }}>✓</span>
                      <span style={{ fontSize: 13, color: "#555" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {plan.current ? (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 400,
                      color: "#aaa",
                      padding: "10px",
                      border: "1px solid #F0F0F0",
                      borderRadius: 8,
                    }}
                  >
                    Current plan
                  </div>
                ) : plan.priceMonthly === null ? (
                  <a
                    href="mailto:hi@athena.app"
                    style={{
                      display: "block",
                      textAlign: "center",
                      fontSize: 13.5,
                      fontWeight: 400,
                      color: "#444",
                      background: "#F4F4F4",
                      border: "1px solid #E2E2E2",
                      borderRadius: 8,
                      padding: "11px",
                      textDecoration: "none",
                      cursor: "pointer",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)",
                    }}
                  >
                    Contact sales
                  </a>
                ) : (
                  <button
                    onClick={() => setModal(plan)}
                    style={{
                      width: "100%",
                      fontSize: 13.5,
                      fontWeight: 400,
                      color: "#fff",
                      background: "#111",
                      border: "none",
                      borderRadius: 8,
                      padding: "11px",
                      cursor: "pointer",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Billing history */}
          <h2 style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", marginBottom: 20 }}>
            Billing history
          </h2>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {BILLING_HISTORY.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px 80px",
                  padding: "14px 24px",
                  alignItems: "center",
                  borderBottom: i < BILLING_HISTORY.length - 1 ? "1px solid #F6F6F6" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "#888" }}>{row.date}</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#222" }}>{row.description}</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111" }}>{row.amount}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: "#15803d",
                    background: "#f0fdf4",
                    borderRadius: 20,
                    padding: "3px 8px",
                    textAlign: "center",
                  }}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>

        </div>
      </main>

      {modal && <UpgradeModal plan={modal} onClose={() => setModal(null)} />}
    </DashboardShell>
  );
}
