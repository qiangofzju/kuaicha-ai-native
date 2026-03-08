"use client";

import { useState } from "react";
import type { SkillProgress } from "@/types/skill";

const CREATOR_STAGES = ["需求分析", "工具执行", "交付整理"];

interface RunningProgressSidebarProps {
  progress: SkillProgress | null;
  prompt: string;
}

function getActiveIndex(stageName: string | undefined): number {
  if (!stageName) return 0;
  const idx = CREATOR_STAGES.indexOf(stageName);
  return idx >= 0 ? idx : 0;
}

export function RunningProgressSidebar({ progress, prompt }: RunningProgressSidebarProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const pct = Math.round(progress?.progress ?? 0);
  const activeIndex = getActiveIndex(progress?.stage);

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <div
        className="rounded-2xl border border-white/[0.1] bg-white/[0.015] p-5"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <p className="text-[11px] text-white/35 mb-2">总进度</p>
        <p className="text-[28px] leading-none font-semibold text-skills">{pct}%</p>

        <div className="mt-4 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #F59E0B, #22C55E)" }}
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] text-white/35">当前阶段</p>
          <p className="text-[13px] text-white/80">{progress?.stage || "初始化"}</p>
          <p className="text-[11px] text-white/45">{progress?.message || "等待任务启动"}</p>
        </div>
      </div>

      {/* Stage dots */}
      <div
        className="rounded-2xl border border-white/[0.1] bg-white/[0.015] p-5"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <p className="text-[11px] text-white/35 mb-3">执行阶段</p>
        <div className="space-y-3">
          {CREATOR_STAGES.map((stage, idx) => {
            const done = idx < activeIndex;
            const active = idx === activeIndex;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: done ? "#10B981" : active ? "#F59E0B" : "rgba(255,255,255,0.12)",
                    background: done ? "#10B981" : "transparent",
                  }}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 5l2 2 3.5-3.5" />
                    </svg>
                  )}
                  {active && <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />}
                </div>
                <span
                  className="text-[12px] transition-colors"
                  style={{ color: done ? "rgba(255,255,255,0.7)" : active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Original prompt */}
      <div
        className="rounded-2xl border border-white/[0.1] bg-white/[0.015] p-5"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <button
          type="button"
          className="w-full flex items-center justify-between"
          onClick={() => setShowPrompt((v) => !v)}
        >
          <p className="text-[11px] text-white/35">创建需求</p>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className={`text-white/25 transition-transform ${showPrompt ? "rotate-180" : ""}`}
          >
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        {showPrompt && (
          <p className="text-[12px] text-white/55 mt-3 leading-relaxed whitespace-pre-wrap">{prompt}</p>
        )}
        {!showPrompt && (
          <p className="text-[12px] text-white/55 mt-2 truncate">{prompt}</p>
        )}
      </div>
    </div>
  );
}
