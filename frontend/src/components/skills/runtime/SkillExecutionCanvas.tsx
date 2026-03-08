"use client";

import { useEffect, useMemo, useRef } from "react";
import type { SkillProgress, SkillTraceEvent } from "@/types/skill";

const DEFAULT_STAGES = ["初始化", "执行中", "完成"];

interface SkillExecutionCanvasProps {
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  accentColor: string;
  stages?: string[];
  onStop?: () => void;
  resultReady?: boolean;
  onViewResult?: () => void;
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

function getActiveStageIndex(progress: SkillProgress | null, traceEvents: SkillTraceEvent[], maxIndex: number): number {
  const latest = traceEvents[traceEvents.length - 1];
  if (latest && Number.isFinite(latest.stage_index)) {
    return Math.max(0, Math.min(maxIndex, latest.stage_index));
  }
  if (progress?.stageIndex !== undefined) {
    return Math.max(0, Math.min(maxIndex, progress.stageIndex));
  }
  const pct = progress?.progress ?? 0;
  const step = 100 / (maxIndex + 1);
  return Math.min(maxIndex, Math.floor(pct / step));
}

function statusColor(status: SkillTraceEvent["status"] | "running"): string {
  if (status === "error") return "#EF4444";
  if (status === "warning") return "#F59E0B";
  if (status === "done") return "#10B981";
  return "#94A3B8";
}

function kindLabel(kind: SkillTraceEvent["kind"]): string {
  if (kind === "phase_start") return "阶段开始";
  if (kind === "phase_done") return "阶段完成";
  if (kind === "routing") return "路由";
  if (kind === "query") return "查询";
  if (kind === "transform") return "加工";
  if (kind === "delivery") return "交付";
  if (kind === "thinking") return "思考";
  if (kind === "tool_call") return "工具调用";
  if (kind === "tool_result") return "工具结果";
  if (kind === "file_write") return "文件创建";
  if (kind === "plan") return "计划";
  if (kind === "tool_start") return "工具开始";
  if (kind === "tool_stdout") return "标准输出";
  if (kind === "tool_stderr") return "错误输出";
  if (kind === "tool_end") return "工具结束";
  if (kind === "fs_change") return "文件变更";
  if (kind === "warn") return "警告";
  if (kind === "error") return "异常";
  return "信息";
}

export function SkillExecutionCanvas({
  progress,
  traceEvents,
  accentColor,
  stages: stagesProp,
  onStop,
  resultReady,
  onViewResult,
}: SkillExecutionCanvasProps) {
  const stages = stagesProp?.length ? stagesProp : DEFAULT_STAGES;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(100, Math.round(progress?.progress ?? 0)));
  const activeStageIndex = getActiveStageIndex(progress, traceEvents, stages.length - 1);

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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
    const stageCount = stages.length;

    const particles = Array.from({ length: 16 }, (_item, idx) => ({
      offset: idx / 16,
      speed: 0.025 + (idx % 5) * 0.01,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(320, rect.width);
      h = Math.max(170, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      const y = h * 0.52;
      const left = 48;
      const right = w - 48;
      const segment = stageCount > 1 ? (right - left) / (stageCount - 1) : right - left;
      const progressX = left + ((right - left) * pct) / 100;

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "rgba(245,158,11,0.08)");
      bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      ctx.strokeStyle = accentColor;
      ctx.shadowBlur = 14;
      ctx.shadowColor = `${accentColor}66`;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(progressX, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      for (let idx = 0; idx < stageCount; idx++) {
        const x = left + segment * idx;
        const isDone = idx < activeStageIndex;
        const isActive = idx === activeStageIndex;

        ctx.beginPath();
        ctx.arc(x, y, isActive ? 10 : 7.5, 0, Math.PI * 2);
        ctx.fillStyle = isDone ? accentColor : isActive ? `${accentColor}66` : "rgba(255,255,255,0.15)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, isActive ? 15 : 12, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? `${accentColor}88` : "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (!reduceMotion) {
        particles.forEach((particle) => {
          const phase = (time / 1000) * particle.speed + particle.offset;
          const x = left + ((phase % 1) * (right - left) * Math.max(pct, 8)) / 100;
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `${accentColor}CC`;
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
  }, [accentColor, pct, activeStageIndex, reduceMotion, stages.length]);

  const latestStatus = traceEvents[traceEvents.length - 1]?.status ?? (resultReady ? "done" : "running");
  const gridCols = stages.length <= 3 ? `grid-cols-${stages.length}` : stages.length === 4 ? "grid-cols-2 md:grid-cols-4" : `grid-cols-2 md:grid-cols-${Math.min(stages.length, 6)}`;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-white/75">技能执行轨迹</h3>
            <p className="text-[12px] text-white/38 mt-0.5">流式展示当前步骤与关键事件（脱敏）</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 rounded-md text-[11px] border"
              style={{
                borderColor: `${statusColor(latestStatus)}55`,
                background: `${statusColor(latestStatus)}16`,
                color: statusColor(latestStatus),
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
                style={{ borderColor: "rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}
              >
                <span className="w-1.5 h-1.5 rounded-sm bg-current" />
                停止
              </button>
            )}
            {resultReady && onViewResult && (
              <button
                type="button"
                onClick={onViewResult}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-all"
                style={{ borderColor: `${accentColor}55`, color: accentColor, background: `${accentColor}12` }}
              >
                查看结果
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 py-2">
          <canvas ref={canvasRef} className="w-full h-[180px] block" />
        </div>

        <div className={`mt-3 grid gap-2 ${gridCols}`}>
          {stages.map((stage, idx) => {
            const active = idx === activeStageIndex;
            const done = idx < activeStageIndex;
            return (
              <div
                key={stage}
                className="rounded-lg border px-2.5 py-2 text-center text-[11px]"
                style={{
                  borderColor: active ? `${accentColor}5C` : "var(--select-option-border)",
                  background: done ? `${accentColor}12` : active ? `${accentColor}1E` : "var(--select-option-bg)",
                  color: done || active ? accentColor : "var(--tab-inactive-text)",
                }}
              >
                {stage}
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
              正在等待执行事件...
            </div>
          )}
          {traceEvents.map((event) => (
            <div key={event.event_id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor(event.status) }} />
                  <p className="text-[12px] text-white/80 truncate">{event.title}</p>
                </div>
                <span className="text-[10px] text-white/35 shrink-0">{fmtTime(event.ts)}</span>
              </div>
              <p className="text-[11px] text-white/45 mt-1">
                {event.stage} · {kindLabel(event.kind)}
              </p>
              {event.detail && (event.kind === "tool_call" || event.kind === "tool_start") && (
                <div className="mt-1.5 rounded-md border border-white/[0.08] bg-black/30 px-2.5 py-2">
                  <code className="text-[11px] text-white/68 break-all">{event.detail}</code>
                </div>
              )}
              {event.detail && (event.kind === "tool_stdout" || event.kind === "tool_stderr") && (
                <div className="mt-1.5 rounded-md border border-white/[0.08] bg-black/30 px-2.5 py-2">
                  <code className="text-[11px] break-all" style={{ color: event.kind === "tool_stderr" ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.7)" }}>
                    {event.detail}
                  </code>
                </div>
              )}
              {event.detail && !["tool_call", "tool_start", "tool_stdout", "tool_stderr"].includes(event.kind) && (
                <p className="text-[12px] text-white/62 mt-1.5 leading-relaxed break-all">{event.detail}</p>
              )}
              {event.metrics && Object.keys(event.metrics).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(event.metrics).map(([key, value]) => (
                    <span key={key} className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] text-white/55">
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
