import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";
import DashboardShell from "../../components/DashboardShell";

export default async function SettingsPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: "-0.025em",
              color: "#111",
              lineHeight: 1.2,
              marginBottom: 48,
            }}
          >
            Settings
          </h1>

          <SettingsClient orgName={org.name} orgLogo={org.imageUrl ?? null} />
        </div>
      </main>
    </DashboardShell>
  );
}
