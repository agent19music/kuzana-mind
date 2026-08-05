import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_SECRET = process.env.BACKEND_API_SECRET ?? "";

export async function POST(request: NextRequest) {
  const { orgId, orgRole, getToken } = await auth();

  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  // Optional: an admin can paste/update a Drive folder id to sync. Omitted for a
  // plain "re-index my configured sources" sync (backend falls back to stored config).
  let driveFolderId: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.drive_folder_id === "string" && body.drive_folder_id.trim()) {
      driveFolderId = body.drive_folder_id.trim();
    }
  } catch {
    /* no body — plain re-index */
  }

  try {
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BACKEND_API_SECRET ? { "X-API-Key": BACKEND_API_SECRET } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        org_id: orgId,
        ...(driveFolderId ? { drive_folder_id: driveFolderId } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach backend";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
