import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Safely parse — backend may return plain text on 500
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend error (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? `Backend error ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not reach backend: ${message}` },
      { status: 502 }
    );
  }
}
