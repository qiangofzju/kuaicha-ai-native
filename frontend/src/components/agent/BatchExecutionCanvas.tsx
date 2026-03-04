"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AgentProgress, AgentTraceEvent } from "@/types/agent";
import { theme } from "@/styles/theme";

const STAGES = [
  { key: "parse", label: "需求解析" },
  { key: "query", label: "数据查询" },
  { key: "transform", label: "字段加工" },
  { key: "deliver", label: "数据交付" },
];

interface BatchExecutionCanvasProps {
  progress: AgentProgress | null;
  traceEvents: AgentTraceEvent[];
  onStop?: () => void;
  resultReady?: boolean;
  onViewResult?: () => void;
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

function getActiveStageIndex(progress: AgentProgress | null, traces: AgentTraceEvent[]): number {
  const latest = traces[traces.length - 1];
  if (latest && Number.isFinite(latest.stage_index)) {
    return Math.max(0, Math.min(3, latest.stage_index));
  }
  if (progress?.stageIndex !== undefined) {
    return Math.max(0, Math.min(3, progress.stageIndex));
  }
  const pct = progress?.progress ?? 0;
  if (pct < 25) return 0;
  if (pct < 50) return 1;
  if (pct < 75) return 2;
  return 3;
}

function statusTone(status: AgentTraceEvent["status"] | "running") {
  if (status === "error") return "#EF4444";
  if (status === "warning") return "#F59E0B";
  if (status === "done") return "#10B981";
  return theme.colors.modules.agent;
}

function kindLabel(kind: AgentTraceEvent["kind"]): string {
  if (kind === "phase_start") return "阶段开始";
  if (kind === "phase_done") return "阶段完成";
  if (kind === "routing") return "路由";
  if (kind === "query") return "查询";
  if (kind === "transform") return "加工";
  if (kind === "delivery") return "交付";
  if (kind === "warn") return "警告";
  if (kind === "error") return "异常";
  return "信息";
}

export function BatchExecutionCanvas({
  progress,
  traceEvents,
  onStop,
  resultReady = false,
  onViewResult,
}: BatchExecutionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const accent = theme.colors.modules.agent;
  const activeStageIndex = getActiveStageIndex(progress, traceEvents);
  const pct = Math.max(0, Math.min(100, Math.round(progress?.progress ?? 0)));
  const latestStatus = traceEvents[traceEvents.length - 1]?.status ?? (resultReady ? "done" : "running");

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [traceEvents.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const particles = Array.from({ length: 20 }, (_item, idx) => ({
      offset: idx / 20,
      speed: 0.03 + (idx % 6) * 0.01,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(320, rect.width);
      h = Math.max(170, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const y = h * 0.52;
      const left = 52;
      const right = w - 52;
      const segment = (right - left) / (STAGES.length - 1);
      const progressX = left + ((right - left) * pct) / 100;

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "rgba(6, 182, 212, 0.06)");
      bg.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 3;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--canvas-grid").trim() || "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.shadowBlur = 16;
      ctx.shadowColor = `${accent}66`;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(progressX, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      STAGES.forEach((_stage, idx) => {
        const x = left + segment * idx;
        const isDone = idx < activeStageIndex;
        const isActive = idx === activeStageIndex;
        const radius = isActive ? 11 : 8;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isDone ? accent : isActive ? `${accent}66` : (getComputedStyle(document.documentElement).getPropertyValue("--canvas-node-fill").trim() || "rgba(255,255,255,0.18)");
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? `${accent}AA` : (getComputedStyle(document.documentElement).getPropertyValue("--canvas-node-stroke").trim() || "rgba(255,255,255,0.12)");
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      if (!reduceMotion) {
        particles.forEach((p) => {
          const phase = (t / 1000) * p.speed + p.offset;
          const x = left + ((phase % 1) * (right - left) * Math.max(pct, 8)) / 100;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `${accent}CC`;
          ctx.fill();
        });
      }

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    window.addEventListener("resize", resize);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [accent, activeStageIndex, pct, reduceMotion]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-white/75">执行轨迹</h3>
            <p className="text-[12px] text-white/38 mt-0.5">流式展示当前步骤与关键事件（脱敏）</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 rounded-md text-[11px] border"
              style={{
                borderColor: `${statusTone(latestStatus)}50`,
                color: statusTone(latestStatus),
                background: `${statusTone(latestStatus)}16`,
              }}
            >
              {latestStatus === "done" ? "稳定" : latestStatus === "warning" ? "告警" : latestStatus === "error" ? "异常" : "运行中"}
            </span>
            <span className="text-[12px] text-white/65">{pct}%</span>
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-all hover:bg-red-500/10"
                style={{
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "rgba(239,68,68,0.6)",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
                </svg>
                停止
              </button>
            )}
            {resultReady && onViewResult && (
              <button
                type="button"
                onClick={onViewResult}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-all"
                style={{
                  borderColor: `${accent}55`,
                  color: accent,
                  background: `${accent}14`,
                }}
              >
                查看结果
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 py-2">
          <canvas ref={canvasRef} className="w-full h-[180px] block" />
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {STAGES.map((stage, idx) => {
            const active = idx === activeStageIndex;
            const done = idx < activeStageIndex;
            return (
              <div
                key={stage.key}
                className="rounded-lg border px-2.5 py-2 text-center text-[11px]"
                style={{
                  borderColor: active ? `${accent}5C` : "var(--select-option-border)",
                  background: done ? `${accent}14` : active ? `${accent}20` : "var(--select-option-bg)",
                  color: done || active ? accent : "var(--tab-inactive-text)",
                }}
              >
                {stage.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h4 className="text-[12px] text-white/65">执行事件时间轴</h4>
        </div>
        <div ref={timelineRef} className="max-h-[300px] overflow-y-auto px-3 py-3 space-y-2">
          {traceEvents.length === 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] text-white/38">
              正在等待执行事件…
            </div>
          )}
          {traceEvents.map((event) => (
            <div
              key={event.event_id}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: statusTone(event.status) }}
                  />
                  <p className="text-[12px] text-white/80 truncate">{event.title}</p>
                </div>
                <span className="text-[10px] text-white/35 shrink-0">{fmtTime(event.ts)}</span>
              </div>
              <p className="text-[11px] text-white/45 mt-1">
                {event.stage} · {kindLabel(event.kind)}
              </p>
              {event.detail && (
                <p className="text-[12px] text-white/62 mt-1.5 leading-relaxed break-all">{event.detail}</p>
              )}
              {event.metrics && Object.keys(event.metrics).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(event.metrics).map(([key, value]) => (
                    <span
                      key={key}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] text-white/55"
                    >
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
