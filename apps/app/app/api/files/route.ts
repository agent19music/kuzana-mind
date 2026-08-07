import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Lists this org's ingested documents, with large Tally forms collapsed into
// group entries. Passing ?group=<key> fetches one page of a group's responses
// instead — the files page calls that when a group is expanded, so a form with
// thousands of submissions is never serialized in full.
// The backend enforces org scoping from the JWT; this route forwards the token.
export async function GET(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const groupKey = params.get("group");

  const url = groupKey
    ? `${BACKEND_URL}/documents/group?key=${encodeURIComponent(groupKey)}` +
      `&limit=${encodeURIComponent(params.get("limit") ?? "50")}` +
      `&offset=${encodeURIComponent(params.get("offset") ?? "0")}`
    : `${BACKEND_URL}/documents`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) {
      return NextResponse.json(groupKey ? { documents: [], total: 0 } : { entries: [] }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not reach backend: ${message}` }, { status: 502 });
  }
}
