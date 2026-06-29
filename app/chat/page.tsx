"use client";

import { useEffect, useRef, useState } from "react";
import DocumentCard from "../components/chat/DocumentCard";
import StaffCard from "../components/chat/StaffCard";
import DashboardShell from "../components/DashboardShell";


const API_URL = "/api";

type ChatResponse = {
  answer: string;
  type: "document" | "staff_fallback";
  source_title?: string;
  source_doc_id?: string;
  source_type?: "google_docs" | "notion" | "mock";
  staff_name?: string;
  staff_email?: string;
  staff_domain?: string;
  staff_title?: string;
  staff_department?: string;
  similarity_score?: number;
};

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; data: ChatResponse };

const SUGGESTIONS = [
  "How do I submit an expense claim?",
  "What is our leave policy?",
  "How does the client billing workflow work?",
  "How do I get IT access to a new tool?",
];

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--foreground-subtle)",
            display: "inline-block",
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(query: string) {
    const q = query.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        data: {
          answer: `Request failed: ${detail}`,
          type: "staff_fallback",
        },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <DashboardShell>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        background: "var(--background)",
      }}
    >

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* Empty state */}
          {isEmpty && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "calc(100svh - 200px)",
                textAlign: "center",
                gap: "var(--space-8)",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "clamp(28px, 4vw, 40px)",
                    fontWeight: 400,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                    color: "var(--foreground)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  What do you need to know?
                </h1>
                <p
                  style={{
                    fontSize: 16,
                    color: "var(--foreground-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  Ask anything about how the team works.
                </p>
              </div>

              {/* Suggestions */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-3)",
                  justifyContent: "center",
                  maxWidth: 560,
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 9999,
                      padding: "10px 18px",
                      fontSize: 14,
                      fontWeight: 400,
                      color: "var(--foreground-muted)",
                      cursor: "pointer",
                      transition: "background 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-surface)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--card)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message thread */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "user" ? (
                <div
                  style={{
                    background: "var(--foreground)",
                    color: "var(--background)",
                    borderRadius: "18px 18px 4px 18px",
                    padding: "12px 18px",
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: 1.55,
                    maxWidth: "80%",
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                <div style={{ width: "100%" }}>
                  {msg.data.type === "document" ? (
                    <DocumentCard
                      answer={msg.data.answer}
                      sourceTitle={msg.data.source_title}
                      sourceDocId={msg.data.source_doc_id}
                      sourceType={msg.data.source_type}
                      similarityScore={msg.data.similarity_score}
                    />
                  ) : (
                    <StaffCard
                      answer={msg.data.answer}
                      staffName={msg.data.staff_name}
                      staffEmail={msg.data.staff_email}
                      staffDomain={msg.data.staff_domain}
                      staffTitle={msg.data.staff_title}
                      staffDepartment={msg.data.staff_department}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ marginBottom: "var(--space-6)" }}>
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4) var(--space-6)",
                  display: "inline-block",
                }}
              >
                <ThinkingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        style={{
          flexShrink: 0,
          padding: "var(--space-4) var(--space-6) var(--space-6)",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            background: "var(--card)",
            border: "1px solid var(--border-strong)",
            borderRadius: 9999,
            padding: "6px 6px 6px 20px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about how we work…"
            disabled={loading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              fontWeight: 400,
              color: "var(--foreground)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || loading}
            style={{
              flexShrink: 0,
              height: 40,
              borderRadius: 9999,
              background: input.trim() && !loading ? "var(--foreground)" : "var(--inset-surface)",
              color: input.trim() && !loading ? "var(--background)" : "var(--foreground-subtle)",
              border: "none",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 400,
              fontFamily: "var(--font-sans)",
              transition: "background 200ms ease-out, color 200ms ease-out",
            }}
          >
            Ask
          </button>
        </div>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--foreground-subtle)",
            marginTop: "var(--space-3)",
          }}
        >
          Athena may be wrong. Always verify important information.
        </p>
      </div>
    </div>
    </DashboardShell>
  );
}
