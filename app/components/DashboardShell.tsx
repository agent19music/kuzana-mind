"use client";

import SideNav from "./SideNav";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100svh", overflow: "hidden" }}>
      <SideNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
