import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FloatingPaths } from "@/components/floating-paths";

export default async function Home() {
  const { userId, orgId } = await auth();

  if (userId) {
    redirect(orgId ? "/dashboard" : "/onboarding");
  }

  return (
    <main
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100svh",
        width: "100vw",
        overflow: "hidden",
        background: "#ffffff",
        padding: "40px 24px",
      }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 0, color: "#171717" }}>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 560,
          width: "100%",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 40 }}
        >
          <Image src="/athena-mind-logo.png" alt="Athena" width={28} height={28} />
          <span style={{ fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em", color: "#171717" }}>Athena</span>
        </Link>

        <h1
          style={{
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "#171717",
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          Know instantly.
        </h1>

        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "#71717a",
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 440,
          }}
        >
          Ask anything about how we work. Get the right document or the right person — never a guess.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/login"
            className="btn-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 48,
              padding: "0 28px",
              borderRadius: 9999,
              background: "#171717",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 400,
              textDecoration: "none",
            }}
          >
            Go to dashboard
          </Link>
          <Link
            href="/register"
            className="btn-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 48,
              padding: "0 28px",
              borderRadius: 9999,
              background: "#ffffff",
              color: "#171717",
              fontSize: 15,
              fontWeight: 400,
              textDecoration: "none",
              border: "1px solid #e4e4e7",
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
