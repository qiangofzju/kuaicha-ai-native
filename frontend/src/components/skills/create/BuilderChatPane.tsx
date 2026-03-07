"use client";

import { useMemo, useState } from "react";
import type { SkillTraceEvent } from "@/types/skill";
import { ToolCallCard, type ToolCallView } from "./ToolCallCard";

interface BuilderChatPaneProps {
  prompt: string;
  inputValue: string;
  running: boolean;
  submitting: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onOpenFile: (path: string) => void;
}

interface BuilderChatPaneTraceProps extends BuilderChatPaneProps {
  traceEvents: SkillTraceEvent[];
}

function parseTools(events: SkillTraceEvent[]): ToolCallView[] {
  const toolMap = new Map<string, ToolCallView>();
  const order: string[] = [];

  const ensureTool = (toolId: string, title: string, command: string): ToolCallView => {
    const exists = toolMap.get(toolId);
    if (exists) return exists;
    const next: ToolCallView = {
      toolId,
      toolCallId: toolId,
      title,
      command,
      status: "running",
      lines: [],
      artifacts: [],
    };
    toolMap.set(toolId, next);
    order.push(toolId);
    return next;
  };

  events.forEach((event) => {
    const metricToolId = typeof event.metrics?.tool_id === "string" ? event.metrics.tool_id : "";
    const metricToolCallId = typeof event.metrics?.tool_call_id === "string" ? event.metrics.tool_call_id : "";
    const fallbackId = event.event_id;
    const toolId = metricToolCallId || metricToolId || fallbackId;

    if (event.kind === "tool_start" || event.kind === "tool_call") {
      const tool = ensureTool(toolId, event.title || "工具调用", event.detail || "");
      if (event.metrics?.cmd && typeof event.metrics.cmd === "string") {
        tool.command = event.metrics.cmd;
      }
      if (event.metrics?.workspace_id && typeof event.metrics.workspace_id === "string") {
        tool.workspaceId = event.metrics.workspace_id;
      }
      if (event.metrics?.started_at_ms && typeof event.metrics.started_at_ms === "number") {
        tool.startedAtMs = event.metrics.started_at_ms;
      }
      if (metricToolCallId) {
        tool.toolCallId = metricToolCallId;
      }
      return;
    }

    if (
      event.kind === "tool_stdout"
      || event.kind === "tool_stderr"
      || event.kind === "tool_result"
      || event.kind === "tool_end"
    ) {
      const tool = ensureTool(toolId, "工具调用", "");
      if ((event.kind === "tool_stdout" || event.kind === "tool_stderr") && event.detail) {
        tool.lines.push({
          stream: event.kind === "tool_stderr" ? "stderr" : "stdout",
          line: event.detail,
          ts: event.ts,
        });
      }
      if (event.kind === "tool_result" && event.detail) {
        tool.lines.push({ stream: event.status === "error" ? "stderr" : "stdout", line: event.detail, ts: event.ts });
      }
      if (event.kind === "tool_end") {
        tool.status = event.status === "error" ? "error" : event.status === "cancelled" ? "cancelled" : "done";
        if (typeof event.metrics?.exit_code === "number") {
          tool.exitCode = event.metrics.exit_code;
        }
        if (typeof event.metrics?.duration_ms === "number") {
          tool.durationMs = event.metrics.duration_ms;
        }
        if (typeof event.metrics?.started_at_ms === "number") {
          tool.startedAtMs = event.metrics.started_at_ms;
        }
        if (typeof event.metrics?.finished_at_ms === "number") {
          tool.finishedAtMs = event.metrics.finished_at_ms;
        }
        if (Array.isArray(event.metrics?.artifacts)) {
          const items = (event.metrics.artifacts as Array<Record<string, unknown>>)
            .map((item) => {
              const op = item.op;
              const path = item.path;
              if (typeof op !== "string" || typeof path !== "string") return null;
              if (!["created", "updated", "deleted"].includes(op)) return null;
              return { op: op as "created" | "updated" | "deleted", path };
            })
            .filter((item): item is { op: "created" | "updated" | "deleted"; path: string } => !!item);
          tool.artifacts = items;
        }
      } else if (event.status === "error") {
        tool.status = "error";
      }
      if (event.title && !tool.title) tool.title = event.title;
      if (metricToolCallId && !tool.toolCallId) {
        tool.toolCallId = metricToolCallId;
      }
      if (typeof event.metrics?.workspace_id === "string" && !tool.workspaceId) {
        tool.workspaceId = event.metrics.workspace_id;
      }
    }
  });

  return order.map((id) => toolMap.get(id)).filter((item): item is ToolCallView => !!item);
}

