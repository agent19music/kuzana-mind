import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateState,
  notionClientId,
  notionRedirectUri,
} from "@/lib/notion-oauth";

export async function GET(request: NextRequest) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!orgId) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if (orgRole !== "org:admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const clientId = notionClientId();
  const redirectUri = notionRedirectUri(request.nextUrl.origin);
  if (!clientId) {
    return NextResponse.json(
      { error: "NOTION_CLIENT_ID is not set" },
      { status: 500 },
    );
  }

  const state = generateState();
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state });

  const res = NextResponse.redirect(authorizeUrl);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("notion_oauth_state", state, cookieOpts);
  res.cookies.set("notion_oauth_org", orgId, cookieOpts);
  res.cookies.set("notion_oauth_redirect", redirectUri, cookieOpts);
  return res;
}
