import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "../components/DashboardShell";
import GradientBanner from "../components/GradientBanner";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

type OrgStats = {
  chunk_count: number;
  last_synced: string | null;
  source_types: string[];
};

const ACTIVITY = [
  { label: "Knowledge sync completed", sub: "247 new chunks indexed", time: "2h ago", dot: "#22c55e" },
  { label: "Company Handbook updated", sub: "Re-indexed via Notion", time: "5h ago", dot: "#22c55e" },
  { label: "3 new members joined", sub: "Invited by admin", time: "1d ago", dot: "#60a5fa" },
  { label: "Q2 OKRs uploaded", sub: "PDF · 156 KB", time: "2d ago", dot: "#a78bfa" },
  { label: "Benefits Guide indexed", sub: "2,400 chunks · Google Docs", time: "4d ago", dot: "#22c55e" },
];

export default async function DashboardPage() {
  const { userId, orgId, orgRole, getToken } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");

  const client = await clerkClient();
  const [org, memberships] = await Promise.all([
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
  ]);
  const isAdmin = orgRole === "org:admin";
  const memberCount = memberships.totalCount ?? memberships.data.length;

  let stats: OrgStats | null = null;
  try {
    const token = await getToken();
    if (token) {
      const r = await fetch(`${BACKEND_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (r.ok) stats = await r.json();
    }
  } catch { /* stats stay null */ }

  const lastSynced = stats?.last_synced
    ? new Date(stats.last_synced).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Never";

  const sourceCount = stats?.source_types?.length ?? 0;

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>

          {/* Page heading */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, margin: 0 }}>
              Overview
            </h1>
          </div>

          {/* Stat row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: "#E8E8E8",
              border: "1px solid #E8E8E8",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 40,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {[
              { label: "Chunks indexed", value: stats ? stats.chunk_count.toLocaleString() : "—", sub: `Last synced ${lastSynced}` },
              { label: "Team members", value: String(memberCount), sub: isAdmin ? "You are admin" : "Member access" },
              { label: "Sources connected", value: String(sourceCount), sub: sourceCount > 0 ? (stats?.source_types ?? []).join(", ") : "No sources yet" },
              { label: "Status", value: "Active", sub: "All systems operational" },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  position: "relative",
                  background: i === 1 ? "#b8e4ff" : "#fff",
                  padding: "24px 28px",
                  minHeight: i === 1 ? 320 : undefined,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  overflow: "hidden",
                }}
              >
                {i === 1 && <GradientBanner />}
                <p style={{ position: "relative", fontSize: 12, fontWeight: 400, color: "#aaa", margin: 0, letterSpacing: "-0.01em" }}>
                  {s.label}
                </p>
                <p style={{ position: "relative", fontSize: 28, fontWeight: 400, letterSpacing: "-0.03em", color: "#111", margin: 0, lineHeight: 1.15 }}>
                  {s.value}
                </p>
                <p style={{ position: "relative", fontSize: 12, color: "#bbb", margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Two-column lower section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>

            {/* Recent activity */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 400, color: "#111", margin: 0, letterSpacing: "-0.01em" }}>
                  Recent activity
                </h2>
                {isAdmin && (
                  <Link href="/admin/connections" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>
                    View connections →
                  </Link>
                )}
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E8E8E8",
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {ACTIVITY.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 20px",
                      borderBottom: i < ACTIVITY.length - 1 ? "1px solid #F3F3F3" : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: a.dot,
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${a.dot}22`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 400, color: "#222", margin: 0, lineHeight: 1.35 }}>
                        {a.label}
                      </p>
                      <p style={{ fontSize: 12, color: "#999", margin: 0, marginTop: 1 }}>
                        {a.sub}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: "#bbb", flexShrink: 0 }}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 400, color: "#111", marginBottom: 16, letterSpacing: "-0.01em" }}>
                Quick actions
              </h2>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E8E8E8",
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {[
                  { href: "/chat", label: "Ask a question", sub: "Search your knowledge base" },
                  ...(isAdmin
                    ? [
                        { href: "/admin/connections", label: "Manage connections", sub: "Notion, Google Docs, Drive" },
                        { href: "/admin/files", label: "Upload files", sub: "PDF, Word, Markdown, CSV" },
                        { href: "/admin/staff", label: "Invite team member", sub: `${memberCount} members` },
                      ]
                    : []),
                ].map((action, i, arr) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="dashboard-action-link"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "14px 18px",
                      textDecoration: "none",
                      borderBottom: i < arr.length - 1 ? "1px solid #F3F3F3" : "none",
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 400, color: "#222" }}>{action.label}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{action.sub}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </DashboardShell>
  );
}
