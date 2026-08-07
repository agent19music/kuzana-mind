import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_SECRET = process.env.BACKEND_API_SECRET ?? "";

export async function POST(request: NextRequest) {
  const { orgId, orgRole, getToken } = await auth();

  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });
  if (orgRole !== "org:admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  // Optional connector config from the setup modals (Notion / Tally / Drive).
  // All omitted for a plain "re-index my configured sources" sync, in which
  // case the backend falls back to the org's stored config.
  const config: Record<string, unknown> = {};
  try {
    const body = await request.json();

    for (const key of [
      "notion_api_key",
      "notion_root_page_id",
      "tally_api_key",
      "drive_folder_id",
    ] as const) {
      if (typeof body?.[key] === "string" && body[key].trim()) config[key] = body[key].trim();
    }

    for (const key of ["tally_form_ids", "public_doc_ids"] as const) {
      if (Array.isArray(body?.[key])) {
        const ids = body[key]
          .filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()))
          .map((id: string) => id.trim());
        if (ids.length) config[key] = ids;
      }
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
      body: JSON.stringify({ org_id: orgId, ...config }),
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
