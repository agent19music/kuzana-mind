"use client";

import { useState } from "react";

type Member = {
  id: string;
  role: string;
  email: string;
  name: string;
  joinedAt: string;
};

function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to send");
        setState("error");
      } else {
        setMessage(`Invitation sent to ${data.email}`);
        setState("done");
        setEmail("");
      }
    } catch {
      setMessage("Could not reach server");
      setState("error");
    }
  }

  return (
    <form onSubmit={send} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 }}>
        <label style={{ fontSize: 13, color: "#6b6b6b" }}>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
          style={{
            fontSize: 14,
            color: "#1a1a1a",
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: "9px 14px",
            outline: "none",
            width: "100%",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, color: "#6b6b6b" }}>Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            fontSize: 14,
            color: "#1a1a1a",
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: "9px 14px",
            outline: "none",
          }}
        >
          <option value="org:member">Member</option>
          <option value="org:admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={state === "loading"}
        style={{
          fontSize: 14,
          color: state === "loading" ? "#a3a3a3" : "#ffffff",
          background: state === "loading" ? "#e5e5e5" : "#1a1a1a",
          border: "none",
          borderRadius: 8,
          padding: "10px 20px",
          cursor: state === "loading" ? "not-allowed" : "pointer",
          transition: "background 150ms",
          whiteSpace: "nowrap",
        }}
      >
        {state === "loading" ? "Sending…" : "Send invite"}
      </button>
      {message && (
        <p
          style={{
            fontSize: 13,
            color: state === "error" ? "#e05a5a" : "#6b6b6b",
            margin: 0,
            width: "100%",
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "org:admin";
  return (
    <span
      style={{
        fontSize: 12,
        color: isAdmin ? "#1a1a1a" : "#6b6b6b",
        background: isAdmin ? "#f0f0f0" : "transparent",
        border: "1px solid #e5e5e5",
        borderRadius: 9999,
        padding: "2px 10px",
      }}
    >
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

export default function StaffClient({ members }: { members: Member[] }) {
  return (
    <div>
      {/* Invite section */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 16px 0", letterSpacing: "0.01em" }}>
          Invite
        </h2>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 32,
          }}
        >
          <p style={{ fontSize: 15, color: "#6b6b6b", margin: "0 0 24px 0", lineHeight: 1.55 }}>
            Send an invitation to add someone to this organisation.
          </p>
          <InviteForm />
        </div>
      </section>

      {/* Members table */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 16px 0", letterSpacing: "0.01em" }}>
          Members — {members.length}
        </h2>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {members.length === 0 ? (
            <p style={{ fontSize: 15, color: "#a3a3a3", padding: 32, margin: 0 }}>
              No members yet.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  {["Name", "Email", "Role", "Joined"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        fontSize: 12,
                        color: "#a3a3a3",
                        padding: "12px 24px",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: i < members.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}
                  >
                    <td style={{ fontSize: 14, color: "#1a1a1a", padding: "16px 24px" }}>
                      {m.name || "—"}
                    </td>
                    <td style={{ fontSize: 14, color: "#6b6b6b", padding: "16px 24px" }}>
                      {m.email}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <RoleBadge role={m.role} />
                    </td>
                    <td style={{ fontSize: 14, color: "#a3a3a3", padding: "16px 24px" }}>
                      {m.joinedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Staff directory note */}
      <section>
        <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 16px 0", letterSpacing: "0.01em" }}>
          Staff directory
        </h2>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 32,
          }}
        >
          <p style={{ fontSize: 15, color: "#6b6b6b", margin: "0 0 8px 0", lineHeight: 1.55 }}>
            The staff directory is a JSON file used as a fallback when Athena cannot find a
            relevant document. It contains contact info — name, role, department, email.
          </p>
          <p style={{ fontSize: 13, color: "#a3a3a3", margin: 0 }}>
            Bulk upload via UI coming soon. For now, edit{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                background: "#f5f5f5",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              backend/staff_directory.json
            </code>{" "}
            directly.
          </p>
        </div>
      </section>
    </div>
  );
}
