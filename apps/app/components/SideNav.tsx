"use client";

import { useClerk, useOrganization, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  House,
  ChatTeardropText,
  FileText,
  Plugs,
  Users,
  Gear,
  CreditCard,
  ChartBar,
  CaretUp,
  SignOut,
} from "@phosphor-icons/react";

// Phosphor icons — 16px
const I = {
  home:    <House size={16} />,
  chat:    <ChatTeardropText size={16} />,
  file:    <FileText size={16} />,
  plug:    <Plugs size={16} />,
  users:   <Users size={16} />,
  gear:    <Gear size={16} />,
  credit:  <CreditCard size={16} />,
  chart:   <ChartBar size={16} />,
  chevUp:  <CaretUp size={12} />,
  signout: <SignOut size={15} />,
};

const MAIN_ITEMS = [
  { label: "Overview",    href: "/dashboard",         icon: I.home   },
  { label: "Chat",        href: "/chat",               icon: I.chat   },
];

const ADMIN_ITEMS = [
  { label: "Files",       href: "/admin/files",        icon: I.file   },
  { label: "Connections", href: "/admin/connections",  icon: I.plug   },
  { label: "Analytics",   href: "/admin/analytics",    icon: I.chart  },
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

function NavLink({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} className="nav-link" data-active={active ? "true" : "false"} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      {label}
    </Link>
  );
}

export default function SideNav({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
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
    <nav className="sidenav" data-open={mobileOpen ? "true" : "false"}>
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
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={onMobileClose} />
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: "#EBEBEB", margin: "8px 0" }} />
            {ADMIN_ITEMS.map(item => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={onMobileClose} />
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
                <Link href="/admin/settings" className="account-menu-item" onClick={() => { setMenuOpen(false); onMobileClose?.(); }}>
                  <span style={{ display: "flex", color: "#888" }}>{I.gear}</span>
                  Settings
                </Link>
                <Link href="/admin/billing" className="account-menu-item" onClick={() => { setMenuOpen(false); onMobileClose?.(); }}>
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