export function BuilderChatPane({
  prompt,
  traceEvents,
  inputValue,
  running,
  submitting,
  onInputChange,
  onSend,
  onStop,
  onOpenFile,
}: BuilderChatPaneTraceProps) {
  const [expandThinking, setExpandThinking] = useState(false);

  const thinkingEvents = useMemo(
    () => traceEvents.filter((event) => event.kind === "thinking"),
    [traceEvents],
  );
  const planEvents = useMemo(
    () => traceEvents.filter((event) => event.kind === "plan"),
    [traceEvents],
  );
  const fsEvents = useMemo(
    () => traceEvents.filter((event) => event.kind === "fs_change" || event.kind === "file_write"),
    [traceEvents],
  );
  const deliveryEvents = useMemo(
    () => traceEvents.filter((event) => event.kind === "delivery"),
    [traceEvents],
  );
  const tools = useMemo(() => parseTools(traceEvents), [traceEvents]);

  return (
    <section
      className="h-full min-h-[720px] rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-inset), var(--shadow-mid)",
      }}
    >
      <header className="px-5 py-4 border-b border-white/[0.08]">
        <h2 className="text-[14px] text-white/86 font-medium">Skill Builder Chat</h2>
        <p className="text-[12px] text-white/42 mt-1">Claude 风格执行流：思考 / 计划 / 工具 / 文件 / 交付</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {prompt && (
          <div className="ml-auto max-w-[90%] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <p className="text-[12px] text-white/75 whitespace-pre-wrap">{prompt}</p>
          </div>
        )}

        <div className="max-w-[95%] rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
            <p className="text-[12px] text-white/72">{running ? "Agent 正在创建技能..." : "Agent 输出"}</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/30">
            <button
              type="button"
              onClick={() => setExpandThinking((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <span className="text-[12px] text-white/78">思考过程 {thinkingEvents.length > 0 ? `(${thinkingEvents.length})` : ""}</span>
              <span className="text-[11px] text-white/40">{expandThinking ? "收起" : "展开"}</span>
            </button>
            {expandThinking && (
              <div className="px-3 pb-3 space-y-2">
                {thinkingEvents.length === 0 && <p className="text-[11px] text-white/35">等待思考事件...</p>}
                {thinkingEvents.map((event) => (
                  <div key={event.event_id} className="rounded-lg border border-white/[0.08] bg-black/35 px-2.5 py-2">
                    <p className="text-[11px] text-white/78">{event.title}</p>
                    <p className="text-[11px] text-white/52 mt-1 whitespace-pre-wrap">{event.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {planEvents.map((event) => (
            <div key={event.event_id} className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5">
              <p className="text-[12px] text-sky-300 font-medium">{event.title || "计划更新"}</p>
              <p className="text-[11px] text-white/70 mt-1 whitespace-pre-wrap">{event.detail}</p>
            </div>
          ))}

          {tools.map((tool) => (
            <ToolCallCard key={tool.toolId} tool={tool} onOpenArtifact={(path) => onOpenFile(path)} />
          ))}

          {fsEvents.length > 0 && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 space-y-1.5">
              <p className="text-[12px] text-emerald-300 font-medium">文件变更</p>
              {fsEvents.map((event) => (
                <button
                  key={event.event_id}
                  type="button"
                  onClick={() => {
                    const normalized = event.detail.replace(/^create\s+/i, "").trim();
                    onOpenFile(normalized);
                  }}
                  className="block text-left text-[11px] text-white/78 hover:text-white/95 font-mono"
                >
                  {event.detail}
                </button>
              ))}
            </div>
          )}

          {deliveryEvents.map((event) => (
            <div key={event.event_id} className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
              <p className="text-[12px] text-emerald-300 font-medium">{event.title || "交付总结"}</p>
              <p className="text-[11px] text-white/70 mt-1 whitespace-pre-wrap">{event.detail}</p>
            </div>
          ))}

          {traceEvents.length === 0 && (
            <p className="text-[12px] text-white/36">等待流式事件...</p>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.08] p-3.5">
        <div className="rounded-xl border border-white/[0.12] bg-black/25 px-3 py-2.5 flex items-center gap-2">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="追加需求，发送将重新启动创建流程"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-white/82 resize-none placeholder:text-white/35"
          />
          {running && (
            <button
              type="button"
              onClick={onStop}
              className="px-2.5 py-1 rounded-md border border-red-400/30 text-[11px] text-red-300/90"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={submitting || !inputValue.trim()}
            className="px-2.5 py-1 rounded-md border border-skills/45 bg-skills/18 text-[11px] text-skills disabled:opacity-45"
          >
            {submitting ? "发送中..." : "发送"}
          </button>
        </div>
      </footer>
    </section>
  );
}
