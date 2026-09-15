import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  tallyClientId,
  tallyRedirectUri,
  tallyScope,
  type TallyOAuthMode,
} from "@/lib/tally-oauth";

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

  const modeParam = request.nextUrl.searchParams.get("mode");
  // Product default: REST-scoped OAuth (forms/responses) for indexed ingest.
  const mode: TallyOAuthMode = modeParam === "mcp" ? "mcp" : "rest";
  const clientId = tallyClientId(mode);
  const redirectUri = tallyRedirectUri(request.nextUrl.origin);
  if (!clientId) {
    return NextResponse.json(
      { error: "TALLY_OAUTH_CLIENT_ID is not set" },
      { status: 500 },
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    scope: tallyScope(mode),
    state,
    codeChallenge: challenge,
  });

  const res = NextResponse.redirect(authorizeUrl);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("tally_oauth_verifier", verifier, cookieOpts);
  res.cookies.set("tally_oauth_state", state, cookieOpts);
  res.cookies.set("tally_oauth_mode", mode, cookieOpts);
  res.cookies.set("tally_oauth_org", orgId, cookieOpts);
  res.cookies.set("tally_oauth_redirect", redirectUri, cookieOpts);
  return res;
}
