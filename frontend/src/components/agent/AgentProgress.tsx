"use client";

import { useEffect, useRef } from "react";
import type { AgentDefinition, AgentProgress as AgentProgressType } from "@/types/agent";
import { theme } from "@/styles/theme";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSimpleMarkdown(markdown: string): string {
  let html = escapeHtml(markdown);

  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const codeHtml = code.trim();
    return `<pre style="background:var(--code-block-bg);border:1px solid var(--card-border)" class="rounded-xl p-3 overflow-x-auto my-2"><code>${codeHtml}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, "<code class=\"px-1 py-0.5 rounded bg-white/[0.08] text-white/85\">$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class=\"text-white/90\">$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em class=\"text-white/80\">$1</em>");
  html = html.replace(/\n/g, "<br />");

  return html;
}

interface AgentProgressProps {
  agent: AgentDefinition;
  progress: AgentProgressType | null;
  streamContent?: string;
  onStop?: () => void;
}

const DEFAULT_STAGES = [
  { key: "collect", label: "数据采集", icon: "1" },
  { key: "analyze", label: "智能分析", icon: "2" },
  { key: "generate", label: "报告生成", icon: "3" },
  { key: "verify", label: "质量校验", icon: "4" },
];

const BATCH_STAGES = [
  { key: "parse", label: "需求解析", icon: "1" },
  { key: "query", label: "数据查询", icon: "2" },
  { key: "transform", label: "字段加工", icon: "3" },
  { key: "deliver", label: "数据交付", icon: "4" },
];

function getActiveStageIndex(
  progress: AgentProgressType | null,
  stages: { key: string; label: string }[],
): number {
  if (!progress) return 0;

  // Use stageIndex if provided from backend
  if (progress.stageIndex !== undefined) {
    return Math.max(0, Math.min(progress.stageIndex, stages.length - 1));
  }

  if (progress.stage) {
    const stageName = String(progress.stage);
    const foundIndex = stages.findIndex((item) => stageName.includes(item.label));
    if (foundIndex >= 0) return foundIndex;
    if (agentStageAlias(stageName) !== null) return agentStageAlias(stageName) as number;
  }

  // Determine stage from progress percentage
  const pct = progress.progress;
  if (pct < 25) return 0;
  if (pct < 50) return 1;
  if (pct < 75) return 2;
  return 3;
}

function agentStageAlias(stageName: string): number | null {
  if (stageName.includes("报告生成") || stageName.includes("交付")) return 3;
  return null;
}

export function AgentProgress({ agent, progress, streamContent, onStop }: AgentProgressProps) {
  const stages = agent.id === "batch" ? BATCH_STAGES : DEFAULT_STAGES;
  const activeIndex = getActiveStageIndex(progress, stages);
  const pct = progress?.progress ?? 0;
  const streamRef = useRef<HTMLDivElement>(null);
  const moduleAccent = theme.colors.modules.agent || agent.color;

  // Auto-scroll streaming content to bottom
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamContent]);

  const renderedStreamHtml = streamContent ? renderSimpleMarkdown(streamContent) : "";

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-white/70">执行进度</h3>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-medium" style={{ color: moduleAccent }}>
              {pct}%
            </span>
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-all hover:bg-red-500/10"
                style={{
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "rgba(239,68,68,0.6)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
                </svg>
                停止
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full bg-white/[0.06] mb-8 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${moduleAccent}, ${moduleAccent}cc)`,
              boxShadow: `0 0 10px ${moduleAccent}3a`,
            }}
          />
          {/* Animated shimmer on the progress bar */}
          {pct > 0 && pct < 100 && (
            <div
              className="absolute inset-y-0 left-0 rounded-full animate-shimmer"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, transparent, ${moduleAccent}2a, transparent)`,
                backgroundSize: "200% 100%",
              }}
            />
          )}
        </div>

        {/* Stage indicators */}
        <div className="flex items-start justify-between mb-8">
          {stages.map((stage, i) => {
            const isCompleted = i < activeIndex;
            const isActive = i === activeIndex;

            return (
              <div
                key={stage.key}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Connector line */}
                {i < stages.length - 1 && (
                  <div
                    className="absolute top-4 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-px transition-colors duration-500"
                    style={{
                      background: isCompleted
                        ? moduleAccent
                        : "var(--progress-connector)",
                    }}
                  />
                )}

                {/* Stage circle */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-500 relative z-10"
                  style={{
                    background: isCompleted
                      ? moduleAccent
                      : isActive
                        ? `${moduleAccent}20`
                        : "var(--progress-stage-pending-bg)",
                    color: isCompleted
                      ? "#fff"
                      : isActive
                        ? moduleAccent
                        : "var(--progress-stage-pending-text)",
                    border: isActive
                      ? `2px solid ${moduleAccent}`
                      : "2px solid transparent",
                    boxShadow: isActive
                      ? `0 0 16px ${moduleAccent}30`
                      : "none",
                  }}
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 6l3 3 5-6" />
                    </svg>
                  ) : (
                    stage.icon
                  )}
                </div>

                {/* Stage label */}
                <span
                  className="mt-2 text-[11px] font-medium transition-colors duration-500"
                  style={{
                    color: isActive
                      ? moduleAccent
                      : isCompleted
                        ? "var(--text-sub)"
                        : "var(--progress-stage-pending-text)",
                  }}
                >
                  {stage.label}
                </span>

                {/* Active pulse */}
                {isActive && (
                  <div
                    className="absolute top-0 w-8 h-8 rounded-full animate-ping opacity-20"
                    style={{ background: moduleAccent }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current message */}
        {progress?.message && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 animate-pulse"
              style={{ background: moduleAccent }}
            />
            <div>
              <p className="text-[12px] text-white/50 mb-0.5">
                {progress.stage || stages[activeIndex]?.label}
              </p>
              <p className="text-[13px] text-white/70">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Loading animation when no message yet */}
        {!progress?.message && !streamContent && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-dotPulse"
                  style={{
                    background: moduleAccent,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[13px] text-white/40">正在初始化...</span>
          </div>
        )}
      </div>

      {/* Streaming analysis content */}
      {streamContent && (
        <div className="rounded-2xl border overflow-hidden animate-fadeIn" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
              style={{ background: moduleAccent }}
            />
            <span className="text-[12px] text-white/50">分析过程</span>
          </div>
          <div
            ref={streamRef}
            className="px-5 py-4 max-h-[320px] overflow-y-auto scroll-smooth text-[12px] text-white/55 leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: renderedStreamHtml }}
          />
        </div>
      )}
    </div>
  );
}
