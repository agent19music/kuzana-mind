"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import {
  paddleSuccessUrl,
  requirePaddleClientToken,
  requirePaddleEnvironment,
} from "../lib/paddle-env";
import {
  TIERS,
  type BillingInterval,
  type Tier,
} from "../lib/pricing-tiers";

type Props = {
  /** ISO country from edge headers, or omit so Paddle auto-detects IP. */
  countryCode?: string;
  /** Prefill checkout when Clerk session is present. */
  customerEmail?: string | null;
};

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

export default function PricingSection({ countryCode, customerEmail }: Props) {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [openingTier, setOpeningTier] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const environment = requirePaddleEnvironment();
        const token = requirePaddleClientToken();
        const instance = await initializePaddle({ environment, token });
        if (!cancelled && instance) setPaddle(instance);
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            err instanceof Error ? err.message : "Paddle failed to initialize.",
          );
          setLoadingPrices(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paddle) return;
    let cancelled = false;

    (async () => {
      setLoadingPrices(true);
      setCheckoutError(null);
      try {
        const items = TIERS.map((tier) => ({
          priceId: tier.priceId[interval],
          quantity: 1,
        }));
        const params = {
          items,
          ...(countryCode
            ? { address: { countryCode } }
            : {}),
        };
        const preview = await paddle.PricePreview(params);
        if (cancelled) return;

        const next: Record<string, string> = {};
        for (const line of preview.data.details.lineItems) {
          // Display only Paddle's formatted totals — no frontend math/reformat.
          next[line.price.id] = line.formattedTotals.total;
        }
        setPrices(next);
      } catch (err) {
        if (!cancelled) {
          setCheckoutError(
            err instanceof Error
              ? err.message
              : "Could not load localized prices.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paddle, interval, countryCode]);

  const subscribe = (tier: Tier) => {
    if (!paddle) return;
    setOpeningTier(tier.name);
    setCheckoutError(null);
    try {
      const priceId = tier.priceId[interval];
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(customerEmail ? { customer: { email: customerEmail } } : {}),
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: paddleSuccessUrl(),
        },
      });
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not open checkout.",
      );
    } finally {
      setOpeningTier(null);
    }
  };

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
            marginBottom: "var(--space-8)",
            maxWidth: 440,
            lineHeight: 1.6,
          }}
        >
          Localized prices. Seven-day free trial on every plan.
        </motion.p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 4,
            marginBottom: "var(--space-10)",
            borderRadius: 9999,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
          role="group"
          aria-label="Billing interval"
        >
          {(
            [
              { id: "month", label: "Monthly" },
              { id: "year", label: "Yearly" },
            ] as const
          ).map((opt) => {
            const active = interval === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInterval(opt.id)}
                style={{
                  height: 36,
                  padding: "0 18px",
                  borderRadius: 9999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 400,
                  background: active ? "var(--foreground)" : "transparent",
                  color: active ? "var(--background)" : "var(--foreground-muted)",
                  transition: "background 200ms ease-out, color 200ms ease-out",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {configError && (
          <p
            style={{
              fontSize: 14,
              color: "#b42318",
              marginBottom: "var(--space-6)",
              maxWidth: 560,
            }}
          >
            {configError}
          </p>
        )}

        {checkoutError && !configError && (
          <p
            style={{
              fontSize: 14,
              color: "#b42318",
              marginBottom: "var(--space-6)",
            }}
          >
            {checkoutError}
          </p>
        )}

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: "var(--space-6)", alignItems: "stretch" }}
        >
          {TIERS.map((tier, i) => {
            const priceId = tier.priceId[interval];
            const formatted = prices[priceId];
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  background: tier.highlight ? "var(--foreground)" : "var(--card)",
                  border: tier.highlight ? "none" : "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-8)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ marginBottom: "var(--space-6)" }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      letterSpacing: "0.01em",
                      color: tier.highlight
                        ? "rgba(255,255,255,0.45)"
                        : "var(--foreground-subtle)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    {tier.name}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 5,
                      marginBottom: "var(--space-2)",
                      minHeight: 46,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(28px, 3.5vw, 40px)",
                        fontWeight: 400,
                        letterSpacing: "-0.03em",
                        color: tier.highlight ? "#ffffff" : "var(--foreground)",
                        lineHeight: 1,
                      }}
                    >
                      {loadingPrices
                        ? "…"
                        : formatted ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: tier.highlight
                          ? "rgba(255,255,255,0.4)"
                          : "var(--foreground-subtle)",
                      }}
                    >
                      /{interval === "month" ? "mo" : "yr"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: tier.highlight
                        ? "rgba(255,255,255,0.5)"
                        : "var(--foreground-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {tier.description}
                  </p>
                </div>

                <div
                  style={{
                    height: 1,
                    background: tier.highlight
                      ? "rgba(255,255,255,0.10)"
                      : "var(--border)",
                    marginBottom: "var(--space-6)",
                  }}
                />

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
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 14,
                        fontWeight: 400,
                        color: tier.highlight
                          ? "rgba(255,255,255,0.75)"
                          : "var(--foreground-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          color: tier.highlight
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

                <button
                  type="button"
                  disabled={!!configError || !paddle || loadingPrices}
                  onClick={() => subscribe(tier)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 400,
                    cursor:
                      configError || !paddle || loadingPrices
                        ? "not-allowed"
                        : "pointer",
                    opacity: configError || !paddle || loadingPrices ? 0.55 : 1,
                    transition: "opacity 200ms ease-out",
                    flexShrink: 0,
                    border: tier.highlight ? "none" : "1px solid var(--border-strong)",
                    background: tier.highlight ? "#ffffff" : "transparent",
                    color: tier.highlight ? "#171717" : "var(--foreground)",
                  }}
                >
                  {openingTier === tier.name ? "Opening…" : "Subscribe"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
