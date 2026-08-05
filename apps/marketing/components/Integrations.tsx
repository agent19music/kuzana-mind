"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const staticIntegrations = [
  {
    name: "Google Docs",
    description: "Policies, playbooks, and internal docs — indexed automatically.",
    iconSrc: "/icons/google-docs.png",
  },
  {
    name: "Google Drive",
    description: "Shared Drives and folders — service account access, fully secure.",
    iconSrc: "/icons/google-drive.svg",
  },
];

const NotionIcon = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
    <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" fill="#fff"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143c-4.273-3.107-6.02-3.5-12.817-2.917zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.93 3.307-.683.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.97-5.043-4.083zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.077 1.36s0 3.5-4.853 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z" fill="#000"/>
  </svg>
);

const comingSoon = ["Confluence", "SharePoint", "Slack"];

export default function Integrations() {
  return (
    <section
      style={{
        background: "var(--surface)",
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
            fontFamily: "var(--font-sans)",
          }}
        >
          Integrations
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
            marginBottom: "var(--space-12)",
            maxWidth: 500,
          }}
        >
          Connects to where your knowledge already lives.
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "var(--space-6)" }}>
          {/* Static cards — Google Docs & Drive (post-MVP) */}
          {staticIntegrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-8)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-md)",
                  background: "var(--inset-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image src={item.iconSrc} alt={item.name} width={28} height={28} />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  color: "var(--foreground)",
                  lineHeight: 1.3,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--foreground-muted)",
                  lineHeight: 1.65,
                  fontFamily: "var(--font-sans)",
                  flex: 1,
                }}
              >
                {item.description}
              </p>
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: 12,
                  fontWeight: 400,
                  color: "var(--foreground-subtle)",
                  background: "var(--inset-surface)",
                  borderRadius: 9999,
                  padding: "3px 10px",
                }}
              >
                Coming soon
              </span>
            </motion.div>
          ))}

          {/* Notion card — live OAuth connect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-8)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius-md)",
                background: "var(--inset-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NotionIcon />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                color: "var(--foreground)",
                lineHeight: 1.3,
                fontFamily: "var(--font-sans)",
              }}
            >
              Notion
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--foreground-muted)",
                lineHeight: 1.65,
                fontFamily: "var(--font-sans)",
                flex: 1,
              }}
            >
              Wikis, databases, and team pages — all searchable from day one.
            </p>
            <span
              style={{
                alignSelf: "flex-start",
                fontSize: 12,
                fontWeight: 400,
                color: "var(--foreground-subtle)",
                background: "var(--inset-surface)",
                borderRadius: 9999,
                padding: "3px 10px",
              }}
            >
              Coming soon
            </span>
          </motion.div>
        </div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            marginTop: "var(--space-8)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "var(--foreground-subtle)",
            }}
          >
            Coming soon:
          </span>
          {comingSoon.map((name) => (
            <span
              key={name}
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "var(--foreground-muted)",
                background: "var(--inset-surface)",
                borderRadius: 9999,
                padding: "4px 14px",
              }}
            >
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
