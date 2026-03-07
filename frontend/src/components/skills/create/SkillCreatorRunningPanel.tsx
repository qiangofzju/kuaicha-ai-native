"use client";

import type { SkillProgress, SkillTraceEvent } from "@/types/skill";
import { TraceTimeline } from "./TraceTimeline";
import { RunningProgressSidebar } from "./RunningProgressSidebar";

interface SkillCreatorRunningPanelProps {
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  prompt: string;
}

export function SkillCreatorRunningPanel({ progress, traceEvents, prompt }: SkillCreatorRunningPanelProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] animate-fadeIn">
      {/* Left: Execution timeline */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-inset), var(--shadow-mid)",
        }}
      >
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-medium text-white/85">执行过程</h3>
            <p className="text-[11px] text-white/40 mt-0.5">思考 · 工具调用 · 文件创建 · 交付</p>
          </div>
          <span className="text-[13px] font-semibold text-skills">{Math.round(progress?.progress || 0)}%</span>
        </div>
        <div className="p-4">
          <TraceTimeline events={traceEvents} />
        </div>
      </section>

      {/* Right: Progress sidebar */}
      <aside className="lg:sticky lg:top-4 h-fit">
        <RunningProgressSidebar progress={progress} prompt={prompt} />
      </aside>
    </div>
  );
}
