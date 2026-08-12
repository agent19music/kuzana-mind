import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";
import DashboardShell from "../../../components/DashboardShell";
import PageFadeIn from "../../../components/PageFadeIn";

export default async function AnalyticsPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <PageFadeIn style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, marginBottom: 8 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 15, color: "#6b6b6b", lineHeight: 1.6, marginBottom: 40 }}>
            What your team is asking. Aggregate only — individual conversations stay private.
          </p>
          <AnalyticsClient />
        </PageFadeIn>
      </main>
    </DashboardShell>
  );
}
