import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const { orgId, getToken } = await auth();
  if (!orgId) return NextResponse.json({ error: "No organisation" }, { status: 401 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Stream the multipart body directly to the backend — do NOT call request.formData()
  // here as that buffers everything in Next.js memory.
  const contentType = request.headers.get("content-type") ?? "";

  const res = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: request.body,
    // @ts-expect-error — Node 18+ fetch supports duplex streaming
    duplex: "half",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
