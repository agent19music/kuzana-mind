import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { loadStaff } from "@/lib/staff";

// Polled by the staff page so a pending invite moves to "Members" the moment
// it's accepted, without the admin needing to refresh.
export async function GET() {
  const { orgId, orgRole } = await auth();

  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const data = await loadStaff(orgId);
  return NextResponse.json(data);
}
