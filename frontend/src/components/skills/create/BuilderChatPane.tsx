"use client";

import { useEffect, useMemo, useState } from "react";
import type { SkillTraceEvent } from "@/types/skill";
import { ToolCallCard, type ToolCallView } from "./ToolCallCard";

interface BuilderChatPaneProps {
  prompt: string;
  conversationTurns: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  awaitingUserReply: boolean;
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

type NarrativeStatus = "running" | "done" | "warning" | "error" | "cancelled";

interface GroupedNarrativeStep {
  kind: "narrative";
  key: string;
  groupKey: string;
  title: string;
  stage: string;
  status: NarrativeStatus;
  lines: string[];
  latestLine: string;
  openFilePath?: string;
}

type TimelineItem =
  | { kind: "tool"; key: string; toolId: string }
  | GroupedNarrativeStep;

const NARRATIVE_KINDS = new Set<SkillTraceEvent["kind"]>([
  "thinking",
  "plan",
  "clarification",
  "delivery",
  "warn",
  "error",
  "info",
  "fs_change",
  "file_write",
]);

function normalizeNarrativeTitle(event: SkillTraceEvent): string {
  if (event.kind === "plan") return "更新计划";
  if (event.kind === "clarification") return event.title || "需要你确认的信息";
  if (event.kind === "delivery") return event.title || "交付总结";
  if (event.kind === "warn" || event.kind === "error") return event.title || "执行异常";
  if (event.kind === "fs_change" || event.kind === "file_write") return event.title || "文件变更";
  return event.title || event.stage || "技能规划";
}

function normalizeNarrativeStatus(event: SkillTraceEvent): NarrativeStatus {
  if (event.status === "error") return "error";
  if (event.status === "warning") return "warning";
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "done") return "done";
  return "running";
}

