"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function RebrandAlertBar() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.documentElement.style.setProperty("--rebrand-banner-offset", open ? "44px" : "0px");
    return () => {
      document.documentElement.style.setProperty("--rebrand-banner-offset", "0px");
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .rebrand-alert-link {
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          transition: opacity 150ms ease-out;
        }
        .rebrand-alert-link:hover {
          opacity: 0.75;
        }
        .rebrand-alert-close {
          transition: background 150ms ease-out, opacity 150ms ease-out;
        }
        .rebrand-alert-close:hover {
          background: rgba(91, 67, 0, 0.06);
        }
      `}</style>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 70,
          width: "100%",
          background: "#fff8e8",
          borderBottom: "1px solid #eedda1",
          minHeight: 44,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="9" fill="#f6c65b" opacity="0.18" />
            <circle cx="12" cy="12" r="8.05" stroke="#5b4300" strokeWidth="1.5" />
            <path d="M12 7.3V12.5" stroke="#5b4300" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="16.1" r="1.05" fill="#5b4300" />
          </svg>
          <p style={{ margin: 0, fontSize: 14, color: "#3d2f00", lineHeight: 1.3, flex: 1 }}>
            Kuzana Mind is now Athena.
          </p>
          <Link href="/migration" className="rebrand-alert-link" style={{ color: "#2b2300", fontSize: 13, fontWeight: 400, whiteSpace: "nowrap" }}>
            Learn more
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close alert"
            className="rebrand-alert-close"
            style={{
              border: "none",
              background: "transparent",
              width: 24,
              height: 24,
              borderRadius: 9999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6e5511",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
