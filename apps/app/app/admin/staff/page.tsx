import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StaffClient from "./StaffClient";
import DashboardShell from "../../../components/DashboardShell";
import PageFadeIn from "../../../components/PageFadeIn";
import { loadStaff } from "@/lib/staff";

export default async function StaffPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  const { members, pendingInvitations, currentUserEmails } = await loadStaff(orgId);

  return (
    <DashboardShell>
      <main style={{ flex: 1, overflowY: "auto", background: "#FAFAFA" }}>
        <PageFadeIn style={{ maxWidth: 880, margin: "0 auto", padding: "56px 48px 80px" }}>
            <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.025em", color: "#111", lineHeight: 1.2, marginBottom: 48 }}>
            Team
          </h1>
          <StaffClient
            members={members}
            pendingInvitations={pendingInvitations}
            currentUserEmails={currentUserEmails}
          />
        </PageFadeIn>
      </main>
    </DashboardShell>
  );
}
