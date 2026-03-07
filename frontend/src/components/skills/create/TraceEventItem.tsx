"use client";

import { useState } from "react";
import type { SkillTraceEvent } from "@/types/skill";
import { Icons } from "@/components/shared/Icons";

function formatTime(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "--:--:--";
  return dt.toLocaleTimeString("zh-CN", { hour12: false });
}

const KIND_CONFIG: Record<string, { icon: React.ReactNode; accent: string; label: string }> = {
  thinking: { icon: <Icons.ThinkingBrain size={14} />, accent: "#F59E0B", label: "思考过程" },
  tool_call: { icon: <Icons.Terminal size={14} />, accent: "#4A9EFF", label: "执行命令" },
  tool_result: { icon: <Icons.Terminal size={14} />, accent: "#4A9EFF", label: "工具结果" },
  file_write: { icon: <Icons.FileCreate size={14} />, accent: "#22C55E", label: "创建文件" },
  delivery: { icon: <Icons.CheckDelivery size={14} />, accent: "#10B981", label: "交付" },
};

function getConfig(kind: string) {
  return KIND_CONFIG[kind] || { icon: <Icons.ThinkingBrain size={14} />, accent: "#94A3B8", label: "事件" };
}

interface TraceEventItemProps {
  event: SkillTraceEvent;
  isLatest: boolean;
}

export function TraceEventItem({ event, isLatest }: TraceEventItemProps) {
  const { icon, accent, label } = getConfig(event.kind);
  const isRunning = event.status === "running";
  const [expanded, setExpanded] = useState(event.kind !== "thinking");

  if (event.kind === "tool_result") {
    const statusDot = event.status === "done" ? "#10B981" : event.status === "warning" ? "#F59E0B" : "#EF4444";
    return (
      <div
        className="ml-6 pl-4 border-l-2 animate-fadeIn"
        style={{ borderColor: `${accent}30` }}
      >
        <div className="rounded-lg border bg-white/[0.015] px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusDot }} />
            <p className="text-[11px] text-white/60 truncate">{event.detail}</p>
          </div>
          {event.metrics && Object.keys(event.metrics).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.entries(event.metrics).map(([key, value]) => (
                <span key={key} className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] text-white/50 font-mono">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.kind === "thinking") {
    return (
      <div className="animate-fadeIn">
        <button
          type="button"
          className="w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-white/[0.02]"
          style={{ borderColor: `${accent}20`, borderLeftWidth: 3, borderLeftColor: accent }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: accent }} className={isRunning && isLatest ? "animate-pulse" : ""}>{icon}</span>
            <span className="text-[12px] text-white/80 flex-1 truncate">{event.title}</span>
            <span className="text-[10px] text-white/30">{formatTime(event.ts)}</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              className={`text-white/25 transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M3 5l3 3 3-3" />
            </svg>
          </div>
          {expanded && event.detail && (
            <p className="text-[11px] text-white/50 mt-2 leading-relaxed whitespace-pre-wrap">{event.detail}</p>
          )}
        </button>
      </div>
    );
  }

  if (event.kind === "tool_call") {
    return (
      <div className="animate-fadeIn">
        <div
          className="rounded-xl border px-3.5 py-2.5"
          style={{ borderColor: `${accent}20`, borderLeftWidth: 3, borderLeftColor: accent }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: accent }}>{icon}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium" style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}>
              {label}
            </span>
            <span className="text-[12px] text-white/75 flex-1 truncate">{event.title}</span>
            <span className="text-[10px] text-white/30">{formatTime(event.ts)}</span>
          </div>
          {event.detail && (
            <div className="mt-2 rounded-md bg-black/30 border border-white/[0.06] px-3 py-2">
              <code className="text-[11px] text-white/65 font-mono break-all leading-relaxed">{event.detail}</code>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.kind === "file_write") {
    return (
      <div className="animate-fadeIn">
        <div
          className="rounded-xl border px-3.5 py-2.5"
          style={{ borderColor: `${accent}20`, borderLeftWidth: 3, borderLeftColor: accent }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: accent }}>{icon}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium" style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}>
              {label}
            </span>
            <span className="text-[12px] text-white/75 flex-1 truncate">{event.title}</span>
            <span className="text-[10px] text-white/30">{formatTime(event.ts)}</span>
          </div>
          {event.detail && (
            <p className="mt-1.5 text-[11px] text-white/50 font-mono break-all">{event.detail}</p>
          )}
          {event.metrics && typeof event.metrics.bytes === "number" && event.metrics.bytes > 0 && (
            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] text-white/45 font-mono">
              {event.metrics.bytes} bytes
            </span>
          )}
        </div>
      </div>
    );
  }

  if (event.kind === "delivery") {
    return (
      <div className="animate-fadeIn">
        <div
          className="rounded-xl border px-3.5 py-3"
          style={{ borderColor: `${accent}30`, borderLeftWidth: 3, borderLeftColor: accent, background: `${accent}06` }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: accent }}>{icon}</span>
            <span className="text-[12px] font-medium" style={{ color: accent }}>{event.title}</span>
            <span className="text-[10px] text-white/30 ml-auto">{formatTime(event.ts)}</span>
          </div>
          {event.detail && (
            <p className="text-[11px] text-white/55 mt-1.5 leading-relaxed">{event.detail}</p>
          )}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="animate-fadeIn">
      <div className="rounded-xl border border-white/[0.08] px-3.5 py-2.5" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
        <div className="flex items-center gap-2.5">
          <span style={{ color: accent }}>{icon}</span>
          <span className="text-[12px] text-white/75 flex-1 truncate">{event.title}</span>
          <span className="text-[10px] text-white/30">{formatTime(event.ts)}</span>
        </div>
        {event.detail && <p className="text-[11px] text-white/50 mt-1.5">{event.detail}</p>}
      </div>
    </div>
  );
}
