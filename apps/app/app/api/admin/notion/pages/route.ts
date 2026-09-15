import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
  const { orgId, orgRole, getToken } = await auth();
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/connections/notion/pages`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach backend";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
