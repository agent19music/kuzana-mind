"use client";

import { useRef, useState } from "react";
import FileUploadCard from "./FileUploadCard";

const arrowIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const cameraIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 2l-1 2H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1h-3L10 2H6z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const pencilIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

function LogoUpload({ initialLogo }: { initialLogo: string | null }) {
  const [logo, setLogo] = useState(initialLogo);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/orgs/logo", { method: "PATCH", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Upload failed");
      else setLogo(data.imageUrl);
    } catch {
      setError("Could not reach server");
    }
    setUploading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button
        onClick={() => !uploading && fileRef.current?.click()}
        className="logo-upload"
        aria-label="Upload organisation logo"
        style={{
          position: "relative",
          width: 48,
          height: 48,
          borderRadius: 10,
          cursor: uploading ? "not-allowed" : "pointer",
          border: logo ? "none" : "1.5px dashed #d4d4d4",
          background: logo ? "transparent" : "#fafafa",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a3a3a3",
        }}
      >
        {uploading ? (
          <span className="spinner" />
        ) : logo ? (
          <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Org logo" style={{ width: 48, height: 48, objectFit: "cover", display: "block", borderRadius: 10 }} />
            <div className="logo-overlay">{cameraIcon}</div>
          </div>
        ) : (
          cameraIcon
        )}
      </button>
      {error && <p style={{ fontSize: 13, color: "#e05a5a", margin: 0 }}>{error}</p>}
    </div>
  );
}

function InlineNameEdit({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(displayName);
    setError("");
    setEditing(true);
    // focus after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() {
    setEditing(false);
    setError("");
  }

  async function save() {
    if (!draft.trim() || draft.trim() === displayName) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not save");
        setSaving(false);
        return;
      }
      setDisplayName(draft.trim());
      setEditing(false);
    } catch {
      setError("Could not reach server");
    }
    setSaving(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={saving}
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: "#1a1a1a",
              border: "1px solid #e5e5e5",
              borderRadius: 8,
              padding: "6px 12px",
              outline: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              background: "#fff",
              width: 260,
              // ponytail: focus border via JS, avoids extra CSS class for one field
              transition: "border-color 150ms",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#1a1a1a")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
          />
          <button
            onClick={save}
            disabled={saving}
            className="btn-pill"
            style={{
              fontSize: 13,
              color: saving ? "#a3a3a3" : "#1a1a1a",
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 9999,
              padding: "6px 14px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="btn-pill"
            style={{
              fontSize: 13,
              color: "#a3a3a3",
              background: "none",
              border: "1px solid transparent",
              borderRadius: 9999,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
        {error && <p style={{ fontSize: 13, color: "#e05a5a", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="edit-row">
      <p
        style={{ fontSize: 15, color: "#1a1a1a", margin: 0, cursor: "pointer" }}
        onClick={startEdit}
      >
        {displayName}
      </p>
      <button
        className="pencil-icon"
        onClick={startEdit}
        aria-label="Edit organisation name"
        style={{ background: "none", border: "none", padding: 2, lineHeight: 0 }}
      >
        {pencilIcon}
      </button>
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
        className="btn-pill"
        style={{
          fontSize: 14,
          color: state === "loading" ? "#a3a3a3" : "#1a1a1a",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 9999,
          padding: "7px 18px",
          cursor: state === "loading" ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {state === "loading" ? (
          <>
            <span className="spinner" style={{ borderTopColor: "#a3a3a3" }} />
            Syncing…
          </>
        ) : (
          <>Re-sync now {state === "idle" && arrowIcon}</>
        )}
      </button>
      {detail && (
        <span style={{ fontSize: 13, color: state === "error" ? "#e05a5a" : "#6b6b6b" }}>
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
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "-0.01em" }}>
          Organisation
        </h2>
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 16 }}>
          <Row label="Name">
            <InlineNameEdit initialName={orgName} />
          </Row>
          <Row label="Logo">
            <LogoUpload initialLogo={orgLogo} />
          </Row>
        </div>
      </section>

      {/* Integrations */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "-0.01em" }}>
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
                className="btn-pill"
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
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "-0.01em" }}>
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

      {/* Upload files */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 1px 0", letterSpacing: "-0.01em" }}>
          Upload files
        </h2>
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 16 }}>
          <Row label="Documents">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 15, color: "#6b6b6b", margin: 0, lineHeight: 1.55 }}>
                Upload internal documents directly from your device. Supported formats: PDF, Word, Markdown, plain text, HTML, CSV.
              </p>
              <FileUploadCard />
            </div>
          </Row>
        </div>
      </section>
    </div>
  );
}
