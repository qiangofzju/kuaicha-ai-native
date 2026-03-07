"use client";

import { useMemo, useState } from "react";

export interface ToolLine {
  stream: "stdout" | "stderr";
  line: string;
  ts?: string;
}

export interface ToolCallArtifact {
  op: "created" | "updated" | "deleted";
  path: string;
}

export interface ToolCallView {
  toolId: string;
  toolCallId: string;
  title: string;
  command: string;
  status: "running" | "done" | "error" | "cancelled";
  lines: ToolLine[];
  startedAtMs?: number;
  finishedAtMs?: number;
  durationMs?: number;
  exitCode?: number;
  workspaceId?: string;
  artifacts: ToolCallArtifact[];
}

interface ToolCallCardProps {
  tool: ToolCallView;
  onOpenArtifact?: (path: string) => void;
}

export function ToolCallCard({ tool, onOpenArtifact }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = tool.status === "done" ? "#10B981" : tool.status === "error" ? "#EF4444" : tool.status === "cancelled" ? "#F59E0B" : "#4A9EFF";
  const outputCount = tool.lines.length;
  const lastLine = tool.lines[tool.lines.length - 1]?.line || "";
  const duration = tool.durationMs || (tool.startedAtMs && tool.finishedAtMs ? Math.max(0, tool.finishedAtMs - tool.startedAtMs) : 0);
  const artifactCount = tool.artifacts.length;

  const commandSummary = useMemo(() => {
    if (!tool.command) return tool.title;
    if (tool.command.length <= 80) return tool.command;
    return `${tool.command.slice(0, 80)}...`;
  }, [tool.command, tool.title]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/30 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md border font-medium"
            style={{ borderColor: `${color}55`, color, background: `${color}14` }}
          >
            {tool.status === "running" ? "执行中" : tool.status === "done" ? "已完成" : tool.status === "cancelled" ? "已取消" : "失败"}
          </span>
          <p className="text-[12px] text-white/80 truncate">{tool.title}</p>
        </div>
        <div className="shrink-0 text-[10px] text-white/45">
          #{tool.toolCallId || tool.toolId} {duration > 0 ? `· ${duration}ms` : ""}
        </div>
      </div>

      <div className="px-3.5 py-3 space-y-2">
        <div className="rounded-md border border-white/[0.08] bg-black/35 px-2.5 py-2">
          <code className="text-[11px] text-white/70 break-all">{commandSummary}</code>
        </div>

        <div className="rounded-md border border-white/[0.08] bg-black/45 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px]"
          >
            <span className="text-white/72">输出 {outputCount} 行</span>
            <span className="text-white/45">{lastLine ? `${lastLine.slice(0, 60)}${lastLine.length > 60 ? "..." : ""}` : "等待输出..."}</span>
          </button>
          {expanded && (
            <div className="max-h-[180px] overflow-y-auto border-t border-white/[0.08] px-2.5 py-2 space-y-1">
              {tool.lines.length === 0 && (
                <p className="text-[11px] text-white/35">等待输出...</p>
              )}
              {tool.lines.map((line, idx) => (
                <p
                  key={`${tool.toolId}-${idx}`}
                  className="text-[11px] font-mono leading-relaxed break-all"
                  style={{ color: line.stream === "stderr" ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.72)" }}
                >
                  {line.line}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-white/45">
          <span>exitCode: {tool.exitCode ?? "-"}</span>
          <span>workspace: {tool.workspaceId || "-"}</span>
        </div>

        <div className="rounded-md border border-white/[0.08] bg-black/35 px-2.5 py-2">
          <p className="text-[11px] text-white/68">本次变更文件：{artifactCount} 个</p>
          <div className="mt-1 space-y-1">
            {tool.artifacts.map((item, idx) => (
              <button
                key={`${item.path}-${idx}`}
                type="button"
                onClick={() => onOpenArtifact?.(item.path)}
                className="block text-left text-[11px] font-mono text-white/72 hover:text-white/92"
              >
                [{item.op}] {item.path}
              </button>
            ))}
            {artifactCount === 0 && <p className="text-[11px] text-white/40">无文件变更</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

