import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Lists this org's ingested documents (grouped by doc_id). The backend
// enforces org scoping from the JWT; this route just forwards the token.
export async function GET() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) {
      return NextResponse.json({ documents: [] }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not reach backend: ${message}` }, { status: 502 });
  }
}