function buildTimeline(events: SkillTraceEvent[]): { tools: ToolCallView[]; items: TimelineItem[] } {
  const toolMap = new Map<string, ToolCallView>();
  const toolOrder: string[] = [];
  const items: TimelineItem[] = [];

  const ensureTool = (toolId: string, title: string, command: string): ToolCallView => {
    const existing = toolMap.get(toolId);
    if (existing) return existing;
    const tool: ToolCallView = {
      toolId,
      toolCallId: toolId,
      title,
      command,
      status: "running",
      lines: [],
      artifacts: [],
    };
    toolMap.set(toolId, tool);
    toolOrder.push(toolId);
    items.push({ kind: "tool", key: toolId, toolId });
    return tool;
  };

  let activeNarrative: GroupedNarrativeStep | null = null;

  const pushNarrative = (event: SkillTraceEvent) => {
    const title = normalizeNarrativeTitle(event);
    const line = event.detail.trim();
    const groupKey = `${event.kind}:${event.stage}:${title}`;
    const status = normalizeNarrativeStatus(event);
    const openFilePath = event.kind === "fs_change" || event.kind === "file_write"
      ? event.detail.replace(/^create\s+/i, "").trim()
      : undefined;

    const shouldStartNewGroup =
      !activeNarrative ||
      activeNarrative.groupKey !== groupKey ||
      activeNarrative.status === "done" ||
      activeNarrative.status === "warning" ||
      activeNarrative.status === "error" ||
      activeNarrative.status === "cancelled";

    if (shouldStartNewGroup) {
      activeNarrative = {
        kind: "narrative",
        key: event.event_id,
        groupKey,
        title,
        stage: event.stage,
        status,
        lines: line ? [line] : [],
        latestLine: line,
        openFilePath,
      };
      items.push(activeNarrative);
      return;
    }

    if (line) {
      activeNarrative.lines.push(line);
      activeNarrative.latestLine = line;
    }
    activeNarrative.status = status;
    if (openFilePath) {
      activeNarrative.openFilePath = openFilePath;
    }
  };

  events.forEach((event) => {
    const metricToolId = typeof event.metrics?.tool_id === "string" ? event.metrics.tool_id : "";
    const metricToolCallId = typeof event.metrics?.tool_call_id === "string" ? event.metrics.tool_call_id : "";
    const fallbackId = event.event_id;
    const toolId = metricToolCallId || metricToolId || fallbackId;

    if (event.kind === "tool_start" || event.kind === "tool_call") {
      activeNarrative = null;
      const tool = ensureTool(toolId, event.title || "工具调用", event.detail || "");
      if (typeof event.metrics?.cmd === "string") {
        tool.command = event.metrics.cmd;
      }
      if (typeof event.metrics?.workspace_id === "string") {
        tool.workspaceId = event.metrics.workspace_id;
      }
      if (typeof event.metrics?.started_at_ms === "number") {
        tool.startedAtMs = event.metrics.started_at_ms;
      }
      if (metricToolCallId) {
        tool.toolCallId = metricToolCallId;
      }
      return;
    }

    if (event.kind === "tool_stdout" || event.kind === "tool_stderr" || event.kind === "tool_result" || event.kind === "tool_end") {
      activeNarrative = null;
      const tool = ensureTool(toolId, "工具调用", "");
      if ((event.kind === "tool_stdout" || event.kind === "tool_stderr") && event.detail) {
        tool.lines.push({
          stream: event.kind === "tool_stderr" ? "stderr" : "stdout",
          line: event.detail,
          ts: event.ts,
        });
      }
      if (event.kind === "tool_result" && event.detail) {
        tool.lines.push({
          stream: event.status === "error" ? "stderr" : "stdout",
          line: event.detail,
          ts: event.ts,
        });
      }
      if (event.kind === "tool_end") {
        tool.status = event.status === "error" ? "error" : event.status === "cancelled" ? "cancelled" : "done";
        if (typeof event.metrics?.exit_code === "number") tool.exitCode = event.metrics.exit_code;
        if (typeof event.metrics?.duration_ms === "number") tool.durationMs = event.metrics.duration_ms;
        if (typeof event.metrics?.started_at_ms === "number") tool.startedAtMs = event.metrics.started_at_ms;
        if (typeof event.metrics?.finished_at_ms === "number") tool.finishedAtMs = event.metrics.finished_at_ms;
        if (Array.isArray(event.metrics?.artifacts)) {
          tool.artifacts = (event.metrics.artifacts as Array<Record<string, unknown>>)
            .map((item) => {
              const op = item.op;
              const path = item.path;
              if (typeof op !== "string" || typeof path !== "string") return null;
              if (!["created", "updated", "deleted"].includes(op)) return null;
              return { op: op as "created" | "updated" | "deleted", path };
            })
            .filter((item): item is { op: "created" | "updated" | "deleted"; path: string } => Boolean(item));
        }
      } else if (event.status === "error") {
        tool.status = "error";
      }
      if (event.title && !tool.title) tool.title = event.title;
      if (metricToolCallId && !tool.toolCallId) tool.toolCallId = metricToolCallId;
      if (typeof event.metrics?.workspace_id === "string" && !tool.workspaceId) tool.workspaceId = event.metrics.workspace_id;
      return;
    }

    if (NARRATIVE_KINDS.has(event.kind)) {
      pushNarrative(event);
    }
  });

  return {
    tools: toolOrder.map((id) => toolMap.get(id)).filter((item): item is ToolCallView => Boolean(item)),
    items,
  };
}

function statusMeta(status: NarrativeStatus) {
  if (status === "done") return { label: "已完成", tone: "rgba(255,255,255,0.58)" };
  if (status === "warning") return { label: "注意", tone: "#F59E0B" };
  if (status === "error") return { label: "失败", tone: "#F87171" };
  if (status === "cancelled") return { label: "已取消", tone: "#F59E0B" };
  return { label: "执行中", tone: "#A7B6D0" };
}

