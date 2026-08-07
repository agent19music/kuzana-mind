"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import PreviewPanel from "./PreviewPanel";

export type SourceType = "google_docs" | "notion" | "tally" | "upload" | "mock";

interface DocumentCardProps {
  answer: string;
  sourceTitle?: string;
  sourceDocId?: string;
  sourceType?: SourceType;
  sourceExcerpt?: string;
  similarityScore?: number;
}

const SOURCE_LABELS: Record<string, string> = {
  google_docs: "Google Docs",
  notion: "Notion",
  tally: "Tally",
  upload: "Uploaded file",
  mock: "Internal",
};

// Sources with a real external URL we can link to directly.
const LINKABLE_SOURCE_TYPES: SourceType[] = ["google_docs", "notion"];

// Sources with an in-app preview (reassembled from stored chunk text — see
// docs/specs/file-preview-spec.md). Tally submissions have no per-response
// URL and no separate "file" to preview, so — like mock — they render nothing.
const PREVIEWABLE_SOURCE_TYPES: SourceType[] = ["upload"];

export default function DocumentCard({
  answer,
  sourceTitle,
  sourceDocId,
  sourceType,
  sourceExcerpt,
  similarityScore,
}: DocumentCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Source label */}
      {sourceTitle && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "var(--space-4)",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: "var(--brand-olive)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 2h6M2 5h6M2 8h4"
                stroke="#f8f3e1"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "var(--foreground-muted)",
              letterSpacing: "0.01em",
            }}
          >
            {sourceType && sourceType !== "mock" && (
              <span style={{ color: "var(--foreground-subtle)", marginRight: 4 }}>
                {SOURCE_LABELS[sourceType] ?? sourceType} &middot;
              </span>
            )}
            {sourceTitle}
          </span>
          {similarityScore !== undefined && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 400,
                color: "var(--foreground-subtle)",
                letterSpacing: "0.02em",
              }}
            >
              {Math.round(similarityScore * 100)}% match
            </span>
          )}
        </div>
      )}

      {/* Answer text — rendered as markdown */}
      <div
        style={{
          fontSize: 15,
          color: "var(--foreground)",
          lineHeight: 1.7,
          marginBottom: sourceDocId ? "var(--space-4)" : 0,
        }}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <p style={{ fontWeight: 400, fontSize: 15, marginBottom: 4 }}>{children}</p>
            ),
            h2: ({ children }) => (
              <p style={{ fontWeight: 400, fontSize: 15, marginBottom: 4 }}>{children}</p>
            ),
            h3: ({ children }) => (
              <p style={{ fontWeight: 400, fontSize: 14, marginBottom: 4 }}>{children}</p>
            ),
            p: ({ children }) => (
              <p style={{ marginBottom: 6 }}>{children}</p>
            ),
            ul: ({ children }) => (
              <ul style={{ paddingLeft: 18, marginBottom: 6 }}>{children}</ul>
            ),
            li: ({ children }) => (
              <li style={{ marginBottom: 2 }}>{children}</li>
            ),
            code: ({ children }) => (
              <code
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                  background: "var(--inset-surface)",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  background: "var(--inset-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  overflowX: "auto",
                  marginTop: 8,
                  marginBottom: 4,
                  whiteSpace: "pre",
                }}
              >
                {children}
              </pre>
            ),
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>

      {/* Source link — only for sources with a real external URL */}
      {sourceDocId && sourceType && LINKABLE_SOURCE_TYPES.includes(sourceType) && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <a
            href={
              sourceType === "notion"
                ? `https://notion.so/${sourceDocId.replace(/-/g, "")}`
                : `https://docs.google.com/document/d/${sourceDocId}`
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "var(--brand-olive)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Open in {SOURCE_LABELS[sourceType] ?? "source"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      )}

      {/* In-app preview trigger — for sources with no external URL to link to */}
      {sourceDocId && sourceType && PREVIEWABLE_SOURCE_TYPES.includes(sourceType) && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "var(--brand-olive)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Open in source
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {previewOpen && sourceDocId && sourceType && (
        <PreviewPanel
          docId={sourceDocId}
          sourceType={sourceType}
          excerpt={sourceExcerpt}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
