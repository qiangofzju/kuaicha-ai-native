"use client";

import { useEffect, useRef } from "react";
import type { WorkspaceTerminalLineEvent } from "@/types/workspace";

interface WorkspaceTerminalProps {
  lines: WorkspaceTerminalLineEvent[];
}

export function WorkspaceTerminal({ lines }: WorkspaceTerminalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div ref={ref} className="h-full overflow-y-auto p-3 bg-black/55 font-mono text-[11px] space-y-1">
      {lines.length === 0 && <p className="text-white/35">终端输出将在这里实时显示...</p>}
      {lines.map((line, idx) => (
        <p
          key={`${idx}-${line.ts || ""}`}
          className="leading-relaxed break-all"
          style={{ color: line.stream === "stderr" ? "rgba(248,113,113,0.92)" : "rgba(217,249,157,0.9)" }}
        >
          {line.line}
        </p>
      ))}
    </div>
  );
}

