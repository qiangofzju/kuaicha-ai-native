"use client";

import React, { useRef, useEffect } from "react";
import { useTrendExplorerStore } from "@/stores/trendExplorerStore";
import { theme } from "@/styles/theme";

const STAGES = [
  { name: "查询理解", key: "understand" },
  { name: "数据采集", key: "collect" },
  { name: "趋势分析", key: "analyze" },
  { name: "可视化生成", key: "visualize" },
];

interface TrendProgressProps {
  onStop?: () => void;
}

export function TrendProgress({ onStop }: TrendProgressProps = {}) {
  const progress = useTrendExplorerStore((s) => s.progress);
  const taskStatus = useTrendExplorerStore((s) => s.taskStatus);
  const streamContent = useTrendExplorerStore((s) => s.streamContent);
  const streamRef = useRef<HTMLDivElement>(null);
  const moduleAccent = theme.colors.modules.datashow;

  const isActive = taskStatus === "running" || taskStatus === "pending";
  const pct = progress ? Math.round(progress.progress) : 0;
  const currentStageIndex = Math.min(Math.floor(pct / 25), 3);

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
          background: "var(--card-bg)",
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
                        : "var(--progress-stage-pending-bg)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isCompleted
                        ? `${moduleAccent}5e`
                        : isCurrent
                        ? `${moduleAccent}46`
                        : "var(--progress-stage-pending-border)",
                      color: isCompleted
                        ? moduleAccent
                        : isCurrent
                        ? `${moduleAccent}cc`
                        : "var(--text-weak)",
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
                        : "var(--text-weak)",
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
                        : "var(--progress-connector)",
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
