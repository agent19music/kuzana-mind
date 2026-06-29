"use client";

import { useState } from "react";
import DashboardShell from "../../components/DashboardShell";

type FileStatus = "indexed" | "processing" | "error";

type DocFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploaded: string;
  source: string;
  status: FileStatus;
  chunks?: number;
};

const MOCK_FILES: DocFile[] = [
  { id: "1", name: "Company Handbook v4.pdf", type: "PDF", size: "2.4 MB", uploaded: "Jun 12, 2025", source: "Upload", status: "indexed", chunks: 312 },
  { id: "2", name: "Expense & Reimbursement Policy.docx", type: "DOCX", size: "156 KB", uploaded: "Jun 10, 2025", source: "Upload", status: "indexed", chunks: 48 },
  { id: "3", name: "Q2 2025 OKRs.md", type: "MD", size: "24 KB", uploaded: "Jun 8, 2025", source: "Notion", status: "indexed", chunks: 19 },
  { id: "4", name: "Engineering Runbook.md", type: "MD", size: "88 KB", uploaded: "Jun 7, 2025", source: "Notion", status: "indexed", chunks: 67 },
  { id: "5", name: "Benefits & Perks Guide.pdf", type: "PDF", size: "1.2 MB", uploaded: "Jun 1, 2025", source: "Google Docs", status: "indexed", chunks: 104 },
  { id: "6", name: "Onboarding Checklist.csv", type: "CSV", size: "8 KB", uploaded: "May 29, 2025", source: "Upload", status: "indexed", chunks: 12 },
  { id: "7", name: "Team Structure Q2.pdf", type: "PDF", size: "340 KB", uploaded: "May 24, 2025", source: "Upload", status: "processing" },
  { id: "8", name: "Client Billing SOP.docx", type: "DOCX", size: "72 KB", uploaded: "May 18, 2025", source: "Upload", status: "error" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "#FEF2F2", text: "#DC2626" },
  DOCX: { bg: "#EFF6FF", text: "#2563EB" },
  MD: { bg: "#F0FDF4", text: "#16A34A" },
  CSV: { bg: "#FFFBEB", text: "#D97706" },
  HTML: { bg: "#FDF4FF", text: "#9333EA" },
};

const STATUS_CONFIG: Record<FileStatus, { label: string; dot: string; text: string }> = {
  indexed: { label: "Indexed", dot: "#22c55e", text: "#15803d" },
  processing: { label: "Processing…", dot: "#f59e0b", text: "#b45309" },
  error: { label: "Failed", dot: "#ef4444", text: "#dc2626" },
};

export default function FilesPage() {
  const [files, setFiles] = useState<DocFile[]>(MOCK_FILES);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const totalChunks = files.filter(f => f.status === "indexed").reduce((n, f) => n + (f.chunks ?? 0), 0);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;

    setUploading(true);
    await new Promise(r => setTimeout(r, 1200));

    const newFiles: DocFile[] = droppedFiles.map((f, i) => ({
      id: `new-${Date.now()}-${i}`,
      name: f.name,
      type: f.name.split(".").pop()?.toUpperCase() ?? "FILE",
      size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      uploaded: "Just now",
      source: "Upload",
      status: "processing" as FileStatus,
    }));

    setFiles(prev => [...newFiles, ...prev]);
    setUploading(false);

    // Simulate indexing completing
    setTimeout(() => {
      setFiles(prev =>
        prev.map(f =>
          newFiles.some(n => n.id === f.id)
            ? { ...f, status: "indexed" as FileStatus, chunks: Math.floor(Math.random() * 80) + 10 }
            : f
        )
      );
    }, 3000);
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
                {files.length} documents · {totalChunks.toLocaleString()} chunks indexed
              </p>
            </div>
          </div>

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
                gridTemplateColumns: "1fr 72px 80px 120px 80px 100px",
                padding: "10px 20px",
                borderBottom: "1px solid #F0F0F0",
                background: "#FAFAFA",
              }}
            >
              {["Name", "Type", "Size", "Uploaded", "Source", "Status"].map(h => (
                <span key={h} style={{ fontSize: 11, color: "#aaa", letterSpacing: "0" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {files.map((f, i) => {
              const tc = TYPE_COLORS[f.type] ?? { bg: "#F4F4F4", text: "#555" };
              const sc = STATUS_CONFIG[f.status];
              return (
                <div
                  key={f.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 72px 80px 120px 80px 100px",
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
                    {f.chunks && (
                      <p style={{ fontSize: 11, color: "#bbb", margin: 0, marginTop: 2 }}>
                        {f.chunks} chunks
                      </p>
                    )}
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
                    }}
                  >
                    {f.type}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#999" }}>{f.size}</span>
                  <span style={{ fontSize: 12.5, color: "#999" }}>{f.uploaded}</span>
                  <span style={{ fontSize: 12.5, color: "#bbb" }}>{f.source}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: sc.text,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sc.dot,
                        display: "inline-block",
                        boxShadow: f.status === "processing" ? `0 0 0 3px ${sc.dot}33` : "none",
                      }}
                    />
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </DashboardShell>
  );
}
