import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const { getToken, orgId, orgRole } = await auth();
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let plan = "pro";
  let interval = "month";
  try {
    const body = await request.json();
    if (typeof body?.plan === "string") plan = body.plan;
    if (body?.interval === "year" || body?.interval === "month") interval = body.interval;
  } catch {
    /* no body — default Pro monthly */
  }

  let quantity = 1;
  try {
    const client = await clerkClient();
    // totalCount is preferred; list is capped at 100 memberships.
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    quantity = Math.max(1, memberships.totalCount ?? memberships.data.length ?? 1);
  } catch {
    /* backend will fall back to its local count */
  }

  try {
    const res = await fetch(`${BACKEND_URL}/billing/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan, interval, quantity }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach backend";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
