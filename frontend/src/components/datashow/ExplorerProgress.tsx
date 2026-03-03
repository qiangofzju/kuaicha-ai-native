"use client";

import React, { useRef, useEffect } from "react";
import { useGraphExplorerStore } from "@/stores/graphExplorerStore";
import { theme } from "@/styles/theme";

const STAGES = [
  { name: "查询理解", key: "understand" },
  { name: "数据搜索", key: "search" },
  { name: "关系分析", key: "analyze" },
  { name: "可视化生成", key: "visualize" },
];

interface ExplorerProgressProps {
  onStop?: () => void;
}

export function ExplorerProgress({ onStop }: ExplorerProgressProps = {}) {
  const progress = useGraphExplorerStore((s) => s.progress);
  const taskStatus = useGraphExplorerStore((s) => s.taskStatus);
  const streamContent = useGraphExplorerStore((s) => s.streamContent);
  const streamRef = useRef<HTMLDivElement>(null);
  const moduleAccent = theme.colors.modules.datashow;

  const isActive = taskStatus === "running" || taskStatus === "pending";
  // progress.progress arrives as 0-100 from the WebSocket handler
  const pct = progress ? Math.round(progress.progress) : 0;
  const currentStageIndex = Math.min(Math.floor(pct / 25), 3);

  // Auto-scroll stream content
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamContent]);

  if (!isActive) return null;

  return (
    <div className="mb-6 animate-fadeIn">
      <div
        className="rounded-2xl border p-5"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))",
          borderColor: `${moduleAccent}33`,
        }}
      >
        {/* Stage indicators */}
        <div className="flex items-center gap-1 mb-4">
          {STAGES.map((stage, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <React.Fragment key={stage.key}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all"
                    style={{
                      background: isCompleted
                        ? `${moduleAccent}2e`
                        : isCurrent
                        ? `${moduleAccent}1f`
                        : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isCompleted
                        ? `${moduleAccent}5e`
                        : isCurrent
                        ? `${moduleAccent}46`
                        : "rgba(255,255,255,0.06)",
                      color: isCompleted
                        ? moduleAccent
                        : isCurrent
                        ? `${moduleAccent}cc`
                        : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {isCompleted ? "✓" : i + 1}
                  </div>
                  <span
                    className="text-[11px] hidden sm:inline"
                    style={{
                      color: isCompleted
                        ? `${moduleAccent}b3`
                        : isCurrent
                        ? `${moduleAccent}99`
                        : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {stage.name}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className="flex-1 h-px mx-1"
                    style={{
                      background: i < currentStageIndex
                        ? `${moduleAccent}30`
                        : "rgba(255,255,255,0.04)",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/[0.04] mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${moduleAccent}, ${moduleAccent}cc)`,
            }}
          />
        </div>

        {/* Status message */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-datashow/40 border-t-datashow rounded-full animate-spin" />
            <span className="text-[12px] text-white/40">
              {progress?.message || "正在处理..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">{pct}%</span>
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border transition-all hover:bg-red-500/10"
                style={{
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "rgba(239,68,68,0.55)",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
                </svg>
                停止
              </button>
            )}
          </div>
        </div>

        {/* Stream content */}
        {streamContent && (
          <div
            ref={streamRef}
            className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] max-h-[180px] overflow-y-auto"
          >
            <p className="text-[11px] text-white/30 leading-relaxed whitespace-pre-wrap font-mono">
              {streamContent}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
