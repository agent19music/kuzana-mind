import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_SECRET = process.env.BACKEND_API_SECRET ?? "";
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET ?? "";

// Public route (see middleware). We verify the Svix signature here at the edge,
// then forward the verified event to the backend behind the shared API secret —
// the backend never trusts an unauthenticated caller.
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req, { signingSecret: CLERK_WEBHOOK_SECRET });
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new NextResponse("Webhook verification failed", { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/webhooks/clerk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BACKEND_API_SECRET ? { "X-API-Key": BACKEND_API_SECRET } : {}),
      },
      body: JSON.stringify({ type: evt.type, data: evt.data }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Backend rejected webhook ${evt.type}:`, text);
      // 200 to Clerk anyway — a non-2xx makes Clerk retry, and a persistent
      // backend error would loop. We've logged it; sync can be reconciled.
      return NextResponse.json({ received: true, forwarded: false });
    }
  } catch (err) {
    console.error("Could not reach backend for webhook:", err);
    return NextResponse.json({ received: true, forwarded: false });
  }

  return NextResponse.json({ received: true, forwarded: true });
}