export function BuilderChatPane({
  prompt,
  conversationTurns,
  awaitingUserReply,
  traceEvents,
  inputValue,
  running,
  submitting,
  onInputChange,
  onSend,
  onStop,
  onOpenFile,
}: BuilderChatPaneTraceProps) {
  const { tools, items } = useMemo(() => buildTimeline(traceEvents), [traceEvents]);
  const toolMap = useMemo(() => new Map(tools.map((tool) => [tool.toolId, tool])), [tools]);
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});
  const stateHint = awaitingUserReply
    ? "等待你的确认回复"
    : submitting
      ? "正在提交创建请求"
    : running
      ? "正在创建技能"
      : conversationTurns.length > 0 || traceEvents.length > 0
        ? "本轮创建已结束"
        : "等待新的创建指令";

  useEffect(() => {
    const latestNarrative = [...items].reverse().find((item) => item.kind === "narrative");
    if (!latestNarrative || latestNarrative.kind !== "narrative") return;
    if (latestNarrative.status === "running" && collapsedKeys[latestNarrative.key]) {
      setCollapsedKeys((current) => ({ ...current, [latestNarrative.key]: false }));
    }
  }, [collapsedKeys, items]);

  return (
    <section
      className="h-full min-h-[720px] rounded-xl border overflow-hidden flex flex-col"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-inset), var(--shadow-mid)",
      }}
    >
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {conversationTurns.length === 0 && prompt && (
          <div className="ml-auto max-w-[88%] rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <p className="text-[13px] text-white/80 whitespace-pre-wrap">{prompt}</p>
          </div>
        )}

        {conversationTurns.map((turn) => (
          <div
            key={turn.id}
            className={turn.role === "user" ? "ml-auto max-w-[88%]" : "max-w-[95%]"}
          >
            <div
              className="rounded-[10px] border px-4 py-3"
              style={{
                borderColor: turn.role === "user" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
                background: turn.role === "user" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-[13px] leading-6 text-white/80 whitespace-pre-wrap">{turn.content}</p>
            </div>
          </div>
        ))}

        <div className="max-w-[95%] space-y-2.5">
          <div className="rounded-[10px] border border-white/[0.08] bg-black/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  running
                    ? "bg-emerald-400 animate-pulse"
                    : awaitingUserReply
                      ? "bg-amber-400"
                      : submitting
                        ? "bg-sky-400 animate-pulse"
                        : "bg-white/30"
                }`}
              />
              <p className="text-[12px] text-white/68">{stateHint}</p>
            </div>
          </div>

          {items.map((item) => {
            if (item.kind === "tool") {
              const tool = toolMap.get(item.toolId);
              if (!tool) return null;
              return <ToolCallCard key={item.key} tool={tool} onOpenArtifact={(path) => onOpenFile(path)} />;
            }

            const { label, tone } = statusMeta(item.status);
            const isCollapsed = collapsedKeys[item.key] ?? item.status !== "running";
            const bodyPreview = item.latestLine || item.lines[0] || "等待输出...";

            return (
              <div key={item.key} className="rounded-[10px] border border-white/[0.08] bg-black/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsedKeys((current) => ({ ...current, [item.key]: !isCollapsed }))}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-white/88">{item.title}</p>
                        <span className="text-[11px]" style={{ color: tone }}>{label}</span>
                      </div>
                      <p className="mt-1 text-[12px] leading-6 text-white/50 line-clamp-2">{bodyPreview}</p>
                    </div>
                    <span className="shrink-0 text-[12px] text-white/34">{isCollapsed ? "展开" : "收起"}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-white/[0.08] px-4 py-3 space-y-2">
                    {item.lines.length === 0 && (
                      <p className="text-[12px] text-white/38">等待流式输出...</p>
                    )}
                    {item.lines.map((line, index) => (
                      <p key={`${item.key}-${index}`} className="text-[12px] leading-6 text-white/72 whitespace-pre-wrap break-words">
                        {line}
                      </p>
                    ))}
                    {item.openFilePath && (
                      <button
                        type="button"
                        onClick={() => onOpenFile(item.openFilePath!)}
                        className="inline-flex items-center rounded-[8px] border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/66 hover:text-white/86 hover:bg-white/[0.04]"
                      >
                        查看文件
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {traceEvents.length === 0 && (
            <p className="px-1 text-[12px] text-white/36">等待流式事件...</p>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.08] p-3.5">
        <div className="rounded-[10px] border border-white/[0.12] bg-black/25 px-3 py-2.5 flex items-center gap-2">
          <textarea
            rows={4}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={awaitingUserReply ? "回复上面的确认问题，继续创建技能" : "追加需求，继续技能创建流程"}
            className="min-h-[112px] flex-1 bg-transparent border-none outline-none text-[13px] leading-6 text-white/82 resize-none placeholder:text-white/35"
          />
          {running && (
            <button
              type="button"
              onClick={onStop}
              className="px-2.5 py-1 rounded-[8px] border border-red-400/30 text-[11px] text-red-300/90"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={submitting || !inputValue.trim()}
            className="px-2.5 py-1 rounded-[8px] border border-skills/45 bg-skills/18 text-[11px] text-skills disabled:opacity-45"
          >
            {submitting ? "发送中..." : "发送"}
          </button>
        </div>
      </footer>
    </section>
  );
}
