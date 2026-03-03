"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden" style={{ background: "#06080f" }}>
      <Sidebar />
      <div
        className="flex-1 flex min-h-0 flex-col overflow-hidden"
        style={{
          background:
            "radial-gradient(1200px 560px at 95% -14%, rgba(128,146,177,0.14), transparent 55%), radial-gradient(980px 520px at -24% 112%, rgba(86,99,122,0.1), transparent 62%), linear-gradient(145deg, #06080f 0%, #080d18 46%, #06080f 100%)",
        }}
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
