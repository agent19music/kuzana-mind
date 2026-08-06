import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BillingClient from "./BillingClient";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_API_SECRET = process.env.BACKEND_API_SECRET ?? "";

// Starter plan limits — matches the "Starter" entry in BillingClient's PLANS.
const MAX_CHUNKS = 2500;
const MAX_MEMBERS = 20;

export default async function BillingPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");

  let memberCount = 1;
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    memberCount = memberships.totalCount ?? memberships.data.length;
  } catch { /* use fallback */ }

  let chunkCount = 0;
  if (BACKEND_API_SECRET) {
    try {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        headers: { "X-API-Key": BACKEND_API_SECRET, "X-Org-Id": orgId },
        cache: "no-store",
      });
      if (res.ok) chunkCount = (await res.json()).chunk_count ?? 0;
    } catch { /* chunkCount stays 0 */ }
  }

  return (
    <BillingClient
      used={{ chunks: chunkCount, maxChunks: MAX_CHUNKS, members: memberCount, maxMembers: MAX_MEMBERS }}
    />
  );
}
