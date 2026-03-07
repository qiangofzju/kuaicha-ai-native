"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getWsUrl } from "@/services/api";
import { skillService } from "@/services/skillService";
import { getAgentIcon, Icons } from "@/components/shared/Icons";
import { useSkillRunChatStore } from "@/stores/skillRunChatStore";
import type { SkillDefinition, SkillManifest, SkillTraceEvent } from "@/types/skill";

interface SkillRunChatPageProps {
  skillId: string;
  skill: SkillDefinition;
  manifest: SkillManifest;
}

function formatRunStatus(status: string): string {
  if (status === "running") return "运行中";
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "cancelled") return "已停止";
  return "等待中";
}

function getRunStatusColor(status: string): string {
  if (status === "completed") return "#22C55E";
  if (status === "failed") return "#F87171";
  if (status === "cancelled") return "#F59E0B";
  if (status === "running") return "#60A5FA";
  return "rgba(255,255,255,0.58)";
}

function buildTraceSummary(traceEvents: SkillTraceEvent[]): string {
  const toolEnd = [...traceEvents].reverse().find((event) => event.kind === "tool_end");
  if (toolEnd) {
    const cmd = String(toolEnd.metrics?.cmd || toolEnd.detail || "脚本执行");
    const durationMs = Number(toolEnd.metrics?.duration_ms || 0);
    const status = toolEnd.status === "done" ? "success" : toolEnd.status;
    const shortCmd = cmd.length > 36 ? `${cmd.slice(0, 36)}...` : cmd;
    if (durationMs > 0) return `${shortCmd} · ${(durationMs / 1000).toFixed(1)}s · ${status}`;
    return `${shortCmd} · ${status}`;
  }
  if (traceEvents.length === 0) return "暂无轨迹";
  return `${traceEvents.length} 条运行轨迹`;
}

