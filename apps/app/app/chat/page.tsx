import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "../../components/DashboardShell";
import ChatClient from "./ChatClient";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default async function ChatPage() {
  const { userId, orgId, orgRole, getToken } = await auth();

  if (!userId) redirect("/login");
  if (!orgId) redirect("/onboarding");

  const isAdmin = orgRole === "org:admin";

  // Gate chat behind having at least one ingested source — otherwise every
  // query is guaranteed to be a "no documentation found" miss. Fails open
  // (chunkCount stays null) on any fetch error so a flaky backend blocks
  // nobody; only a confirmed zero hides the chat UI.
  let chunkCount: number | null = null;
  try {
    const token = await getToken();
    if (token) {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) chunkCount = (await res.json()).chunk_count ?? null;
    }
  } catch {
    /* chunkCount stays null — fail open */
  }

  if (chunkCount === 0) {
    return (
      <DashboardShell>
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
            background: "#FAFAFA",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "#111",
              marginBottom: 10,
            }}
          >
            No knowledge sources connected yet
          </h1>
          <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.6, maxWidth: 420, marginBottom: 28 }}>
            {isAdmin
              ? "Chat needs something to search. Connect Notion or a Google Doc first, then come back here."
              : "Chat needs something to search. Ask an admin on your team to connect a data source first."}
          </p>
          {isAdmin && (
            <Link
              href="/admin/connections"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 44,
                padding: "0 24px",
                borderRadius: 9999,
                background: "#171717",
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 400,
                textDecoration: "none",
              }}
            >
              Connect a source
            </Link>
          )}
        </main>
      </DashboardShell>
    );
  }

  return <ChatClient />;
}
