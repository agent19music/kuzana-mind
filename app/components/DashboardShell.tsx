"use client";

import SideNav from "./SideNav";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", height: "100svh", background: "#FAFAFA", overflow: "hidden" }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 1100, height: "100%", overflow: "hidden" }}>
        <SideNav />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
