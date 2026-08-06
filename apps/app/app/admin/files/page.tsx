"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "../../../components/DashboardShell";

type DocFile = {
  id: string;
  name: string;
  type: string;
  chunks: number;
  uploaded: string;
  source: string;
};

type BackendDocument = {
  doc_id: string;
  title: string | null;
  source_type: string | null;
  chunks: number;
  last_indexed: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload",
  notion: "Notion",
  google_docs: "Google Docs",
  mock: "Sample",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "#FEF2F2", text: "#DC2626" },
  DOCX: { bg: "#EFF6FF", text: "#2563EB" },
  DOC: { bg: "#EFF6FF", text: "#2563EB" },
  MD: { bg: "#F0FDF4", text: "#16A34A" },
  TXT: { bg: "#F0FDF4", text: "#16A34A" },
  CSV: { bg: "#FFFBEB", text: "#D97706" },
  HTML: { bg: "#FDF4FF", text: "#9333EA" },
  NOTION: { bg: "#F4F4F4", text: "#555" },
};

function fileTypeFor(doc: BackendDocument): string {
  const name = doc.title || doc.doc_id;
  const ext = name.includes(".") ? name.split(".").pop()?.toUpperCase() : null;
  if (ext && ext.length <= 5) return ext;
  if (doc.source_type === "notion") return "NOTION";
  return "DOC";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function mapDocuments(docs: BackendDocument[]): DocFile[] {
  return docs.map(d => ({
    id: d.doc_id,
    name: d.title || d.doc_id,
    type: fileTypeFor(d),
    chunks: d.chunks,
    uploaded: formatDate(d.last_indexed),
    source: SOURCE_LABELS[d.source_type ?? ""] ?? d.source_type ?? "Unknown",
  }));
}

export default function FilesPage() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load files");
      setFiles(mapDocuments(data.documents ?? []));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const totalChunks = files.reduce((n, f) => n + f.chunks, 0);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      droppedFiles.forEach(f => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, margin: 0 }}>
                Files
              </h1>
              <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
                {loading ? "Loading…" : `${files.length} documents · ${totalChunks.toLocaleString()} chunks indexed`}
              </p>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 24,
                fontSize: 13,
                color: "#B91C1C",
              }}
            >
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            style={{
              border: `2px dashed ${dragging ? "#2563EB" : "#DCDCDC"}`,
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
              marginBottom: 32,
              background: dragging ? "rgba(37,99,235,0.04)" : "#fff",
              transition: "border-color 150ms, background 150ms",
              cursor: "default",
            }}
          >
            {uploading ? (
              <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Uploading…</p>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 400, color: "#444", margin: "0 0 4px" }}>
                  Drop files here to upload
                </p>
                <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>
                  PDF, Word, Markdown, plain text, HTML, CSV
                </p>
              </>
            )}
          </div>

          {/* File table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 72px 120px 100px",
                padding: "10px 20px",
                borderBottom: "1px solid #F0F0F0",
                background: "#FAFAFA",
              }}
            >
              {["Name", "Type", "Last indexed", "Source"].map(h => (
                <span key={h} style={{ fontSize: 11, color: "#aaa", letterSpacing: "0" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {!loading && files.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 13.5, color: "#999", margin: 0 }}>
                  No documents yet. Drop a file above or connect a source to get started.
                </p>
              </div>
            ) : (
              files.map((f, i) => {
                const tc = TYPE_COLORS[f.type] ?? { bg: "#F4F4F4", text: "#555" };
                return (
                  <div
                    key={f.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 72px 120px 100px",
                      padding: "12px 20px",
                      borderBottom: i < files.length - 1 ? "1px solid #F6F6F6" : "none",
                      alignItems: "center",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 400, color: "#222", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#bbb", margin: 0, marginTop: 2 }}>
                        {f.chunks} chunks
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 400,
                        color: tc.text,
                        background: tc.bg,
                        borderRadius: 4,
                        padding: "3px 7px",
                        display: "inline-block",
                        letterSpacing: "-0.01em",
                        width: "fit-content",
                      }}
                    >
                      {f.type}
                    </span>
                    <span style={{ fontSize: 12.5, color: "#999" }}>{f.uploaded}</span>
                    <span style={{ fontSize: 12.5, color: "#bbb" }}>{f.source}</span>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>
    </DashboardShell>
  );
}
