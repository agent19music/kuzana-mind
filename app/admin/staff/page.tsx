import { auth, clerkClient } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");
  if (orgRole !== "org:admin") redirect("/dashboard");

  const client = await clerkClient();

  const [org, memberships] = await Promise.all([
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
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

  return (
    <div style={{ minHeight: "100svh", background: "#fafafa" }}>
      {/* Header */}
      <header
        style={{
          height: 72,
          borderBottom: "1px solid #e5e5e5",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          padding: "0 48px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            width: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/athena-mind-logo.png" alt="Athena" width={32} height={32} />
            <span style={{ fontSize: 15, letterSpacing: "-0.01em", color: "#1a1a1a" }}>Athena</span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/chat" style={{ fontSize: 14, color: "#6b6b6b", textDecoration: "none" }}>Chat</Link>
            <Link href="/admin/staff" style={{ fontSize: 14, color: "#1a1a1a", textDecoration: "none" }}>Team</Link>
            <Link href="/admin/settings" style={{ fontSize: 14, color: "#6b6b6b", textDecoration: "none" }}>Settings</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 48px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
          <Link href="/dashboard" style={{ fontSize: 14, color: "#a3a3a3", textDecoration: "none" }}>
            Dashboard
          </Link>
          <span style={{ fontSize: 14, color: "#d4d4d4" }}>/</span>
          <span style={{ fontSize: 14, color: "#1a1a1a" }}>Team</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 64 }}>
          <h1 style={{ fontSize: 40, letterSpacing: "-0.02em", color: "#1a1a1a", lineHeight: 1.15, margin: 0 }}>
            {org.name}
          </h1>
        </div>

        <StaffClient members={members} />
      </main>
    </div>
  );
}
