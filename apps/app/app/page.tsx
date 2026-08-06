import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const { userId, orgId } = await auth();

  if (userId) {
    redirect(orgId ? "/dashboard" : "/onboarding");
  }

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        minHeight: 640,
        overflow: "hidden",
      }}
    >
      <Image
        src="/hero-image.png"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)" }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <Image src="/athena-mind-logo.png" alt="" width={22} height={22} />
          <span style={{ fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.9)" }}>
            Athena
          </span>
        </div>

        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(40px, 8vw, 88px)",
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          Your team&apos;s
          <br />
          second brain.
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.82)",
            fontSize: "clamp(16px, 2vw, 20px)",
            fontWeight: 400,
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 480,
          }}
        >
          Connect your Google Workspace and Notion. Give every team member
          instant answers from your organization&apos;s knowledge — no
          searching, no asking around.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "#ffffff",
              color: "#171717",
              fontSize: 15,
              fontWeight: 400,
              padding: "0 32px",
            }}
          >
            Go to dashboard
          </Link>
          <Link
            href="/register"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "transparent",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 400,
              padding: "0 32px",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
