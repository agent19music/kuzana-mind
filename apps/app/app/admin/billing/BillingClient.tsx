"use client";

import { useState } from "react";
import { Button } from "../../../components/Button";
import DashboardShell from "../../../components/DashboardShell";

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

type Usage = { chunks: number; maxChunks: number; members: number; maxMembers: number };

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
          <h2 style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", margin: 0 }}>
            {plan.name} · {plan.price}/mo
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            style={{ fontSize: 20, color: "#ccc", lineHeight: 1, width: 44, height: 44 }}
          >
            ×
          </Button>
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
            <Button onClick={onClose} variant="primary-dark" size="lg">
              Done
            </Button>
          </div>
        ) : step === "review" ? (
          <div>
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

            <div style={{ padding: "20px 28px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: "#888" }}>Pro plan · per user / month</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111", fontVariantNumeric: "tabular-nums" }}>{plan.price} / user / mo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5, color: "#888" }}>Billed today</span>
                <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111", fontVariantNumeric: "tabular-nums" }}>{plan.price}</span>
              </div>
            </div>

            <div style={{ padding: "20px 28px" }}>
              <Button
                onClick={() => setStep("payment")}
                variant="primary"
                size="lg"
                style={{ width: "100%" }}
              >
                Continue to payment →
              </Button>
              <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 10 }}>
                Cancel anytime. No lock-in.
              </p>
            </div>
          </div>
        ) : (
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
                  className="payment-input"
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
                    fontVariantNumeric: "tabular-nums",
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
                    className="payment-input"
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
                      fontVariantNumeric: "tabular-nums",
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
                    className="payment-input"
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
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={() => setStep("done")}
              variant="primary-dark"
              size="lg"
              style={{ width: "100%" }}
            >
              Upgrade to {plan.name} — {plan.price}/mo
            </Button>
            <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 10 }}>
              Secured · 256-bit encryption
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Highlighted "Pro" plan card — dark, no banner. Mirrors the highlighted-card
// treatment in apps/marketing/components/PricingSection.tsx for visual
// consistency between the landing page and the in-app billing page.
function ProCard({ plan, onUpgrade }: { plan: typeof PLANS[1]; onUpgrade: () => void }) {
  return (
    <div
      style={{
        background: "#111",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 24px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ padding: "24px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 400, letterSpacing: "0.02em", color: "rgba(255,255,255,0.5)" }}>
              {plan.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "3px 9px" }}>
              Popular
            </span>
          </div>
          <span style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.03em", color: "#fff", fontVariantNumeric: "tabular-nums" }}>{plan.price}</span>
          <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>/month, per user</span>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 20 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, marginBottom: 28 }}>
          {plan.features.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{f}</span>
            </div>
          ))}
        </div>

        <Button onClick={onUpgrade} variant="secondary" style={{ width: "100%" }}>
          Get started
        </Button>
      </div>
    </div>
  );
}

export default function BillingClient({ used }: { used: Usage }) {
  const [modal, setModal] = useState<typeof PLANS[1] | null>(null);
  const [activeTab, setActiveTab] = useState<"pro" | "enterprise">("pro");

  return (
    <DashboardShell>
      <style>{`
        .billing-wrap { padding: 56px 48px 80px; }
        .billing-plan-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .billing-usage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .billing-plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 48px; }
        .billing-plans-mobile { display: none; margin-bottom: 48px; }
        .billing-history-row { display: grid; grid-template-columns: 120px 1fr 100px 80px; padding: 14px 24px; align-items: center; }
        .billing-history-amount { }

        @media (max-width: 768px) {
          .billing-wrap { padding: 28px 20px 64px; }
          .billing-plan-header { flex-direction: column; gap: 16px; align-items: stretch; }
          .billing-usage-grid { grid-template-columns: 1fr; }
          .billing-plans-grid { display: none; }
          .billing-plans-mobile { display: block; }
          .billing-history-row { grid-template-columns: 1fr auto; padding: 14px 16px; }
          .billing-history-amount { display: none; }
          .payment-input { font-size: 16px !important; }
        }
      `}</style>

      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div className="billing-wrap" style={{ maxWidth: 880, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.1, margin: 0, textWrap: "balance" } as React.CSSProperties}>
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
            <div className="billing-plan-header">
              <p style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", margin: 0 }}>
                Starter · Free
              </p>
              <Button onClick={() => setModal(PLANS[1])} variant="primary">
                Upgrade to Pro
              </Button>
            </div>

            {/* Usage bars */}
            <div className="billing-usage-grid">
              {[
                { label: "Document chunks", used: used.chunks, max: used.maxChunks },
                { label: "Team members", used: used.members, max: used.maxMembers },
              ].map(bar => {
                const pct = Math.min((bar.used / bar.max) * 100, 100);
                const warn = pct > 75;
                return (
                  <div key={bar.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, color: "#888", fontWeight: 400 }}>{bar.label}</span>
                      <span style={{ fontSize: 12.5, color: warn ? "#D97706" : "#aaa", fontVariantNumeric: "tabular-nums" }}>
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
          <h2 style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", marginBottom: 20, textWrap: "balance" } as React.CSSProperties}>
            Plans
          </h2>

          {/* Mobile: segmented tab + single card */}
          <div className="billing-plans-mobile">
            {/* Segmented control */}
            <div style={{ display: "flex", background: "#F0F0F0", borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {(["pro", "enterprise"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="btn-press"
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 14,
                    fontWeight: 400,
                    cursor: "pointer",
                    background: activeTab === tab ? "#fff" : "transparent",
                    color: activeTab === tab ? "#111" : "#888",
                    boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    transition: "background 150ms, color 150ms, box-shadow 150ms",
                  }}
                >
                  {tab === "pro" ? "Pro" : "Custom"}
                </button>
              ))}
            </div>

            {/* Active plan card */}
            {activeTab === "pro" ? (
              <ProCard plan={PLANS[1]} onUpgrade={() => setModal(PLANS[1])} />
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "28px 24px", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.03em", color: "#111", margin: "0 0 4px" }}>
                  Custom
                </p>
                <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 24px", lineHeight: 1.5 }}>
                  Unlimited chunks · Unlimited members
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, flex: 1 }}>
                  {PLANS[2].features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#22c55e", fontSize: 13 }}>✓</span>
                      <span style={{ fontSize: 13, color: "#555" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Button href="mailto:hi@athena.app" variant="primary-dark" style={{ width: "100%" }}>
                  Contact sales
                </Button>
              </div>
            )}
          </div>

          {/* Desktop: 3-column grid */}
          <div className="billing-plans-grid">
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
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <p style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.03em", color: "#111", margin: "0 0 4px", fontVariantNumeric: "tabular-nums" }}>
                  {plan.price}
                  {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa" }}>/mo</span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 24px", lineHeight: 1.5 }}>
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
                  <Button href="mailto:hi@athena.app" variant="primary-dark" style={{ width: "100%" }}>
                    Contact sales
                  </Button>
                ) : (
                  <Button
                    onClick={() => setModal(plan)}
                    variant="primary-dark"
                    style={{ width: "100%" }}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Billing history */}
          <h2 style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.02em", color: "#111", marginBottom: 20, textWrap: "balance" } as React.CSSProperties}>
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
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 13.5, color: "#999", margin: 0 }}>
                No billing history yet. You&apos;re on the free Starter plan — invoices will appear here once you upgrade.
              </p>
            </div>
          </div>

        </div>
      </main>

      {modal && <UpgradeModal plan={modal} onClose={() => setModal(null)} />}
    </DashboardShell>
  );
}
