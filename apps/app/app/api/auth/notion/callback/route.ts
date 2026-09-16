import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  notionClientId,
  notionClientSecret,
  notionRedirectUri,
  searchPages,
} from "@/lib/notion-oauth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * Exchange Notion OAuth code, persist token on the org, pick a root page when
 * possible, and kick off ingest when a root is known.
 */
export async function GET(request: NextRequest) {
  const { userId, orgId, getToken } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clearCookies = (res: NextResponse) => {
    for (const name of [
      "notion_oauth_state",
      "notion_oauth_org",
      "notion_oauth_redirect",
    ]) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return res;
  };

  const fail = (reason: string) => {
    const dest = new URL("/admin/connections", request.url);
    dest.searchParams.set("notion", "error");
    dest.searchParams.set("reason", reason);
    return clearCookies(NextResponse.redirect(dest));
  };

  const error = request.nextUrl.searchParams.get("error");
  if (error) return fail(error);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("notion_oauth_state")?.value;
  const cookieOrg = request.cookies.get("notion_oauth_org")?.value;
  const redirectUri =
    request.cookies.get("notion_oauth_redirect")?.value ||
    notionRedirectUri(request.nextUrl.origin);

  if (!code || !state || !expectedState) return fail("missing_code");
  if (state !== expectedState) return fail("state_mismatch");
  if (cookieOrg && orgId && cookieOrg !== orgId) return fail("org_mismatch");
  if (!orgId) return fail("no_org");

  const clientId = notionClientId();
  const clientSecret = notionClientSecret();
  if (!clientId || !clientSecret) return fail("missing_client");

  let tokens;
  try {
    tokens = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });
  } catch (err) {
    console.error("Notion token exchange failed", err);
    return fail("token_exchange");
  }

  const envRoot = (process.env.NOTION_ROOT_PAGE_ID || "").trim();
  let rootPageId = envRoot;
  let pageCount = 0;
  let searchFailed = false;

  try {
    const pages = await searchPages(tokens.access_token);
    pageCount = pages.length;
    if (!rootPageId) {
      if (pages.length === 1) {
        rootPageId = pages[0].id;
      } else if (pages.length > 1) {
        // Prefer a top-level-ish page: first result as a soft default only when
        // exactly one page was shared; with many, force an explicit pick.
        rootPageId = "";
      }
    }
  } catch (err) {
    console.error("Notion search after OAuth failed", err);
    searchFailed = true;
  }

  const clerkToken = await getToken();
  if (!clerkToken) return fail("no_session");

  try {
    const res = await fetch(`${BACKEND_URL}/connections/notion/oauth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        workspace_id: tokens.workspace_id ?? null,
        workspace_name: tokens.workspace_name ?? null,
        root_page_id: rootPageId || null,
        trigger_ingest: Boolean(rootPageId),
      }),
    });
    if (!res.ok) {
      console.error("save notion oauth failed", await res.text());
      return fail("save_failed");
    }
  } catch (err) {
    console.error("save notion oauth error", err);
    return fail("save_failed");
  }

  const dest = new URL("/admin/connections", request.url);
  if (rootPageId) {
    dest.searchParams.set("notion", "connected");
    if (tokens.workspace_name) {
      dest.searchParams.set("workspace", tokens.workspace_name);
    }
  } else if (searchFailed) {
    dest.searchParams.set("notion", "pick_root");
  } else if (pageCount === 0) {
    dest.searchParams.set("notion", "no_pages");
  } else {
    dest.searchParams.set("notion", "pick_root");
    dest.searchParams.set("pages", String(pageCount));
  }
  return clearCookies(NextResponse.redirect(dest));
}
