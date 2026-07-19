import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "../../components/DashboardShell";
import ConnectionsClient from "./ConnectionsClient";

export default async function ConnectionsPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

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
          <ConnectionsClient />
        </div>
      </main>
    </DashboardShell>
  );
}
