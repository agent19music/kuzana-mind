"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Animation for "Instant answers" — simulates a query being typed and answered
function SearchAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const queries = ["Who owns onboarding?", "Q3 budget process?", "Leave policy?"];
  const answers = ["Ask Amara →", "See Finance doc →", "See HR Policy →"];

  return (
    <div className="flex flex-col justify-center h-full gap-3">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "var(--inset-surface)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--foreground-muted)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {queries[step]}
      </motion.div>
      <motion.div
        key={step + "a"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "var(--brand-olive)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--brand-cream)",
          fontFamily: "var(--font-sans)",
          alignSelf: "flex-start",
        }}
      >
        {answers[step]}
      </motion.div>
    </div>
  );
}

// Animation for "Smart fallback" — grid cards rearranging like a layout shift
function FallbackAnimation() {
  const [layout, setLayout] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLayout((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const layouts = [
    "grid-cols-2 grid-rows-2",
    "grid-cols-3 grid-rows-1",
    "grid-cols-1 grid-rows-3",
  ];

  return (
    <div className="h-full p-4 flex items-center justify-center">
      <motion.div
        className={`grid ${layouts[layout]} gap-2 w-full max-w-[140px]`}
        layout
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="rounded-md min-h-[30px]"
            style={{ background: "var(--brand-olive)", opacity: 0.2 + i * 0.2 }}
            layout
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Animation for "Always current" — sync progress bar cycling
function SyncAnimation() {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("Syncing…");

  useEffect(() => {
    let p = 0;
    setProgress(0);
    setLabel("Syncing…");

    const tick = setInterval(() => {
      p += 4;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        setLabel("Up to date");
        clearInterval(tick);
        setTimeout(() => {
          setProgress(0);
          setLabel("Syncing…");
        }, 1800);
      }
    }, 80);

    return () => clearInterval(tick);
  }, []);

  // Restart cycle
  useEffect(() => {
    const cycle = setInterval(() => {
      setProgress(0);
      setLabel("Syncing…");

      let p = 0;
      const tick = setInterval(() => {
        p += 4;
        setProgress(Math.min(p, 100));
        if (p >= 100) {
          setLabel("Up to date");
          clearInterval(tick);
        }
      }, 80);
    }, 4500);

    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <motion.span
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--brand-olive)",
          fontFamily: "var(--font-sans)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </motion.span>
      <div
        style={{
          width: 120,
          height: 4,
          background: "var(--inset-surface)",
          borderRadius: "var(--radius-pill)",
          overflow: "hidden",
        }}
      >
        <motion.div
          style={{
            height: "100%",
            background: "var(--brand-olive)",
            borderRadius: "var(--radius-pill)",
            width: `${progress}%`,
          }}
          transition={{ duration: 0.08 }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          color: "var(--foreground-subtle)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Weekly auto-sync
      </span>
    </div>
  );
}

const cards = [
  {
    animation: <SearchAnimation />,
    title: "Instant answers",
    body: "Ask in plain language. Brain searches every indexed doc and returns the most relevant passage with a direct link to the source.",
  },
  {
    animation: <FallbackAnimation />,
    title: "Smart fallback",
    body: "When confidence is low, Brain never guesses. It finds the team member who owns that domain and tells you exactly why.",
  },
  {
    animation: <SyncAnimation />,
    title: "Always current",
    body: "A weekly sync re-indexes your Shared Drive automatically. No uploads, no maintenance — always the latest version.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
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
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--foreground-subtle)",
            marginBottom: "var(--space-8)",
            fontFamily: "var(--font-sans)",
          }}
        >
          Features
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "var(--space-6)" }}>
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-8)",
                minHeight: 280,
                display: "flex",
                flexDirection: "column",
                cursor: "default",
              }}
            >
              <div style={{ flex: 1 }}>{card.animation}</div>
              <div style={{ marginTop: "var(--space-4)" }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--foreground)",
                    marginBottom: "var(--space-2)",
                    lineHeight: 1.3,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--foreground-muted)",
                    lineHeight: 1.65,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {card.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
