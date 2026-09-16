import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function inviteLandingUrl(request: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  return `${base}/invite`;
}

export async function POST(request: NextRequest) {
  const { orgId, orgRole, userId, getToken } = await auth();

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

  // Seat cap — refuse before Clerk creates an invitation that would exceed the plan.
  try {
    const token = await getToken();
    if (token) {
      const [entitlementRes, client] = await Promise.all([
        fetch(`${BACKEND_URL}/billing/entitlement`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        clerkClient(),
      ]);

      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 1,
      });
      const memberCount = memberships.totalCount ?? memberships.data.length;
      if (entitlementRes.ok) {
        const ent = await entitlementRes.json();
        const maxSeats = ent?.limits?.seats ?? 20;
        if (memberCount + 1 > maxSeats) {
          return NextResponse.json(
            {
              error: `Seat limit reached (${memberCount}/${maxSeats}). Upgrade your plan to invite more members.`,
              code: "plan_limit",
            },
            { status: 402 }
          );
        }
      }
    }
  } catch {
    /* if billing check is unreachable, fall through — Clerk invite still works */
  }

  try {
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: normalizedEmail,
      role: inviteRole,
      inviterUserId: userId ?? undefined,
      redirectUrl: inviteLandingUrl(request),
    });
    return NextResponse.json({ id: invitation.id, email: invitation.emailAddress });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
