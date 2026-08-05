"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SideNav from "./SideNav";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", height: "100svh", background: "#FAFAFA", overflow: "hidden" }}>
      <style>{`
        .sidenav {
          width: 210px;
          min-width: 210px;
          height: 100%;
          background: transparent;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
        }
        .mobile-topbar { display: none; }

        @media (max-width: 768px) {
          .sidenav {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 60;
            width: 240px;
            min-width: 0;
            background: #FAFAFA;
            border-right: 1px solid #EBEBEB;
            transform: translateX(-100%);
            transition: transform 240ms cubic-bezier(0.2, 0, 0, 1);
            box-shadow: none;
          }
          .sidenav[data-open="true"] {
            transform: translateX(0);
            box-shadow: 8px 0 32px rgba(0,0,0,0.12);
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 56px;
            padding: 0 16px;
            background: #fff;
            border-bottom: 1px solid #EBEBEB;
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.28)",
            zIndex: 59,
            backdropFilter: "blur(1px)",
          }}
        />
      )}

      <div style={{ display: "flex", width: "100%", maxWidth: 1100, height: "100%", overflow: "hidden" }}>
        <SideNav mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Mobile top bar */}
          <div className="mobile-topbar">
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <Image src="/athena-mind-logo.png" alt="Athena" width={24} height={24} style={{ borderRadius: 4 }} />
              <span style={{ fontSize: 16, fontWeight: 400, color: "#111", letterSpacing: "-0.02em" }}>Athena</span>
            </Link>
            <button
              onClick={() => setMobileNavOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                color: "#444",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
