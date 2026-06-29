"use client";

import { useOrganization, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const W = 232;
const C = 52;

// Icons — 16px, 1.5 stroke, round caps
const I = {
  home: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 7L8 1.5 14.5 7V14a.5.5 0 01-.5.5H10V10h-4v4.5H2a.5.5 0 01-.5-.5V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  chat: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 3A.5.5 0 013 2.5h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H9L6.5 13V10H3a.5.5 0 01-.5-.5V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  file: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9.5 1.5v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  plug: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2v3M10 2v3M5 5h6a2 2 0 010 4h-1v4l-2 1.5L6 13V9H5a2 2 0 010-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 13.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 3.5a2 2 0 010 4M14.5 13.5c0-2.21-1.57-4.06-3.5-4.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  gear: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v1.25M8 13.25V14.5M1.5 8h1.25M13.25 8H14.5M3.4 3.4l.88.88M11.72 11.72l.88.88M3.4 12.6l.88-.88M11.72 4.28l.88-.88" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  credit: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.4"/><rect x="3.5" y="9.5" width="2.5" height="1.5" rx=".5" fill="currentColor"/></svg>,
  chevDown: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  left: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12.5L5.5 8 10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  right: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const SECTIONS = [
  {
    title: "Main",
    adminOnly: false,
    items: [
      { label: "Overview", href: "/dashboard", icon: I.home },
      { label: "Chat", href: "/chat", icon: I.chat },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { label: "Files", href: "/admin/files", icon: I.file },
      { label: "Connections", href: "/admin/connections", icon: I.plug },
      { label: "Team", href: "/admin/staff", icon: I.users },
      { label: "Settings", href: "/admin/settings", icon: I.gear },
      { label: "Billing", href: "/admin/billing", icon: I.credit },
    ],
  },
];

export default function SideNav() {
  const pathname = usePathname();
  const { membership, organization } = useOrganization();
  const isAdmin = membership?.role === "org:admin";
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ Main: true, Admin: true });

  const w = collapsed ? C : W;

  return (
    <nav
      style={{
        width: w,
        minWidth: w,
        height: "100%",
        background: "#FAFAFA",
        borderRight: "1px solid #EBEBEB",
        display: "flex",
        flexDirection: "column",
        transition: "width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Logo row */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 10px" : "0 12px 0 16px",
          borderBottom: "1px solid #EBEBEB",
          flexShrink: 0,
          background: "#fff",
        }}
      >
        {!collapsed && (
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/athena-mind-logo.png" alt="Athena" width={22} height={22} style={{ borderRadius: 4 }} />
            <span style={{ fontSize: 13.5, fontWeight: 400, color: "#111", letterSpacing: "-0.015em" }}>
              Athena
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            width: 26,
            height: 26,
            border: "1px solid #E2E2E2",
            borderRadius: 5,
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            flexShrink: 0,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {collapsed ? I.right : I.left}
        </button>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {SECTIONS.map((section, si) => {
          if (section.adminOnly && !isAdmin) return null;
          const isOpen = open[section.title] ?? true;

          return (
            <div key={section.title} style={{ marginBottom: 2 }}>
              {!collapsed && (
                <button
                  onClick={() => setOpen(o => ({ ...o, [section.title]: !o[section.title] }))}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 12px 4px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#888",
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {section.title}
                  <span
                    style={{
                      display: "flex",
                      color: "#bbb",
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 160ms",
                    }}
                  >
                    {I.chevDown}
                  </span>
                </button>
              )}

              {(isOpen || collapsed) && section.items.map(item => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      margin: "1px 6px",
                      padding: collapsed ? "9px 0" : "7px 10px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      textDecoration: "none",
                      fontSize: 13.5,
                      fontWeight: 400,
                      color: active ? "#111" : "#555",
                      borderRadius: 7,
                      background: active ? "rgba(0,0,0,0.06)" : "transparent",
                      boxShadow: active
                        ? "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 0 0 1px rgba(0,0,0,0.05)"
                        : "none",
                      transition: "background 120ms, box-shadow 120ms, color 120ms",
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        color: active ? "#333" : "#888",
                        flexShrink: 0,
                        display: "flex",
                        transition: "color 120ms",
                      }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && item.label}
                  </Link>
                );
              })}

              {si < SECTIONS.length - 1 && (
                <div style={{ height: 1, background: "#EBEBEB", margin: "10px 0 8px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #EBEBEB",
          padding: collapsed ? "10px 0" : "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          flexShrink: 0,
          background: "#fff",
        }}
      >
        <UserButton />
        {!collapsed && organization?.name && (
          <span
            style={{
              fontSize: 12.5,
              color: "#888",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 400,
            }}
          >
            {organization.name}
          </span>
        )}
      </div>
    </nav>
  );
}