export function SkillRunChatPage({ skillId, skill, manifest }: SkillRunChatPageProps) {
  const workspaceWsRef = useRef<WebSocket | null>(null);
  const runWsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});

  const {
    composer,
    workspace,
    workspaceStatus,
    runSessionId,
    turns,
    activeRunId,
    initializing,
    submitting,
    workspaceError,
    runError,
    reset,
    setComposer,
    initializeWorkspace,
    ensureRunSession,
    reconnectWorkspace,
    setWorkspaceStatus,
    setWorkspaceError,
    startRun,
    markRunStart,
    updateRunProgress,
    appendRunStream,
    appendRunTrace,
    touchRun,
    completeRun,
    failRun,
    cancelActiveRun,
  } = useSkillRunChatStore();

  const accent = manifest.ui?.theme_accent || skill.color || "#22C55E";
  const SkillIcon = getAgentIcon(skill.icon || "Sparkle");
  const activeTurn = activeRunId ? turns.find((turn) => turn.runId === activeRunId) || null : null;
  const inputDisabled = workspaceStatus !== "ready" || Boolean(activeRunId) || submitting;
  const displayRoot = workspace?.display_root && !workspace.display_root.includes("/draft-")
    ? workspace.display_root
    : `/workspace/projects/${skillId}`;

  useEffect(() => {
    reset();
    setExpandedTurns({});
    void initializeWorkspace(skillId, true);

    return () => {
      if (workspaceWsRef.current) {
        workspaceWsRef.current.close();
        workspaceWsRef.current = null;
      }
      if (runWsRef.current) {
        runWsRef.current.close();
        runWsRef.current = null;
      }
    };
  }, [initializeWorkspace, reset, skillId]);

  useEffect(() => {
    if (workspaceStatus === "ready" && !runSessionId) {
      void ensureRunSession();
    }
  }, [ensureRunSession, runSessionId, workspaceStatus]);

  useEffect(() => {
    if (!workspace?.workspace_id) return;

    if (workspaceWsRef.current) {
      workspaceWsRef.current.close();
      workspaceWsRef.current = null;
    }

    const ws = new WebSocket(getWsUrl(`/ws/workspace/sessions/${workspace.workspace_id}`));
    workspaceWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = String(payload.type || "");
        const data = payload.data || {};
        if (type === "sandbox.state") {
          setWorkspaceStatus((data.status || "initializing") as "initializing" | "ready" | "failed");
          return;
        }
        if (type === "workspace.error") {
          setWorkspaceError(String(data.message || "沙盒连接异常"));
        }
      } catch {
        // ignore invalid websocket payloads
      }
    };

    ws.onclose = () => {
      if (useSkillRunChatStore.getState().workspace?.workspace_id === workspace.workspace_id) {
        setWorkspaceError("沙盒连接已断开，可尝试重连沙盒。");
      }
    };

    return () => {
      if (workspaceWsRef.current) {
        workspaceWsRef.current.close();
        workspaceWsRef.current = null;
      }
    };
  }, [setWorkspaceError, setWorkspaceStatus, workspace?.workspace_id]);

  useEffect(() => {
    if (!activeRunId) {
      if (runWsRef.current) {
        runWsRef.current.close();
        runWsRef.current = null;
      }
      return;
    }

    if (runWsRef.current) {
      runWsRef.current.close();
      runWsRef.current = null;
    }

    const ws = new WebSocket(getWsUrl(`/ws/skills/runs/${activeRunId}`));
    runWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = String(payload.type || "");
        const data = payload.data || {};

        if (type === "skill_heartbeat") {
          touchRun(activeRunId);
          return;
        }
        if (type === "skill_run_start") {
          markRunStart(activeRunId, (data.status || "running") as "pending" | "running");
          return;
        }
        if (type === "skill_progress") {
          updateRunProgress(activeRunId, {
            progress: Number(data.progress ?? 0),
            stage: String(data.stage ?? ""),
            message: String(data.message ?? ""),
            stageIndex: typeof data.stageIndex === "number" ? data.stageIndex : undefined,
            totalStages: typeof data.totalStages === "number" ? data.totalStages : undefined,
          });
          return;
        }
        if (type === "skill_stream") {
          appendRunStream(activeRunId, String(data.content || ""));
          return;
        }
        if (type === "skill_trace" && data && typeof data.event_id === "string") {
          appendRunTrace(activeRunId, {
            event_id: String(data.event_id),
            ts: String(data.ts || ""),
            stage: String(data.stage || ""),
            stage_index: Number(data.stage_index || 0),
            kind: data.kind || "info",
            title: String(data.title || ""),
            detail: String(data.detail || ""),
            metrics: typeof data.metrics === "object" && data.metrics ? data.metrics : {},
            status: data.status || "running",
          });
          return;
        }
        if (type === "skill_complete") {
          if (data.status === "cancelled") {
            failRun(activeRunId, "本轮运行已停止。", "cancelled");
            return;
          }
          void skillService
            .getRunResult(activeRunId)
            .then((result) => completeRun(activeRunId, result))
            .catch((err) => failRun(activeRunId, err instanceof Error ? err.message : "结果拉取失败"));
          return;
        }
        if (type === "skill_error") {
          failRun(activeRunId, String(data.message || "技能执行失败"));
        }
      } catch {
        // ignore invalid websocket payloads
      }
    };

    return () => {
      if (runWsRef.current) {
        runWsRef.current.close();
        runWsRef.current = null;
      }
    };
  }, [activeRunId, appendRunStream, appendRunTrace, completeRun, failRun, markRunStart, touchRun, updateRunProgress]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useSkillRunChatStore.getState();
      if (!state.activeRunId) return;
      const runningTurn = state.turns.find((turn) => turn.runId === state.activeRunId);
      if (!runningTurn) return;
      if (runningTurn.status !== "pending" && runningTurn.status !== "running") return;
      if (Date.now() - runningTurn.lastEventAt > 10_000) {
        state.setConnectionWarning(state.activeRunId, true);
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns]);

  const handleSubmit = async () => {
    const runId = await startRun(skillId);
    if (runId) {
      setExpandedTurns((current) => ({ ...current, [runId]: false }));
    }
  };

  const handleReconnect = async () => {
    if (workspaceWsRef.current) {
      workspaceWsRef.current.close();
      workspaceWsRef.current = null;
    }
    if (runWsRef.current) {
      runWsRef.current.close();
      runWsRef.current = null;
    }
    await reconnectWorkspace(skillId);
  };

  return (
    <div className="h-full overflow-y-auto px-6 pb-8 pt-5 animate-fadeIn">
      <div className="max-w-[1120px] mx-auto space-y-5">
        <Link
          href="/workspace/skills"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          返回技能广场
        </Link>

        <div
          className="relative overflow-hidden rounded-[28px] border p-5"
          style={{
            borderColor: "var(--card-border)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            boxShadow: "var(--card-inset), var(--shadow-mid)",
          }}
        >
          <div className="absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 100% 0%, ${accent}18, transparent 32%), radial-gradient(circle at 0% 100%, ${accent}10, transparent 26%)` }} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border" style={{ borderColor: `${accent}55`, background: `${accent}18`, color: accent }}>
                <SkillIcon />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[22px] font-semibold text-white">{manifest.display_name || skill.name}</h1>
                  <span className="rounded-full border border-white/[0.1] bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/48">
                    {skillId}
                  </span>
                </div>
                <p className="mt-2 max-w-[700px] text-[13px] leading-6 text-white/48">{manifest.description || skill.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/48">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/15 px-2.5 py-1">
                    <Icons.Pulse size={12} />
                    沙盒状态
                    <span style={{ color: workspaceStatus === "ready" ? "#22C55E" : workspaceStatus === "failed" ? "#F87171" : accent }}>
                      {workspaceStatus}
                    </span>
                  </span>
                  <span className="truncate rounded-full border border-white/[0.08] bg-black/15 px-2.5 py-1">
                    工作目录: {displayRoot}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReconnect}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-[12px] text-white/72 transition-colors hover:bg-white/[0.06]"
              >
                <Icons.Refresh size={12} />
                重连沙盒
              </button>
              <button
                type="button"
                onClick={() => void cancelActiveRun()}
                disabled={!activeRunId}
                className="rounded-xl border border-red-400/30 bg-red-500/8 px-3 py-2 text-[12px] text-red-200 disabled:opacity-35"
              >
                停止当前运行
              </button>
            </div>
          </div>
        </div>

        {(workspaceError || runError) && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/7 px-4 py-3 text-[13px] text-red-200/85">
            {workspaceError || runError}
          </div>
        )}

        <div
          className="overflow-hidden rounded-[28px] border"
          style={{
            borderColor: "var(--card-border)",
            background: "linear-gradient(180deg, rgba(11,15,22,0.94), rgba(9,11,17,0.98))",
            boxShadow: "var(--card-inset), var(--shadow-mid)",
          }}
        >
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] uppercase tracking-[0.2em] text-white/34">Run Chat</p>
                <p className="mt-1 text-[13px] text-white/58">同一沙盒内持续多轮运行该技能，每轮独立 run_id，历史与轨迹保留。</p>
              </div>
              <div className="text-right text-[11px] text-white/42">
                <p>{initializing ? "正在初始化沙盒..." : workspaceStatus === "ready" ? "沙盒已就绪" : "等待沙盒恢复"}</p>
                <p className="mt-1">{runSessionId ? `run_session=${runSessionId}` : "正在准备运行会话..."}</p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[calc(100vh-360px)] min-h-[420px] space-y-5 overflow-y-auto px-5 py-6">
            {turns.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/50">
                  <Icons.Sparkle size={18} />
                </div>
                <p className="mt-4 text-[16px] text-white/84">开始在沙盒里多轮运行这个技能</p>
                <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-6 text-white/44">
                  这里不会再显示配置表单、文件树或终端标签。输入自然语言后，系统会在当前 workspace 内直接执行技能，并流式返回结果。
                </p>
              </div>
            )}

            {turns.map((turn) => {
              const expanded = expandedTurns[turn.runId || turn.id] || false;
              const traceSummary = buildTraceSummary(turn.traceEvents);
              return (
                <div key={turn.id} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[72%] rounded-[22px] rounded-br-md border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-[14px] leading-6 text-white/88">
                      {turn.query}
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="w-full max-w-[82%] rounded-[24px] rounded-bl-md border border-white/[0.08] bg-black/35 px-4 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-[12px] text-white/62">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/55">
                            <Icons.Agent size={14} />
                          </span>
                          Assistant
                          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px]" style={{ color: getRunStatusColor(turn.status) }}>
                            {formatRunStatus(turn.status)}
                          </span>
                          {turn.runId && <span className="text-[10px] text-white/35">run_id={turn.runId.slice(0, 10)}</span>}
                        </div>
                        {turn.progress && turn.status !== "completed" && (
                          <p className="text-[11px] text-white/38">
                            {turn.progress.stage} · {Math.round(turn.progress.progress)}%
                          </p>
                        )}
                      </div>

                      <div className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-white/78">
                        {turn.assistantText || (turn.status === "pending" ? "正在创建本轮执行..." : "正在持续输出执行结果...")}
                      </div>

                      {turn.error && (
                        <div className="mt-3 rounded-2xl border border-red-500/15 bg-red-500/8 px-3 py-2 text-[12px] text-red-200/88">
                          {turn.error}
                        </div>
                      )}

                      {turn.connectionWarning && (
                        <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/88">
                          该轮超过 10 秒未收到事件，连接可能异常。可点击上方“重连沙盒”后继续。
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedTurns((current) => ({ ...current, [turn.runId || turn.id]: !expanded }))}
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-white/58 transition-colors hover:bg-white/[0.06]"
                        >
                          {expanded ? "收起轨迹" : "轨迹摘要"} · {traceSummary}
                        </button>
                        {turn.result?.summary && turn.assistantText.trim() !== turn.result.summary.trim() && (
                          <span className="text-[11px] text-white/36">{turn.result.summary}</span>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-2 rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-3">
                          {turn.traceEvents.length === 0 && <p className="text-[11px] text-white/34">暂无可展示轨迹</p>}
                          {turn.traceEvents.map((event) => (
                            <div key={event.event_id} className="rounded-2xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[12px] text-white/74">{event.title}</p>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-white/28">{event.kind}</span>
                              </div>
                              <p className="mt-1 text-[11px] leading-5 text-white/45 break-all">{event.detail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/[0.06] px-5 py-4">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-3">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!inputDisabled && composer.trim()) {
                      void handleSubmit();
                    }
                  }
                }}
                disabled={inputDisabled}
                rows={4}
                placeholder={workspaceStatus === "ready" ? "输入下一轮需求，例如：把输出整理成三条行动建议" : "等待沙盒就绪后可开始多轮运行"}
                className="w-full resize-none border-none bg-transparent px-2 py-1 text-[14px] leading-6 text-white/86 outline-none placeholder:text-white/28 disabled:cursor-not-allowed"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-2 pt-3">
                <div className="text-[11px] text-white/38">
                  {activeTurn ? `${formatRunStatus(activeTurn.status)} · ${activeTurn.progress?.message || "正在执行"}` : "发送后会在当前沙盒中直接运行技能"}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={inputDisabled || !runSessionId || !composer.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[13px] font-medium text-black transition-opacity disabled:opacity-35"
                  style={{ background: accent }}
                >
                  <Icons.Send size={14} />
                  {submitting || activeRunId ? "运行中..." : "发送并运行"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
