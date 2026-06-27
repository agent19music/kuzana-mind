"use client";

import { useState } from "react";

const arrowIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
        padding: "24px 0",
        borderBottom: "1px solid #e5e5e5",
      }}
    >
      <p style={{ fontSize: 14, color: "#6b6b6b", minWidth: 160, margin: 0, paddingTop: 2 }}>
        {label}
      </p>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function SyncButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function trigger() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDetail(data.error ?? "Unknown error");
        setState("error");
      } else {
        setDetail(`${data.chunks ?? data.documents ?? "—"} chunks indexed`);
        setState("done");
      }
    } catch {
      setDetail("Could not reach server");
      setState("error");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <button
        onClick={trigger}
        disabled={state === "loading"}
        style={{
          fontSize: 14,
          color: state === "loading" ? "#a3a3a3" : "#1a1a1a",
          background: "none",
          border: "1px solid #e5e5e5",
          borderRadius: 9999,
          padding: "7px 18px",
          cursor: state === "loading" ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "border-color 150ms",
        }}
      >
        {state === "loading" ? "Syncing…" : "Re-sync now"}
        {state === "idle" && arrowIcon}
      </button>
      {detail && (
        <span
          style={{
            fontSize: 13,
            color: state === "error" ? "#e05a5a" : "#6b6b6b",
          }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}

export default function SettingsClient({
  orgName,
  orgLogo,
}: {
  orgName: string;
  orgLogo: string | null;
}) {
  return (
    <div>
      {/* Org info */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "0.01em" }}>
          Organisation
        </h2>
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 16 }}>
          <Row label="Name">
            <p style={{ fontSize: 15, color: "#1a1a1a", margin: 0 }}>{orgName}</p>
          </Row>
          <Row label="Logo">
            {orgLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogo}
                alt="Org logo"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
              />
            ) : (
              <p style={{ fontSize: 15, color: "#a3a3a3", margin: 0 }}>No logo set</p>
            )}
          </Row>
        </div>
      </section>

      {/* Integrations */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "0.01em" }}>
          Integrations
        </h2>
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 16 }}>
          <Row label="Notion">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 15, color: "#6b6b6b", margin: 0, lineHeight: 1.55 }}>
                Connect your Notion workspace to keep your knowledge base in sync.
              </p>
              <a
                href="/api/auth/notion"
                style={{
                  alignSelf: "flex-start",
                  fontSize: 14,
                  color: "#1a1a1a",
                  border: "1px solid #e5e5e5",
                  borderRadius: 9999,
                  padding: "7px 18px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "border-color 150ms",
                }}
              >
                Connect Notion {arrowIcon}
              </a>
            </div>
          </Row>
          <Row label="Google Docs">
            <p style={{ fontSize: 15, color: "#a3a3a3", margin: 0 }}>
              Managed during onboarding. Full connector coming soon.
            </p>
          </Row>
        </div>
      </section>

      {/* Sync */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "0.01em" }}>
          Knowledge sync
        </h2>
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 16 }}>
          <Row label="Manual sync">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 15, color: "#6b6b6b", margin: 0, lineHeight: 1.55 }}>
                Re-indexes all connected sources for this organisation.
              </p>
              <SyncButton />
            </div>
          </Row>
        </div>
      </section>
    </div>
  );
}
