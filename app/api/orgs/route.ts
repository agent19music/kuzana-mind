import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const client = await clerkClient();
  await client.organizations.updateOrganization(orgId, { name: name.trim() });
  return NextResponse.json({ ok: true });
}

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const { userId, orgId: existingOrgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orgName, logoUrl, notionApiKey, notionRootPageId, publicDocIds } = body;

  const client = await clerkClient();
  let orgId: string;
  let name: string;
  const isNew = !existingOrgId;

  if (existingOrgId) {
    // Org already exists (created by Clerk's sign-up UI) — use it
    orgId = existingOrgId;
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    name = org.name;
  } else {
    // First time — create the org
    if (!orgName?.trim()) {
      return NextResponse.json({ error: "Organisation name is required" }, { status: 400 });
    }
    try {
      const org = await client.organizations.createOrganization({
        name: orgName.trim(),
        createdBy: userId,
      });
      orgId = org.id;
      name = org.name;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create organisation";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Send config to backend — stores org record and triggers first ingest
  const ingestBody = {
    org_id: orgId,
    org_name: name,
    org_logo_url: logoUrl?.trim() || null,
    notion_api_key: notionApiKey?.trim() || null,
    notion_root_page_id: notionRootPageId?.trim() || null,
    public_doc_ids: Array.isArray(publicDocIds) ? publicDocIds.filter(Boolean) : [],
  };

  const backendApiSecret = process.env.BACKEND_API_SECRET ?? "";

  try {
    const res = await fetch(`${BACKEND_URL}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(backendApiSecret ? { "X-API-Key": backendApiSecret } : {}),
      },
      body: JSON.stringify(ingestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Ingest failed for org ${orgId}:`, text);
      // Don't fail the whole onboarding — org is created, ingest can be retried
    }
  } catch (err) {
    console.error("Could not reach backend for ingest:", err);
  }

  // Mark this org as fully onboarded
  try {
    await client.organizations.updateOrganization(orgId, {
      publicMetadata: { onboarded: true },
    });
  } catch (err) {
    console.error("Could not set onboarded metadata:", err);
    // Non-fatal — user can still proceed, they'll hit onboarding again on next load
  }

  return NextResponse.json({ org_id: orgId, name, isNew });
}
