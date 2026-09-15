import { randomBytes } from "crypto";

export const NOTION_AUTHORIZE = "https://api.notion.com/v1/oauth/authorize";
export const NOTION_TOKEN = "https://api.notion.com/v1/oauth/token";
export const NOTION_SEARCH = "https://api.notion.com/v1/search";
export const NOTION_VERSION = "2022-06-28";

export function notionClientId(): string | undefined {
  return process.env.NOTION_CLIENT_ID?.trim() || undefined;
}

export function notionClientSecret(): string | undefined {
  return process.env.NOTION_CLIENT_SECRET?.trim() || undefined;
}

export function notionRedirectUri(origin?: string): string {
  const configured = process.env.NOTION_REDIRECT_URI?.trim();
  if (configured) return configured;
  if (origin) return `${origin.replace(/\/$/, "")}/api/auth/notion/callback`;
  return "http://localhost:3001/api/auth/notion/callback";
}

export function generateState(): string {
  return randomBytes(24).toString("hex");
}

export function buildAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(NOTION_AUTHORIZE);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("state", opts.state);
  return url.toString();
}

export type NotionTokenResponse = {
  access_token: string;
  token_type?: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string | null;
  duplicated_template_id?: string | null;
};

export async function exchangeCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<NotionTokenResponse> {
  const credentials = Buffer.from(
    `${opts.clientId}:${opts.clientSecret}`,
  ).toString("base64");
  const res = await fetch(NOTION_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`token exchange ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as NotionTokenResponse;
}

export type NotionPageSummary = {
  id: string;
  title: string;
  url?: string;
};

function pageTitle(page: Record<string, unknown>): string {
  const props = page.properties;
  if (props && typeof props === "object") {
    for (const value of Object.values(props as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const prop = value as Record<string, unknown>;
      if (prop.type === "title" && Array.isArray(prop.title)) {
        const parts = (prop.title as Array<{ plain_text?: string }>)
          .map((t) => t.plain_text || "")
          .join("");
        if (parts) return parts;
      }
    }
  }
  return "Untitled";
}

/** Pages the OAuth bot can see (shared during Notion consent). */
export async function searchPages(
  accessToken: string,
  pageSize = 50,
): Promise<NotionPageSummary[]> {
  const res = await fetch(NOTION_SEARCH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      page_size: pageSize,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`notion search ${res.status}: ${text.slice(0, 400)}`);
  }
  const payload = JSON.parse(text) as {
    results?: Array<Record<string, unknown>>;
  };
  const out: NotionPageSummary[] = [];
  for (const page of payload.results || []) {
    if (page.object !== "page" || typeof page.id !== "string") continue;
    out.push({
      id: page.id,
      title: pageTitle(page),
      url: typeof page.url === "string" ? page.url : undefined,
    });
  }
  return out;
}
