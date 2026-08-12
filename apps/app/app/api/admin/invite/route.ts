import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { orgId, orgRole, userId } = await auth();

  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();
  const inviteRole = role === "org:admin" ? "org:admin" : "org:member";

  const self = await currentUser();
  const ownsEmail = self?.emailAddresses.some(
    (e) => e.emailAddress.toLowerCase() === normalizedEmail
  );
  if (ownsEmail) {
    return NextResponse.json({ error: "You can't invite yourself.", code: "SELF_INVITE" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: normalizedEmail,
      role: inviteRole,
      inviterUserId: userId ?? undefined,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athena.uzskicorp.agency"}/invite`,
    });
    return NextResponse.json({ id: invitation.id, email: invitation.emailAddress });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
