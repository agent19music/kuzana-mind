import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?notion=denied", request.url));
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  const rootPageId = process.env.NOTION_ROOT_PAGE_ID ?? "";
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
  const backendApiSecret = process.env.BACKEND_API_SECRET ?? "";

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/?notion=error", request.url));
  }

  // Exchange code for access_token
  let accessToken: string;
  let workspaceName: string | undefined;
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Notion token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/?notion=error", request.url));
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    workspaceName = tokenData.workspace_name;
  } catch (err) {
    console.error("Notion token exchange error:", err);
    return NextResponse.redirect(new URL("/?notion=error", request.url));
  }

  // Get Clerk org_id to scope the ingest
  const { orgId } = await auth();

  // Trigger ingest — non-blocking on failure
  let ingestOk = true;
  try {
    const ingestRes = await fetch(`${backendUrl}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": backendApiSecret,
      },
      body: JSON.stringify({
        org_id: orgId ?? undefined,
        notion_api_key: accessToken,
        notion_root_page_id: rootPageId || undefined,
      }),
    });
    if (!ingestRes.ok) {
      console.error("Ingest after Notion connect failed:", await ingestRes.text());
      ingestOk = false;
    }
  } catch (err) {
    console.error("Could not reach backend for ingest:", err);
    ingestOk = false;
  }

  const destination = new URL("/chat", request.url);
  destination.searchParams.set("connected", "notion");
  if (workspaceName) destination.searchParams.set("workspace", workspaceName);
  if (!ingestOk) destination.searchParams.set("ingest", "pending");

  return NextResponse.redirect(destination);
}
