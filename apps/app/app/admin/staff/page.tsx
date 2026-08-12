import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StaffClient from "./StaffClient";
import DashboardShell from "../../../components/DashboardShell";
import PageFadeIn from "../../../components/PageFadeIn";

export default async function StaffPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  const client = await clerkClient();

  const [org, memberships, invitations, self] = await Promise.all([
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
    client.organizations.getOrganizationInvitationList({ organizationId: orgId, status: ["pending"] }),
    currentUser(),
  ]);

  const members = memberships.data.map((m) => ({
    id: m.id,
    role: m.role,
    email: m.publicUserData?.identifier ?? "",
    name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
      .filter(Boolean)
      .join(" "),
    joinedAt: new Date(m.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  const pendingInvitations = invitations.data.map((i) => ({
    id: i.id,
    email: i.emailAddress,
    role: i.role,
    invitedAt: new Date(i.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  const currentUserEmails = (self?.emailAddresses ?? []).map((e) => e.emailAddress.toLowerCase());

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
