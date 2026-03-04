"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden" style={{ background: "var(--bg-root)" }}>
      <Sidebar />
      <div
        className="flex-1 flex min-h-0 flex-col overflow-hidden"
        style={{ background: "var(--bg-main-gradient)" }}
      >
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden relative">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              background:
                "radial-gradient(900px 340px at 50% -20%, rgba(255,255,255,0.06), transparent 70%)",
            }}
          />
          <div className="relative h-full min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
