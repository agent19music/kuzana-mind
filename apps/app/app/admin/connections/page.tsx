import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "../../../components/DashboardShell";
import ConnectionsClient from "./ConnectionsClient";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

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

export default async function ConnectionsPage() {
  const { userId, orgId, orgRole, getToken } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  let stats: OrgStats | null = null;
  let jobs: Job[] = [];
  let notifiedIntegrations: string[] = [];
  try {
    const token = await getToken();
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, statusRes, notifyRes] = await Promise.all([
        fetch(`${BACKEND_URL}/stats`, { headers, cache: "no-store" }),
        fetch(`${BACKEND_URL}/ingest/status`, { headers, cache: "no-store" }),
        fetch(`${BACKEND_URL}/integrations/notify`, { headers, cache: "no-store" }),
      ]);
      if (statsRes.ok) stats = await statsRes.json();
      if (statusRes.ok) jobs = (await statusRes.json()).jobs ?? [];
      if (notifyRes.ok) notifiedIntegrations = (await notifyRes.json()).integrations ?? [];
    }
  } catch {
    /* backend unreachable — client renders with empty state */
  }

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, margin: 0 }}>
              Connections
            </h1>
            <p style={{ fontSize: 14, color: "#888", marginTop: 8, lineHeight: 1.6 }}>
              Manage knowledge sources. Connected services are automatically re-indexed on sync.
            </p>
          </div>
          <ConnectionsClient stats={stats} jobs={jobs} notifiedIntegrations={notifiedIntegrations} />
        </div>
      </main>
    </DashboardShell>
  );
}
