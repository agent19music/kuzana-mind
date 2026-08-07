import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Forwards doc_id/source_type straight through as query params — the backend
// enforces org scoping from the JWT; this route just relays the token.
export async function GET(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const docId = params.get("doc_id");
  if (!docId) return NextResponse.json({ error: "doc_id is required" }, { status: 400 });

  const backendUrl = new URL("/documents/preview", BACKEND_URL);
  backendUrl.searchParams.set("doc_id", docId);
  const sourceType = params.get("source_type");
  if (sourceType) backendUrl.searchParams.set("source_type", sourceType);

  try {
    const res = await fetch(backendUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not reach backend: ${message}` }, { status: 502 });
  }
}
