import Image from "next/image";
import Link from "next/link";
import KuzanaBadge from "./KuzanaBadge";

export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        minHeight: 640,
        overflow: "hidden",
      }}
    >
      {/* Photo */}
      <Image
        src="/hero-image.png"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      {/* Flat dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.50)",
        }}
      />

      {/* Content — centred */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 var(--space-6)",
        }}
      >
        <KuzanaBadge />

        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(56px, 10vw, 112px)",
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: "var(--space-6)",
            maxWidth: 900,
          }}
        >
          Know
          <br />
          instantly.
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.82)",
            fontSize: "clamp(16px, 2vw, 20px)",
            fontWeight: 500,
            lineHeight: 1.6,
            marginBottom: "var(--space-8)",
            maxWidth: 440,
          }}
        >
          Ask anything about how we work. Get the right document or the right
          person in seconds.
        </p>

        {/* Pill CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/chat"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "#ffffff",
              color: "#171717",
              fontSize: 15,
              fontWeight: 500,
              padding: "0 32px",
              transition: "background 200ms ease-out",
            }}
            className="hover:bg-[#e5e5e5]"
          >
            Ask a question
          </Link>
          <a
            href="#features"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              height: 52,
              borderRadius: 9999,
              background: "transparent",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              padding: "0 32px",
              border: "1px solid rgba(255,255,255,0.55)",
              transition:
                "border-color 200ms ease-out, background 200ms ease-out",
            }}
            className="hover:!border-transparent hover:!bg-white/10"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
