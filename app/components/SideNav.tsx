"use client";

import { useClerk, useOrganization, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Icons — 16px, 1.4 stroke, round caps/joins
const I = {
  home:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 7L8 1.5 14.5 7V14a.5.5 0 01-.5.5H10V10h-4v4.5H2a.5.5 0 01-.5-.5V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  chat:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 3A.5.5 0 013 2.5h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H9L6.5 13V10H3a.5.5 0 01-.5-.5V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  file:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9.5 1.5v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  plug:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2v3M10 2v3M5 5h6a2 2 0 010 4h-1v4l-2 1.5L6 13V9H5a2 2 0 010-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/></svg>,
  users:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 13.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 3.5a2 2 0 010 4M14.5 13.5c0-2.21-1.57-4.06-3.5-4.43" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  gear:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v1.25M8 13.25V14.5M1.5 8h1.25M13.25 8H14.5M3.4 3.4l.88.88M11.72 11.72l.88.88M3.4 12.6l.88-.88M11.72 4.28l.88-.88" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  credit:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.4"/><rect x="3.5" y="9.5" width="2.5" height="1.5" rx=".5" fill="currentColor"/></svg>,
  chevUp:  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  signout: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10.5l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const MAIN_ITEMS = [
  { label: "Overview",    href: "/dashboard",         icon: I.home   },
  { label: "Chat",        href: "/chat",               icon: I.chat   },
];

const ADMIN_ITEMS = [
  { label: "Files",       href: "/admin/files",        icon: I.file   },
  { label: "Connections", href: "/admin/connections",  icon: I.plug   },
  { label: "Team",        href: "/admin/staff",        icon: I.users  },
  { label: "Settings",   href: "/admin/settings",     icon: I.gear   },
  { label: "Billing",    href: "/admin/billing",      icon: I.credit },
];

function OrgAvatar({ imageUrl, name }: { imageUrl?: string | null; name?: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name ?? ""} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  const initials = (name ?? "?").slice(0, 2).toUpperCase();
  return (
    <span style={{
      width: 22, height: 22, borderRadius: "50%",
      background: "#1a1a1a", color: "#fff",
      fontSize: 9, fontWeight: 400,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, letterSpacing: "0.02em",
    }}>
      {initials}
    </span>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className="nav-link" data-active={active ? "true" : "false"}>
      <span className="nav-icon">{icon}</span>
      {label}
    </Link>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = membership?.role === "org:admin";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);
  }

  return (
    <nav style={{
      width: 210,
      minWidth: 210,
      height: "100%",
      background: "transparent",
      borderRight: "none",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        padding: "56px 16px 20px 20px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/athena-mind-logo.png" alt="Athena" width={28} height={28} style={{ borderRadius: 6 }} />
          <span style={{ fontSize: 18, fontWeight: 500, color: "#111", letterSpacing: "-0.02em" }}>
            Athena
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {MAIN_ITEMS.map(item => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} />
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: "#EBEBEB", margin: "8px 0" }} />
            {ADMIN_ITEMS.map(item => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} />
            ))}
          </>
        )}
      </div>

      {/* Footer — account trigger + popover */}
      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        {/* Outside-click overlay */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 49 }}
          />
        )}

        {/* Popover — always rendered, CSS controls visibility */}
        <div className="account-menu" data-open={menuOpen ? "true" : "false"}>
          {/* Identity card */}
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <OrgAvatar imageUrl={organization?.imageUrl} name={organization?.name} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, fontWeight: 400, color: "#1a1a1a",
                  margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {organization?.name ?? "—"}
                </p>
                <p style={{
                  fontSize: 12, color: "#a3a3a3",
                  margin: "1px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.primaryEmailAddress?.emailAddress ?? ""}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "4px 0" }}>
            {isAdmin && (
              <>
                <Link href="/admin/settings" className="account-menu-item" onClick={() => setMenuOpen(false)}>
                  <span style={{ display: "flex", color: "#888" }}>{I.gear}</span>
                  Settings
                </Link>
                <Link href="/admin/billing" className="account-menu-item" onClick={() => setMenuOpen(false)}>
                  <span style={{ display: "flex", color: "#888" }}>{I.credit}</span>
                  Billing
                </Link>
                <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
              </>
            )}
            <button
              className="account-menu-item"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <span style={{ display: "flex", color: "#888" }}>{I.signout}</span>
              Log out
            </button>
          </div>
        </div>

        {/* Trigger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "11px 14px 11px 20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <OrgAvatar imageUrl={organization?.imageUrl} name={organization?.name} />
          <span style={{
            fontSize: 13,
            fontWeight: 400,
            color: "#333",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}>
            {organization?.name ?? "Account"}
          </span>
          <span style={{
            display: "flex",
            color: "#bbb",
            transition: "transform 150ms var(--ease-out)",
            transform: menuOpen ? "rotate(0deg)" : "rotate(180deg)",
            flexShrink: 0,
          }}>
            {I.chevUp}
          </span>
        </button>
      </div>
    </nav>
  );
}
