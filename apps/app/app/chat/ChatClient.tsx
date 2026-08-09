"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import DocumentCard from "../../components/chat/DocumentCard";
import StaffCard from "../../components/chat/StaffCard";
import DashboardShell from "../../components/DashboardShell";
import { Button } from "../../components/Button";


const API_URL = "/api";

type ChatResponse = {
  answer: string;
  type: "document" | "staff_fallback";
  source_title?: string;
  source_doc_id?: string;
  source_type?: "google_docs" | "notion" | "tally" | "upload" | "mock";
  source_excerpt?: string;
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

type ConversationSummary = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  "How do I submit an expense claim?",
  "What is our leave policy?",
  "How does the client billing workflow work?",
  "How do I get IT access to a new tool?",
];

// While a request is in flight, cycle the orb through phases so it reads as
// active work ("searching your docs" → "composing an answer") rather than a
// static spinner. The label advances on a timer and holds on the last phase.
const THINKING_PHASES = [
  { state: "searching", label: "Searching your docs" },
  { state: "composing", label: "Composing an answer" },
] as const;

function ThinkingIndicator() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (phase >= THINKING_PHASES.length - 1) return;
    const t = setTimeout(() => setPhase((p) => p + 1), 1100);
    return () => clearTimeout(t);
  }, [phase]);

  const { state, label } = THINKING_PHASES[phase];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <ThinkingOrb state={state} size={20} speed={0.9} />
      <span style={{ fontSize: 14, fontWeight: 400, color: "var(--foreground-muted)" }}>
        {label}…
      </span>
    </div>
  );
}

// Bucket a conversation by how recently it was last active.
function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  if (days <= 30) return "Previous 30 days";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

// Rebuild the in-memory message list from a stored thread transcript.
type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown>;
};

function fromStored(m: StoredMessage): Message {
  if (m.role === "user") return { id: m.id, role: "user", text: m.content };
  const meta = m.metadata ?? {};
  return {
    id: m.id,
    role: "assistant",
    data: { answer: m.content, type: (meta.type as ChatResponse["type"]) ?? "document", ...meta },
  };
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch {
      /* non-fatal — sidebar just stays as-is */
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  async function openConversation(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    setLoadingThread(true);
    setMessages([]);
    try {
      const res = await fetch(`${API_URL}/conversations/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        setMessages(data.messages.map(fromStored));
      }
    } catch {
      /* leave empty on failure */
    } finally {
      setLoadingThread(false);
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) newChat();
    try {
      await fetch(`${API_URL}/conversations/${id}`, { method: "DELETE" });
    } catch {
      refreshConversations();
    }
  }

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
        body: JSON.stringify({ query: q, conversation_id: activeId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      if (data.conversation_id && data.conversation_id !== activeId) {
        setActiveId(data.conversation_id);
      }
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", data };
      setMessages((prev) => [...prev, assistantMsg]);
      refreshConversations();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        data: { answer: `Request failed: ${detail}`, type: "staff_fallback" },
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

  const isEmpty = messages.length === 0 && !loadingThread;

  // Group conversations for the sidebar (list is already newest-first).
  const grouped = new Map<string, ConversationSummary[]>();
  for (const c of conversations) {
    const label = groupLabel(c.updated_at);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push(c);
  }

  return (
    <DashboardShell>
      <style>{`
        .convo-rail { width: 260px; min-width: 260px; }
        .convo-item .convo-del { opacity: 0; }
        .convo-item:hover .convo-del { opacity: 1; }
        @media (max-width: 900px) { .convo-rail { display: none; } }
      `}</style>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", background: "var(--background)" }}>
        {/* Conversations sidebar */}
        <aside
          className="convo-rail"
          style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "var(--space-4)", flexShrink: 0 }}>
            <Button
              onClick={newChat}
              variant="primary-dark"
              full
              style={{ width: "100%", height: 40, fontSize: 14 }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New chat
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--space-3) var(--space-4)" }}>
            {conversations.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--foreground-subtle)", padding: "var(--space-3)", lineHeight: 1.5 }}>
                Your conversations will appear here.
              </p>
            )}
            {GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => (
              <div key={g} style={{ marginBottom: "var(--space-4)" }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--foreground-subtle)",
                    padding: "0 var(--space-3)",
                    marginBottom: 6,
                    letterSpacing: "0.01em",
                  }}
                >
                  {g}
                </p>
                {grouped.get(g)!.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <div
                      key={c.id}
                      className="convo-item"
                      onClick={() => openConversation(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        background: active ? "var(--hover-surface)" : "transparent",
                        transition: "background 150ms ease-out",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLDivElement).style.background = "var(--hover-surface)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: active ? "var(--foreground)" : "var(--foreground-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.title}
                      </span>
                      <Button
                        className="convo-del"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => deleteConversation(c.id, e)}
                        aria-label="Delete conversation"
                        style={{ flexShrink: 0 }}
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat column */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-8) var(--space-6)" }}>
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
                    <p style={{ fontSize: 16, color: "var(--foreground-muted)", lineHeight: 1.6 }}>
                      Ask anything about how the team works.
                    </p>
                  </div>

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
                      <Button
                        key={s}
                        onClick={() => submit(s)}
                        variant="secondary"
                        full
                        style={{ fontSize: 14 }}
                      >
                        {s}
                      </Button>
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
                          sourceExcerpt={msg.data.source_excerpt}
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
                  <ThinkingIndicator />
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
                placeholder={
                  activeId && messages.length > 0
                    ? "Ask a follow-up…"
                    : "Ask anything about how we work…"
                }
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
              <Button
                onClick={() => submit(input)}
                disabled={!input.trim() || loading}
                variant="primary-dark"
                full
                style={{ flexShrink: 0, height: 40, padding: "0 20px", fontSize: 14 }}
              >
                Ask
              </Button>
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
      </div>
    </DashboardShell>
  );
}
