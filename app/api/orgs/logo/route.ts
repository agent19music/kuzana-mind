import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const client = await clerkClient();
  const org = await client.organizations.updateOrganizationLogo(orgId, {
    uploaderUserId: userId,
    file,
  });

  return NextResponse.json({ imageUrl: org.imageUrl });
}
