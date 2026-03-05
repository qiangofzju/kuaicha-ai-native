"use client";

import { useMemo, useState } from "react";
import type { ChatSkillRun } from "@/types/chat";
import { skillService } from "@/services/skillService";

interface SkillRunInlinePanelProps {
  run: ChatSkillRun;
}

function statusLabel(status: ChatSkillRun["status"]): string {
  if (status === "pending") return "排队中";
  if (status === "running") return "执行中";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  return "失败";
}

function statusColor(status: ChatSkillRun["status"]): string {
  if (status === "completed") return "#10B981";
  if (status === "running") return "#93C5FD";
  if (status === "cancelled") return "#F59E0B";
  if (status === "failed") return "#EF4444";
  return "#94A3B8";
}

export function SkillRunInlinePanel({ run }: SkillRunInlinePanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportHint, setExportHint] = useState("");

  const latestTrace = useMemo(() => run.trace_events[run.trace_events.length - 1], [run.trace_events]);

  const handleExport = async () => {
    if (!run.result?.task_id) return;
    setExporting(true);
    setExportHint("");
    try {
      const info = await skillService.exportRunResult(run.result.task_id, "excel");
      if (info.fallback) {
        setExportHint("已降级为 CSV 导出");
      }
    } catch (err) {
      setExportHint(err instanceof Error ? err.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-white/[0.1] bg-white/[0.02] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-white/82">技能执行状态</p>
        <span
          className="px-2 py-0.5 rounded-md text-[10px] border"
          style={{ borderColor: `${statusColor(run.status)}55`, color: statusColor(run.status), background: `${statusColor(run.status)}16` }}
        >
          {statusLabel(run.status)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/45">
        <span>run_id: {run.run_id.slice(0, 8)}...</span>
        {typeof run.progress === "number" && <span>{Math.max(0, Math.min(100, Math.round(run.progress)))}%</span>}
        {run.stage && <span>· {run.stage}</span>}
      </div>

      {run.message && <p className="text-[12px] text-white/62">{run.message}</p>}
      {latestTrace?.detail && <p className="text-[12px] text-white/60">{latestTrace.detail}</p>}

      {run.trace_events.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto rounded-lg border border-white/[0.08] bg-black/20 p-2 space-y-1.5">
          {run.trace_events.slice(-12).map((trace) => (
            <div key={trace.event_id} className="text-[11px] text-white/58">
              <span className="text-white/35">[{trace.stage}]</span> {trace.title}
            </div>
          ))}
        </div>
      )}

      {run.status === "failed" && run.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[12px] text-red-300/85">
          {run.error}
        </div>
      )}

      {run.status === "completed" && run.result && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 space-y-2">
          <p className="text-[12px] text-white/82">{run.result.summary}</p>
          <p className="text-[11px] text-white/45">预览 {run.result.preview_rows?.length || 0} 条 / 总计 {run.result.total_count ?? 0} 条</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-2.5 py-1 rounded-md text-[11px] border border-chat/[0.35] text-chat/85 bg-chat/[0.1] disabled:opacity-50"
            >
              {exporting ? "导出中..." : "导出 Excel"}
            </button>
            {exportHint && <span className="text-[11px] text-amber-300/85">{exportHint}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
