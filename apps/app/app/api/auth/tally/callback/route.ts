import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  listForms,
  tallyClientId,
  tallyRedirectUri,
  type TallyOAuthMode,
} from "@/lib/tally-oauth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * Exchange the Tally OAuth code, persist tokens on the org, auto-select forms
 * when listing works, and kick off ingest when form ids are known.
 */
export async function GET(request: NextRequest) {
  const { userId, orgId, getToken } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clearCookies = (res: NextResponse) => {
    for (const name of [
      "tally_oauth_verifier",
      "tally_oauth_state",
      "tally_oauth_mode",
      "tally_oauth_org",
      "tally_oauth_redirect",
    ]) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return res;
  };

  const fail = (reason: string) => {
    const dest = new URL("/admin/connections", request.url);
    dest.searchParams.set("tally", "error");
    dest.searchParams.set("reason", reason);
    return clearCookies(NextResponse.redirect(dest));
  };

  const error = request.nextUrl.searchParams.get("error");
  if (error) return fail(error);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("tally_oauth_state")?.value;
  const verifier = request.cookies.get("tally_oauth_verifier")?.value;
  const mode = (request.cookies.get("tally_oauth_mode")?.value ||
    "rest") as TallyOAuthMode;
  const cookieOrg = request.cookies.get("tally_oauth_org")?.value;
  const redirectUri =
    request.cookies.get("tally_oauth_redirect")?.value ||
    tallyRedirectUri(request.nextUrl.origin);

  if (!code || !state || !verifier || !expectedState) return fail("missing_code");
  if (state !== expectedState) return fail("state_mismatch");
  if (cookieOrg && orgId && cookieOrg !== orgId) return fail("org_mismatch");
  if (!orgId) return fail("no_org");

  const clientId = tallyClientId(mode);
  if (!clientId) return fail("missing_client_id");

  let tokens;
  try {
    tokens = await exchangeCode({
      code,
      codeVerifier: verifier,
      clientId,
      redirectUri,
    });
  } catch (err) {
    console.error("Tally token exchange failed", err);
    return fail("token_exchange");
  }

  let formIds: string[] = [];
  let formListFailed = false;
  try {
    const forms = await listForms(tokens.access_token);
    formIds = forms.map((f: { id: string }) => f.id);
  } catch (err) {
    console.error("Tally list forms after OAuth failed", err);
    formListFailed = true;
  }

  const clerkToken = await getToken();
  if (!clerkToken) return fail("no_session");

  try {
    const res = await fetch(`${BACKEND_URL}/connections/tally/oauth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_in: tokens.expires_in ?? null,
        scope: tokens.scope ?? null,
        form_ids: formIds,
        trigger_ingest: formIds.length > 0,
      }),
    });
    if (!res.ok) {
      console.error("save tally oauth failed", await res.text());
      return fail("save_failed");
    }
  } catch (err) {
    console.error("save tally oauth error", err);
    return fail("save_failed");
  }

  const dest = new URL("/admin/connections", request.url);
  if (formIds.length > 0) {
    dest.searchParams.set("tally", "connected");
    dest.searchParams.set("forms", String(formIds.length));
  } else if (formListFailed) {
    dest.searchParams.set("tally", "pick_forms");
  } else {
    dest.searchParams.set("tally", "no_forms");
  }
  return clearCookies(NextResponse.redirect(dest));
}
