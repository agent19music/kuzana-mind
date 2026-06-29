"use client";

import Image from "next/image";
import { useState } from "react";

type Status = "connected" | "partial" | "disconnected" | "soon";

type Connection = {
  id: string;
  name: string;
  description: string;
  status: Status;
  meta: string;
  actionLabel: string;
  actionHref?: string;
  logo: React.ReactNode;
};

const NotionLogo = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
    <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" fill="#fff"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143c-4.273-3.107-6.02-3.5-12.817-2.917zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.93 3.307-.683.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.97-5.043-4.083zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.077 1.36s0 3.5-4.853 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z" fill="#000"/>
  </svg>
);

const CONNECTIONS: Connection[] = [
  {
    id: "notion",
    name: "Notion",
    description: "Sync pages and databases from your Notion workspace.",
    status: "connected",
    meta: "Last synced 2 hours ago · 3 root pages",
    actionLabel: "Configure",
    logo: <NotionLogo />,
  },
  {
    id: "gdocs",
    name: "Google Docs",
    description: "Index public Google Docs shared with your workspace.",
    status: "partial",
    meta: "3 documents configured · No auth required",
    actionLabel: "Manage docs",
    logo: <Image src="/icons/google-docs.png" alt="Google Docs" width={22} height={22} />,
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Full Drive folder sync via service account connector.",
    status: "disconnected",
    meta: "Requires service account JSON + folder ID",
    actionLabel: "Set up",
    logo: <Image src="/icons/google-drive.svg" alt="Google Drive" width={22} height={22} />,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get Athena answers directly in Slack channels.",
    status: "soon",
    meta: "Planned · Q3 2025",
    actionLabel: "Notify me",
    logo: <Image src="/icons/slack_icon.svg" alt="Slack" width={22} height={22} />,
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Index Confluence spaces and pages as knowledge.",
    status: "soon",
    meta: "Planned · Q4 2025",
    actionLabel: "Notify me",
    logo: <Image src="/icons/atlassian_confluence.svg" alt="Confluence" width={22} height={22} />,
  },
];

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  connected: { label: "Connected", dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
  partial: { label: "Partial", dot: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  disconnected: { label: "Not connected", dot: "#d1d5db", bg: "#f9fafb", text: "#6b7280" },
  soon: { label: "Coming soon", dot: "#c4b5fd", bg: "#f5f3ff", text: "#7c3aed" },
};

function SyncButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");

  async function sync() {
    setState("syncing");
    await new Promise(r => setTimeout(r, 1800));
    setState("done");
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <button
      onClick={sync}
      disabled={state !== "idle"}
      style={{
        fontSize: 12,
        color: state === "syncing" ? "#aaa" : "#444",
        background: "#fff",
        border: "1px solid #E2E2E2",
        borderRadius: 6,
        padding: "5px 12px",
        cursor: state !== "idle" ? "not-allowed" : "pointer",
        fontWeight: 400,
        transition: "border-color 150ms, color 150ms",
        whiteSpace: "nowrap",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {state === "syncing" ? "Syncing…" : state === "done" ? "✓ Done" : "Sync now"}
    </button>
  );
}

export default function ConnectionsClient() {
  const [notified, setNotified] = useState<Set<string>>(new Set());

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8E8E8",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {CONNECTIONS.map((conn, i) => {
        const s = STATUS_CONFIG[conn.status];
        return (
          <div
            key={conn.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "20px 24px",
              borderBottom: i < CONNECTIONS.length - 1 ? "1px solid #F3F3F3" : "none",
              opacity: conn.status === "soon" ? 0.7 : 1,
            }}
          >
            {/* Logo badge */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 9,
                background: "#F4F4F4",
                border: "1px solid #E8E8E8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 400,
                color: "#444",
                flexShrink: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {conn.logo}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 400, color: "#111" }}>{conn.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: s.text,
                    background: s.bg,
                    borderRadius: 20,
                    padding: "2px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                  {s.label}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#888", margin: 0, lineHeight: 1.5 }}>{conn.description}</p>
              <p style={{ fontSize: 12, color: "#bbb", margin: "4px 0 0", fontFamily: "monospace" }}>{conn.meta}</p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {conn.status === "connected" && <SyncButton id={conn.id} />}
              {conn.status === "soon" ? (
                <button
                  onClick={() => setNotified(n => { const s = new Set(n); s.add(conn.id); return s; })}
                  style={{
                    fontSize: 12,
                    color: notified.has(conn.id) ? "#22c55e" : "#7c3aed",
                    background: "none",
                    border: `1px solid ${notified.has(conn.id) ? "#86efac" : "#ddd6fe"}`,
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontWeight: 400,
                  }}
                >
                  {notified.has(conn.id) ? "✓ Noted" : conn.actionLabel}
                </button>
              ) : (
                <a
                  href={conn.actionHref ?? "#"}
                  style={{
                    fontSize: 12,
                    color: "#444",
                    background: "#fff",
                    border: "1px solid #E2E2E2",
                    borderRadius: 6,
                    padding: "5px 12px",
                    textDecoration: "none",
                    fontWeight: 400,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {conn.actionLabel}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
