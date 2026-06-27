import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orgName, logoUrl, notionApiKey, notionRootPageId, publicDocIds } = body;

  if (!orgName?.trim()) {
    return NextResponse.json({ error: "Organisation name is required" }, { status: 400 });
  }

  // Create Clerk organisation — createdBy auto-grants the user admin role
  const client = await clerkClient();
  let org: Awaited<ReturnType<typeof client.organizations.createOrganization>>;
  try {
    org = await client.organizations.createOrganization({
      name: orgName.trim(),
      createdBy: userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create organisation";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Send config to backend — stores org record and triggers first ingest
  const ingestBody = {
    org_id: org.id,
    org_name: orgName.trim(),
    org_logo_url: logoUrl?.trim() || null,
    notion_api_key: notionApiKey?.trim() || null,
    notion_root_page_id: notionRootPageId?.trim() || null,
    public_doc_ids: Array.isArray(publicDocIds) ? publicDocIds.filter(Boolean) : [],
  };

  try {
    const res = await fetch(`${BACKEND_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ingestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Ingest failed for org ${org.id}:`, text);
      // Don't fail the whole onboarding — org is created, ingest can be retried
    }
  } catch (err) {
    console.error("Could not reach backend for ingest:", err);
  }

  return NextResponse.json({ org_id: org.id, name: org.name });
}
