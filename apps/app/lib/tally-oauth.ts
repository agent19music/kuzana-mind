import { createHash, randomBytes } from "crypto";

export const TALLY_AUTHORIZE = "https://api.tally.so/oauth/authorize";
export const TALLY_TOKEN = "https://api.tally.so/oauth/token";
export const TALLY_MCP = "https://api.tally.so/mcp";
export const TALLY_FORMS = "https://api.tally.so/forms";

export type TallyOAuthMode = "mcp" | "rest";

/** Product Connect uses REST-scoped OAuth so ingest can keep using load_from_tally. */
export function tallyClientId(mode: TallyOAuthMode = "rest"): string | undefined {
  if (mode === "mcp") {
    return process.env.TALLY_MCP_OAUTH_CLIENT_ID?.trim() || process.env.TALLY_OAUTH_CLIENT_ID?.trim();
  }
  return (
    process.env.TALLY_REST_OAUTH_CLIENT_ID?.trim() ||
    process.env.TALLY_OAUTH_CLIENT_ID?.trim() ||
    undefined
  );
}

export function tallyRedirectUri(origin?: string): string {
  const configured = process.env.TALLY_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  if (origin) return `${origin.replace(/\/$/, "")}/api/auth/tally/callback`;
  return "http://localhost:3001/api/auth/tally/callback";
}

export function tallyScope(mode: TallyOAuthMode = "rest"): string {
  if (mode === "mcp") return "mcp";
  return process.env.TALLY_OAUTH_SCOPE?.trim() || "user forms responses";
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return randomBytes(24).toString("hex");
}

export function buildAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(TALLY_AUTHORIZE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("scope", opts.scope);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export type TallyTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeCode(opts: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<TallyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    code_verifier: opts.codeVerifier,
  });
  const res = await fetch(TALLY_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`token exchange ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as TallyTokenResponse;
}

export type TallyFormSummary = { id: string; name: string; status?: string };

export async function listForms(
  accessToken: string,
  limit = 50,
): Promise<TallyFormSummary[]> {
  const res = await fetch(`${TALLY_FORMS}?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`list forms ${res.status}: ${text.slice(0, 400)}`);
  }
  const payload = JSON.parse(text) as unknown;
  let rows: unknown[] = [];
  if (Array.isArray(payload)) rows = payload;
  else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["items", "forms", "data"]) {
      if (Array.isArray(obj[key])) {
        rows = obj[key] as unknown[];
        break;
      }
    }
  }
  const out: TallyFormSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const f = row as Record<string, unknown>;
    const id = (f.id || f.formId) as string | undefined;
    if (!id) continue;
    out.push({
      id,
      name: String(f.name || f.title || id),
      status: typeof f.status === "string" ? f.status : undefined,
    });
  }
  return out;
}
