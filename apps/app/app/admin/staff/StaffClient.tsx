"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/Button";
import { Toast } from "../../../components/Toast";

const INVITE_COOLDOWN_SECONDS = 59;

// Counts down once per second after an invite email goes out, so the
// send/resend button can't be spammed into re-sending the same email.
function useCooldown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return [remaining, () => setRemaining(INVITE_COOLDOWN_SECONDS)] as const;
}

type Member = {
  id: string;
  role: string;
  email: string;
  name: string;
  joinedAt: string;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
};

function InviteForm({
  currentUserEmails,
  onSent,
}: {
  currentUserEmails: string[];
  onSent: (email: string) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  const isSelf = currentUserEmails.includes(email.trim().toLowerCase());

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || isSelf) return;
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
        setState("idle");
        setEmail("");
        onSent(data.email);
        startCooldown();
        router.refresh();
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="name@company.com"
          required
          style={{
            fontSize: 14,
            color: "#1a1a1a",
            background: "#ffffff",
            border: `1px solid ${isSelf ? "#fecaca" : "#e5e5e5"}`,
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
      {cooldown > 0 ? (
        <span style={{ fontSize: 12, color: "#a3a3a3", padding: "9px 14px" }}>{cooldown}s</span>
      ) : (
        <Button
          type="submit"
          disabled={state === "loading" || !email.trim() || isSelf}
          variant="primary-dark"
        >
          {state === "loading" ? "Sending…" : "Send invite"}
        </Button>
      )}
      {isSelf ? (
        <p style={{ fontSize: 13, color: "#b91c1c", margin: 0, width: "100%" }}>
          You can&apos;t invite yourself.
        </p>
      ) : (
        message && (
          <p style={{ fontSize: 13, color: "#e05a5a", margin: 0, width: "100%" }}>
            {message}
          </p>
        )
      )}
    </form>
  );
}

function ResendButton({
  invitation,
  onSent,
}: {
  invitation: PendingInvitation;
  onSent: (email: string) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  async function resend() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to resend");
        setState("error");
        return;
      }
      setState("idle");
      onSent(data.email);
      startCooldown();
      router.refresh();
    } catch {
      setError("Could not reach server");
      setState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      {cooldown > 0 ? (
        <span style={{ fontSize: 12, color: "#a3a3a3" }}>{cooldown}s</span>
      ) : (
        <Button variant="secondary" size="sm" onClick={resend} disabled={state === "loading"}>
          {state === "loading" ? "Resending…" : "Resend invite"}
        </Button>
      )}
      {state === "error" && (
        <p style={{ fontSize: 12, color: "#e05a5a", margin: 0 }}>{error}</p>
      )}
    </div>
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

function PendingBadge() {
  return (
    <span
      style={{
        fontSize: 12,
        color: "#b45309",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 9999,
        padding: "2px 10px",
      }}
    >
      Pending
    </span>
  );
}

export default function StaffClient({
  members,
  pendingInvitations,
  currentUserEmails,
}: {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  currentUserEmails: string[];
}) {
  const [toast, setToast] = useState<string | null>(null);

  function announceSent(email: string) {
    setToast(`Invitation sent to ${email}. If it doesn't show up, ask them to check the Promotions tab.`);
  }

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
          <InviteForm currentUserEmails={currentUserEmails} onSent={announceSent} />
        </div>
      </section>

      {/* Pending invites */}
      {pendingInvitations.length > 0 && (
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 13, color: "#a3a3a3", margin: "0 0 16px 0", letterSpacing: "0.01em" }}>
            Pending invites — {pendingInvitations.length}
          </h2>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  {["Email", "Role", "Invited", "Status", ""].map((h) => (
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
                {pendingInvitations.map((invite, i) => (
                  <tr
                    key={invite.id}
                    style={{
                      borderBottom: i < pendingInvitations.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}
                  >
                    <td style={{ fontSize: 14, color: "#1a1a1a", padding: "16px 24px" }}>
                      {invite.email}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <RoleBadge role={invite.role} />
                    </td>
                    <td style={{ fontSize: 14, color: "#a3a3a3", padding: "16px 24px" }}>
                      {invite.invitedAt}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <PendingBadge />
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <ResendButton invitation={invite} onSent={announceSent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
