import { auth, clerkClient } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

const arrowIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: "#6b6b6b", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "#1a1a1a", margin: 0 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 13, color: "#a3a3a3", margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        background: "#ffffff",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 200ms ease-out, transform 200ms ease-out",
      }}
      className="hover:!border-[#1a1a1a] hover:!-translate-y-[2px]"
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "#1a1a1a",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 15,
          color: "#6b6b6b",
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
        }}
      >
        {description}
      </p>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontWeight: 500,
          color: "#1a1a1a",
          marginTop: 8,
        }}
      >
        {cta} {arrowIcon}
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const isAdmin = orgRole === "org:admin";

  return (
    <div style={{ minHeight: "100svh", background: "#fafafa" }}>
      {/* Nav */}
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
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Image src="/kuzana-mind-logo.png" alt="Kuzana Mind" width={32} height={32} />
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "#1a1a1a" }}>
              Kuzana Mind
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/chat" style={{ fontSize: 14, fontWeight: 500, color: "#6b6b6b", textDecoration: "none" }}>
              Chat
            </Link>
            {isAdmin && (
              <Link href="/admin/staff" style={{ fontSize: 14, fontWeight: 500, color: "#6b6b6b", textDecoration: "none" }}>
                Admin
              </Link>
            )}
            <Link href="/admin/settings" style={{ fontSize: 14, fontWeight: 500, color: "#6b6b6b", textDecoration: "none" }}>
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 48px",
        }}
      >
        {/* Heading */}
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#a3a3a3", marginBottom: 12 }}>
            {org.name}
          </p>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1a1a1a",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Your knowledge base
            <br />
            is ready.
          </h1>
          <p style={{ fontSize: 17, color: "#6b6b6b", lineHeight: 1.6, maxWidth: 520 }}>
            Ask anything about how your organisation works. Get answers from your
            documents — never a guess.
          </p>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: 24, marginBottom: 48 }}
        >
          <StatCard label="Status" value="Active" sub="Knowledge base synced" />
          <StatCard label="Organisation" value={org.name} sub={isAdmin ? "You are admin" : "Member access"} />
          <StatCard label="Sources" value="Notion + Docs" sub="Syncs automatically" />
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 24 }}>
          <ActionCard
            href="/chat"
            title="Ask a question"
            description="Get instant answers from your organisation's documents. Sources always cited."
            cta="Open chat"
          />
          {isAdmin && (
            <ActionCard
              href="/admin/staff"
              title="Manage team"
              description="Invite members, upload a staff list, or manage access roles."
              cta="Go to admin"
            />
          )}
          <ActionCard
            href="/admin/settings"
            title="Settings"
            description="Update your Notion connection, logo, and knowledge sources."
            cta="Open settings"
          />
        </div>
      </main>
    </div>
  );
}
