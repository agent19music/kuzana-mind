"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "connected" | "partial" | "disconnected" | "soon";

type OrgStats = { chunk_count: number; last_synced: string | null; source_types: string[] };
type Job = {
  id: string;
  status: string;
  trigger: string;
  documents: number;
  chunks: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type Connection = {
  id: string;
  name: string;
  description: string;
  status: Status;
  meta: string;
  actionLabel: string;
  actionHref?: string;
  syncable: boolean;
  logo: React.ReactNode;
};

const NotionLogo = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
    <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" fill="#fff"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143c-4.273-3.107-6.02-3.5-12.817-2.917zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.93 3.307-.683.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.97-5.043-4.083zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.077 1.36s0 3.5-4.853 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z" fill="#000"/>
  </svg>
);




const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  connected: { label: "Connected", dot: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
  partial: { label: "Partial", dot: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  disconnected: { label: "Not connected", dot: "#d1d5db", bg: "#f9fafb", text: "#6b7280" },
  soon: { label: "Coming soon", dot: "#c4b5fd", bg: "#f5f3ff", text: "#7c3aed" },
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// A shared button that hits the real /api/admin/sync route and refreshes server
// data so the status/chunk-count reflect the new run.
function SyncButton({ body, label = "Sync now" }: { body?: Record<string, unknown>; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");

  async function sync() {
    setState("syncing");
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      console.error("Sync failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const text =
    state === "syncing" ? "Syncing…" : state === "done" ? "✓ Done" : state === "error" ? "Retry" : label;

  return (
    <button
      onClick={sync}
      disabled={state === "syncing"}
      style={{
        fontSize: 12,
        color: state === "syncing" ? "#aaa" : state === "error" ? "#b91c1c" : "#444",
        background: "#fff",
        border: `1px solid ${state === "error" ? "#fecaca" : "#E2E2E2"}`,
        borderRadius: 6,
        padding: "5px 12px",
        cursor: state === "syncing" ? "not-allowed" : "pointer",
        fontWeight: 400,
        transition: "border-color 150ms, color 150ms",
        whiteSpace: "nowrap",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {text}
    </button>
  );
}

const connectorInputStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#444",
  background: "#fff",
  border: "1px solid #E2E2E2",
  borderRadius: 6,
  padding: "5px 10px",
  fontWeight: 400,
  outline: "none",
};

function TallySetup({ configured }: { configured: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [formIds, setFormIds] = useState("");

  const ids = formIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const ready = apiKey.trim().length > 0 && ids.length > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={configured ? "New API key" : "Tally API key"}
        style={{ ...connectorInputStyle, width: 140 }}
      />
      <input
        value={formIds}
        onChange={(e) => setFormIds(e.target.value)}
        placeholder="Form ids, comma separated"
        style={{ ...connectorInputStyle, width: 180 }}
      />
      {ready ? (
        <SyncButton body={{ tally_api_key: apiKey.trim(), tally_form_ids: ids }} label="Save & sync" />
      ) : (
        <span style={{ fontSize: 12, color: "#bbb" }}>
          {configured ? "Update key + form ids" : "Paste key + form ids"}
        </span>
      )}
    </div>
  );
}

// Records real interest in a not-yet-shipped connector via /api/admin/notify
// (backend: integration_interest table) so there's an actual list to email
// once it ships, instead of a click that only flips local React state.
function NotifyButton({ integration, initiallyNotified }: { integration: string; initiallyNotified: boolean }) {
  const { user } = useUser();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    initiallyNotified ? "done" : "idle"
  );

  async function notify() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration,
          email: user?.primaryEmailAddress?.emailAddress,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("done");
    } catch (err) {
      console.error("Notify signup failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const label =
    state === "loading" ? "Saving…" : state === "done" ? "✓ Noted" : state === "error" ? "Retry" : "Notify me";

  return (
    <button
      onClick={notify}
      disabled={state === "loading" || state === "done"}
      style={{
        fontSize: 12,
        color: state === "done" ? "#22c55e" : state === "error" ? "#b91c1c" : "#7c3aed",
        background: "none",
        border: `1px solid ${state === "done" ? "#86efac" : state === "error" ? "#fecaca" : "#ddd6fe"}`,
        borderRadius: 6,
        padding: "5px 12px",
        cursor: state === "loading" || state === "done" ? "not-allowed" : "pointer",
        fontWeight: 400,
      }}
    >
      {label}
    </button>
  );
}

function DriveSetup() {
  const [folderId, setFolderId] = useState("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <input
        value={folderId}
        onChange={(e) => setFolderId(e.target.value)}
        placeholder="Drive folder ID"
        style={{
          fontSize: 12,
          color: "#444",
          background: "#fff",
          border: "1px solid #E2E2E2",
          borderRadius: 6,
          padding: "5px 10px",
          width: 150,
          fontWeight: 400,
          outline: "none",
        }}
      />
      {folderId.trim() ? (
        <SyncButton body={{ drive_folder_id: folderId.trim() }} label="Sync folder" />
      ) : (
        <span style={{ fontSize: 12, color: "#bbb" }}>Paste a folder id</span>
      )}
    </div>
  );
}

export default function ConnectionsClient({
  stats,
  jobs,
  notifiedIntegrations,
}: {
  stats: OrgStats | null;
  jobs: Job[];
  notifiedIntegrations: string[];
}) {
  const sources = new Set(stats?.source_types ?? []);
  const hasNotion = sources.has("notion");
  const hasGdocs = sources.has("google_docs");
  const hasTally = sources.has("tally");
  const lastSynced = stats?.last_synced ?? null;
  const latestJob = jobs[0] ?? null;

  const CONNECTIONS: Connection[] = [
    {
      id: "notion",
      name: "Notion",
      description: "Sync pages and databases from your Notion workspace.",
      status: hasNotion ? "connected" : "disconnected",
      meta: hasNotion ? `Last synced ${relativeTime(lastSynced)}` : "No Notion pages indexed yet",
      actionLabel: "Configure",
      syncable: hasNotion,
      logo: <NotionLogo />,
    },
    {
      id: "gdocs",
      name: "Google Docs",
      description: "Index public Google Docs shared with your workspace.",
      status: hasGdocs ? "connected" : "partial",
      meta: hasGdocs ? `Last synced ${relativeTime(lastSynced)}` : "No documents indexed · No auth required",
      actionLabel: "Manage docs",
      syncable: hasGdocs,
      logo: <Image src="/icons/google-docs.png" alt="Google Docs" width={22} height={22} />,
    },
    {
      id: "tally",
      name: "Tally",
      description: "Pull form and survey responses so staff can ask about the feedback they've received.",
      status: hasTally ? "connected" : "partial",
      meta: hasTally ? `Last synced ${relativeTime(lastSynced)}` : "No forms indexed yet · Needs an API key",
      actionLabel: "Configure",
      syncable: hasTally,
      logo: <Image src="/icons/tally.svg" alt="Tally" width={22} height={22} />,
    },
    {
      id: "drive",
      name: "Google Drive",
      description: "Full Drive folder sync via service account connector.",
      status: "disconnected",
      meta: "Share a folder with the service account, then sync by folder id",
      actionLabel: "Set up",
      syncable: false,
      logo: <Image src="/icons/google-drive.svg" alt="Google Drive" width={22} height={22} />,
    },
    {
      id: "slack",
      name: "Slack",
      description: "Get Athena answers directly in Slack channels.",
      status: "soon",
      meta: "Planned · Q3 2025",
      actionLabel: "Notify me",
      syncable: false,
      logo: <Image src="/icons/slack_icon.svg" alt="Slack" width={32} height={32} />,
    },
    {
      id: "confluence",
      name: "Confluence",
      description: "Index Confluence spaces and pages as knowledge.",
      status: "soon",
      meta: "Planned · Q4 2025",
      actionLabel: "Notify me",
      syncable: false,
      logo: <Image src="/icons/atlassian_confluence.svg" alt="Confluence" width={22} height={22} />,
    },
  ];

  return (
    <>
      {/* Live summary — real backend data, replaces the old hardcoded meta */}
      <div
        style={{
          display: "flex",
          gap: 32,
          padding: "16px 24px",
          marginBottom: 20,
          background: "#fff",
          border: "1px solid #E8E8E8",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {[
          { label: "Chunks indexed", value: stats ? stats.chunk_count.toLocaleString() : "—" },
          { label: "Sources", value: String(stats?.source_types?.length ?? 0) },
          { label: "Last synced", value: relativeTime(lastSynced) },
          {
            label: "Last run",
            value: latestJob
              ? latestJob.status === "running"
                ? "In progress"
                : latestJob.status === "failed"
                  ? "Failed"
                  : `${latestJob.chunks} chunks`
              : "No runs yet",
          },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>{s.label}</span>
            <span style={{ fontSize: 18, color: "#111", fontWeight: 400, letterSpacing: "-0.01em" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {latestJob?.status === "failed" && latestJob.error && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: 20,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
          }}
        >
          Last sync failed: {latestJob.error}
        </div>
      )}

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
                {conn.id === "drive" && <DriveSetup />}
                {conn.id === "tally" && <TallySetup configured={hasTally} />}
                {conn.syncable && conn.id !== "tally" && <SyncButton />}
                {conn.status === "soon" ? (
                  <NotifyButton
                    integration={conn.id}
                    initiallyNotified={notifiedIntegrations.includes(conn.id)}
                  />
                ) : conn.id !== "drive" && conn.id !== "tally" ? (
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
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
