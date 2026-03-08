"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, getWsUrl } from "@/services/api";
import { skillService } from "@/services/skillService";
import { workspaceService } from "@/services/workspaceService";
import { SkillBuilderWorkbench } from "@/components/skills/create/SkillBuilderWorkbench";
import { BuilderChatPane } from "@/components/skills/create/BuilderChatPane";
import { SandboxPane } from "@/components/skills/create/SandboxPane";
import { useSkillCreatorStore } from "@/stores/skillCreatorStore";
import type { SkillCreatorResult, SkillResultData, SkillTraceEvent } from "@/types/skill";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeResult(data: unknown): SkillCreatorResult | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  if (!payload.created_skill_id || !payload.created_skill_name) return null;
  return {
    task_id: String(payload.task_id || payload.run_id || ""),
    run_id: String(payload.run_id || payload.task_id || ""),
    summary: String(payload.summary || "技能创建完成"),
    metadata: (payload.metadata as Record<string, unknown>) || {},
    created_skill_id: String(payload.created_skill_id || ""),
    created_skill_name: String(payload.created_skill_name || ""),
    artifact_root: String(payload.artifact_root || ""),
    artifact_tree: String(payload.artifact_tree || ""),
    delivery_notes: String(payload.delivery_notes || ""),
    artifact_files: Array.isArray(payload.artifact_files) ? (payload.artifact_files as SkillCreatorResult["artifact_files"]) : [],
    preview_rows: Array.isArray(payload.preview_rows) ? (payload.preview_rows as Record<string, unknown>[]) : [],
    total_count: Number(payload.total_count || 0),
    columns: Array.isArray(payload.columns) ? (payload.columns as SkillCreatorResult["columns"]) : [],
  };
}

function parseClarificationPayload(data: unknown): { summary?: string; pendingQuestions: string[] } | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const metadata = payload.metadata && typeof payload.metadata === "object"
    ? (payload.metadata as Record<string, unknown>)
    : {};
  const creatorState = payload.creator_state ?? metadata.creator_state;
  if (creatorState !== "clarification_pending") return null;
  const pendingQuestions = Array.isArray(payload.pending_questions)
    ? payload.pending_questions.map((item) => String(item))
    : [];
  return {
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    pendingQuestions,
  };
}

function parseCreatedSkillFromTraces(traceEvents: SkillTraceEvent[]): { skillId?: string; skillName?: string } {
  for (let i = traceEvents.length - 1; i >= 0; i -= 1) {
    const detail = traceEvents[i]?.detail || "";
    const idMatch = detail.match(/skill_id[:：]\s*([a-z0-9-]+)/i) || detail.match(/\/workspace\/projects\/([a-z0-9-]+)/i);
    const nameMatch = detail.match(/技能名[:：]\s*([^，,\n]+)/);
    if (idMatch || nameMatch) {
      return {
        skillId: idMatch?.[1],
        skillName: nameMatch?.[1]?.trim(),
      };
    }
  }
  return {};
}

function toFriendlyError(message: string): string {
  const text = message.trim();
  if (!text) return "创建流程异常，请重试。";
  if (text.includes("Run not found")) return "运行记录不存在，正在尝试从沙盒归档恢复。";
  if (text.includes("still")) return "任务仍在执行，请稍后查看。";
  return text;
}

export default function CreateSkillPage() {
  const workspaceWsRef = useRef<WebSocket | null>(null);
  const buildWsRef = useRef<WebSocket | null>(null);
  const playWsRef = useRef<WebSocket | null>(null);
  const autoStartedRef = useRef(false);

  const phase = useSkillCreatorStore((s) => s.phase);
  const prompt = useSkillCreatorStore((s) => s.prompt);
  const creatorMode = useSkillCreatorStore((s) => s.creatorMode);
  const conversationTurns = useSkillCreatorStore((s) => s.conversationTurns);
  const awaitingUserReply = useSkillCreatorStore((s) => s.awaitingUserReply);
  const workspace = useSkillCreatorStore((s) => s.workspace);
  const workspaceStatus = useSkillCreatorStore((s) => s.workspaceStatus);
  const sandboxLogs = useSkillCreatorStore((s) => s.sandboxLogs);
  const workspaceTree = useSkillCreatorStore((s) => s.workspaceTree);
  const terminalLines = useSkillCreatorStore((s) => s.terminalLines);
  const openFile = useSkillCreatorStore((s) => s.openFile);

  const runId = useSkillCreatorStore((s) => s.runId);
  const status = useSkillCreatorStore((s) => s.status);
  const traceEvents = useSkillCreatorStore((s) => s.traceEvents);
  const result = useSkillCreatorStore((s) => s.result);
  const error = useSkillCreatorStore((s) => s.error);
  const submitting = useSkillCreatorStore((s) => s.submitting);

  const playground = useSkillCreatorStore((s) => s.playground);

  const setPrompt = useSkillCreatorStore((s) => s.setPrompt);
  const initializeWorkspace = useSkillCreatorStore((s) => s.initializeWorkspace);
  const setWorkspaceStatus = useSkillCreatorStore((s) => s.setWorkspaceStatus);
  const appendSandboxLog = useSkillCreatorStore((s) => s.appendSandboxLog);
  const setWorkspaceTree = useSkillCreatorStore((s) => s.setWorkspaceTree);
  const refreshTree = useSkillCreatorStore((s) => s.refreshTree);
  const appendTerminalLine = useSkillCreatorStore((s) => s.appendTerminalLine);
  const openWorkspaceFile = useSkillCreatorStore((s) => s.openWorkspaceFile);
  const markOpenFileChanged = useSkillCreatorStore((s) => s.markOpenFileChanged);
  const updateOpenFileContent = useSkillCreatorStore((s) => s.updateOpenFileContent);
  const saveOpenFile = useSkillCreatorStore((s) => s.saveOpenFile);

  const startCreation = useSkillCreatorStore((s) => s.startCreation);
  const continueCreation = useSkillCreatorStore((s) => s.continueCreation);
  const updateProgress = useSkillCreatorStore((s) => s.updateProgress);
  const appendTrace = useSkillCreatorStore((s) => s.appendTrace);
  const completeWithResult = useSkillCreatorStore((s) => s.completeWithResult);
  const enterClarification = useSkillCreatorStore((s) => s.enterClarification);
  const failWithMessage = useSkillCreatorStore((s) => s.failWithMessage);

  const setPlaygroundQuery = useSkillCreatorStore((s) => s.setPlaygroundQuery);
  const startPlaygroundRun = useSkillCreatorStore((s) => s.startPlaygroundRun);
  const updatePlaygroundProgress = useSkillCreatorStore((s) => s.updatePlaygroundProgress);
  const appendPlaygroundTrace = useSkillCreatorStore((s) => s.appendPlaygroundTrace);
  const completePlayground = useSkillCreatorStore((s) => s.completePlayground);
  const failPlayground = useSkillCreatorStore((s) => s.failPlayground);
  const touchPlaygroundRun = useSkillCreatorStore((s) => s.touchPlaygroundRun);

  const reset = useSkillCreatorStore((s) => s.reset);

  const [composerInput, setComposerInput] = useState("");
  const [activeSandboxTab, setActiveSandboxTab] = useState<"files" | "terminal" | "playground">("files");

  useEffect(() => {
    reset();
    autoStartedRef.current = false;
    const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const initialPrompt = (qs?.get("query") || qs?.get("prompt") || "").trim();
    setPrompt(initialPrompt);
    setComposerInput(initialPrompt);
    void initializeWorkspace(initialPrompt);
  }, [initializeWorkspace, reset, setPrompt]);

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
        const frame = JSON.parse(event.data);
        const type = String(frame.type || "");
        const data = frame.data || {};

        if (type === "sandbox.init.delta") {
          appendSandboxLog(String(data.line || ""), String(data.ts || ""));
          return;
        }
        if (type === "sandbox.state") {
          setWorkspaceStatus((data.status || "initializing") as "initializing" | "ready" | "failed");
          return;
        }
        if (type === "fs.snapshot") {
          if (Array.isArray(data.nodes)) {
            setWorkspaceTree(data.nodes);
          }
          return;
        }
        if (type === "fs.changed") {
          if (typeof data.path === "string") {
            markOpenFileChanged(data.path);
          }
          void refreshTree();
          return;
        }
        if (type === "terminal.line") {
          appendTerminalLine({
            stream: data.stream === "stderr" ? "stderr" : "stdout",
            line: String(data.line || ""),
            tool_id: data.tool_id ? String(data.tool_id) : undefined,
            run_id: data.run_id ? String(data.run_id) : undefined,
            ts: data.ts ? String(data.ts) : undefined,
          });
          return;
        }
        if (type === "workspace.error") {
          failWithMessage(String(data.message || "沙盒工作区异常"));
        }
      } catch {
        // ignore invalid ws payload
      }
    };

    return () => {
      if (workspaceWsRef.current) {
        workspaceWsRef.current.close();
        workspaceWsRef.current = null;
      }
    };
  }, [workspace?.workspace_id, appendSandboxLog, appendTerminalLine, failWithMessage, markOpenFileChanged, refreshTree, setWorkspaceStatus, setWorkspaceTree]);

  useEffect(() => {
    if (workspaceStatus !== "ready") return;
    if (autoStartedRef.current) return;
    if (!prompt.trim()) return;

    autoStartedRef.current = true;
    void startCreation(prompt.trim());
  }, [workspaceStatus, prompt, startCreation]);

  const resolveCreatorResult = useCallback(async (currentRunId: string): Promise<SkillCreatorResult | { clarification: { summary?: string; pendingQuestions: string[] } } | null> => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const payload = await skillService.getRunResult(currentRunId);
        const clarification = parseClarificationPayload(payload);
        if (clarification) return { clarification };
        const normalized = normalizeResult(payload);
        if (normalized) return normalized;
        await sleep(220 * (attempt + 1));
        continue;
      } catch (err) {
        lastError = err;
        if (err instanceof ApiError && (err.status === 202 || err.status === 404)) {
          await sleep(220 * (attempt + 1));
          continue;
        }
        break;
      }
    }

    if (workspace?.workspace_id) {
      try {
        const fallback = await workspaceService.getCreatorResult(workspace.workspace_id, currentRunId);
        if (fallback.found && fallback.result) {
          const clarification = parseClarificationPayload(fallback.result);
          if (clarification) return { clarification };
          const normalized = normalizeResult(fallback.result);
          if (normalized) return normalized;
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (lastError instanceof ApiError && lastError.status === 404) {
      const parsed = parseCreatedSkillFromTraces(useSkillCreatorStore.getState().traceEvents);
      if (parsed.skillId) {
        try {
          await skillService.getManifest(parsed.skillId);
          return {
            task_id: currentRunId,
            run_id: currentRunId,
            summary: `技能 ${parsed.skillName || parsed.skillId} 已创建完成，执行记录已归档。`,
            metadata: {},
            created_skill_id: parsed.skillId,
            created_skill_name: parsed.skillName || parsed.skillId,
            artifact_root: workspace?.display_root || "/workspace/projects/",
            artifact_tree: "运行记录已归档，可进入技能执行页查看与使用。",
            delivery_notes: "技能已可用。你可以直接进入技能执行页，或在对话中使用 @skill-id 触发。",
            artifact_files: [],
            preview_rows: [],
            total_count: 0,
          };
        } catch {
          return null;
        }
      }
    }

    if (lastError instanceof Error) {
      failWithMessage(toFriendlyError(lastError.message));
    }
    return null;
  }, [failWithMessage, workspace?.display_root, workspace?.workspace_id]);

  useEffect(() => {
    if (!runId || phase !== "building_skill") return;

    let cancelled = false;
    let finishing = false;
    let finished = false;

    if (buildWsRef.current) {
      buildWsRef.current.close();
      buildWsRef.current = null;
    }

    const ws = new WebSocket(getWsUrl(`/ws/skills/runs/${runId}`));
    buildWsRef.current = ws;

    const finish = async () => {
      if (cancelled || finished || finishing) return;
      finishing = true;
      const resolved = await resolveCreatorResult(runId);
      finishing = false;
      if (cancelled || finished) return;
      if (resolved) {
        if ("clarification" in resolved) {
          finished = true;
          enterClarification(resolved.clarification);
          return;
        }
        if (!resolved.created_skill_id || !resolved.created_skill_name) {
          await sleep(250);
          void finish();
          return;
        }
        finished = true;
        completeWithResult(resolved);
        setActiveSandboxTab("playground");
      } else {
        finished = true;
        failWithMessage("创建记录已结束，但未能恢复交付结果，请重新创建。");
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "skill_heartbeat") {
          return;
        }

        if (msg.type === "skill_progress") {
          const data = msg.data || {};
          updateProgress({
            stage: String(data.stage || ""),
            progress: Number(data.progress || 0),
            message: String(data.message || ""),
            stageIndex: data.stageIndex,
            totalStages: data.totalStages,
          });
          return;
        }

        if (msg.type === "skill_trace") {
          const data = msg.data || {};
          if (typeof data.event_id === "string") {
            const eventPayload: SkillTraceEvent = {
              event_id: String(data.event_id),
              ts: String(data.ts || ""),
              stage: String(data.stage || ""),
              stage_index: Number(data.stage_index || 0),
              kind: data.kind || "info",
              title: String(data.title || ""),
              detail: String(data.detail || ""),
              metrics: typeof data.metrics === "object" && data.metrics ? data.metrics : {},
              status: data.status || "running",
            };
            appendTrace(eventPayload);
          }
          return;
        }

        if (msg.type === "skill_complete") {
          void finish();
          return;
        }

        if (msg.type === "skill_error") {
          failWithMessage(String(msg.data?.message || "创建任务执行失败"));
        }
      } catch {
        // ignore invalid frame
      }
    };

    ws.onerror = () => {
      void finish();
    };

    ws.onclose = () => {
      if (!cancelled && phase === "building_skill") {
        void finish();
      }
    };

    return () => {
      cancelled = true;
      if (buildWsRef.current) {
        buildWsRef.current.close();
        buildWsRef.current = null;
      }
    };
  }, [appendTrace, completeWithResult, enterClarification, failWithMessage, phase, resolveCreatorResult, runId, updateProgress]);

  useEffect(() => {
    const activeRunId = playground.activeRunId;
    if (!activeRunId) return;

    let cancelled = false;
    let lastEventAt = Date.now();
    let watchdog: ReturnType<typeof setInterval> | null = null;

    if (playWsRef.current) {
      playWsRef.current.close();
      playWsRef.current = null;
    }

    const ws = new WebSocket(getWsUrl(`/ws/skills/runs/${activeRunId}`));
    playWsRef.current = ws;

    const finish = async () => {
      if (cancelled || !activeRunId) return;
      try {
        const payload = await skillService.getRunResult(activeRunId);
        completePlayground(activeRunId, payload as SkillResultData);
        setActiveSandboxTab("playground");
      } catch (err) {
        failPlayground(activeRunId, err instanceof Error ? toFriendlyError(err.message) : "运行结果获取失败");
      }
    };

    watchdog = setInterval(() => {
      if (Date.now() - lastEventAt > 10_000) {
        failPlayground(activeRunId, "连接异常：超过 10 秒未收到运行事件，请重试。");
        if (playWsRef.current) {
          playWsRef.current.close();
          playWsRef.current = null;
        }
      }
    }, 1500);

    ws.onmessage = (event) => {
      lastEventAt = Date.now();
      touchPlaygroundRun(activeRunId);
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "skill_heartbeat") {
          return;
        }
        if (msg.type === "skill_progress") {
          const data = msg.data || {};
          updatePlaygroundProgress(activeRunId, {
            stage: String(data.stage || ""),
            progress: Number(data.progress || 0),
            message: String(data.message || ""),
            stageIndex: data.stageIndex,
            totalStages: data.totalStages,
          });
          return;
        }

        if (msg.type === "skill_trace") {
          const data = msg.data || {};
          if (typeof data.event_id === "string") {
            appendPlaygroundTrace(activeRunId, {
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
          }
          return;
        }

        if (msg.type === "skill_complete") {
          void finish();
          return;
        }

        if (msg.type === "skill_error") {
          failPlayground(activeRunId, String(msg.data?.message || "技能运行失败"));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (!cancelled) {
        void finish();
      }
    };

    return () => {
      cancelled = true;
      if (watchdog) {
        clearInterval(watchdog);
      }
      if (playWsRef.current) {
        playWsRef.current.close();
        playWsRef.current = null;
      }
    };
  }, [appendPlaygroundTrace, completePlayground, failPlayground, playground.activeRunId, touchPlaygroundRun, updatePlaygroundProgress]);

  const pageStateHint = useMemo(() => {
    if (phase === "loading" || phase === "sandbox_initializing") return "正在准备沙盒工作区";
    if (phase === "building_skill") return "正在创建技能";
    if (phase === "build_done") return "创建完成，准备运行";
    if (phase === "run_skill_ready") return "技能已可运行";
    if (phase === "failed") return "流程异常";
    return "创建技能";
  }, [phase]);

  const handleStopBuild = async () => {
    if (!runId) return;
    try {
      await skillService.cancelRun(runId);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    const nextPrompt = composerInput.trim();
    if (!nextPrompt) return;
    setPrompt(nextPrompt);
    setComposerInput("");
    autoStartedRef.current = true;
    if (creatorMode === "clarification_pending" || awaitingUserReply) {
      await continueCreation(nextPrompt);
      setActiveSandboxTab("terminal");
      return;
    }
    await startCreation(nextPrompt);
    setActiveSandboxTab("terminal");
  };

  const handleOpenFile = async (path: string) => {
    setActiveSandboxTab("files");
    await openWorkspaceFile(path);
  };

  return (
    <div className="h-full overflow-y-auto px-6 pb-8 pt-5 animate-fadeIn">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/workspace/skills" className="inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white/65">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2L4 6l4 4" />
            </svg>
            返回技能广场
          </Link>

          <span className="text-[12px] text-white/52">{pageStateHint}</span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-300/90">
            {error}
          </div>
        )}

        <SkillBuilderWorkbench
          left={(
            <BuilderChatPane
              prompt={prompt}
              conversationTurns={conversationTurns}
              awaitingUserReply={awaitingUserReply}
              traceEvents={traceEvents}
              inputValue={composerInput}
              running={status === "running"}
              submitting={submitting}
              onInputChange={setComposerInput}
              onSend={() => {
                void handleSend();
              }}
              onStop={() => {
                void handleStopBuild();
              }}
              onOpenFile={(path) => {
                void handleOpenFile(path);
              }}
            />
          )}
          right={(
            <SandboxPane
              workspaceStatus={workspaceStatus}
              displayRoot={workspace?.display_root || ""}
              logs={sandboxLogs}
              tree={workspaceTree}
              terminalLines={terminalLines}
              activeTab={activeSandboxTab}
              onTabChange={setActiveSandboxTab}
              openFilePath={openFile?.path || ""}
              openFileContent={openFile?.content || ""}
              openFileContentType={openFile?.contentType || "text/plain"}
              openFileSizeBytes={openFile?.sizeBytes || 0}
              openFileTruncated={Boolean(openFile?.truncated)}
              openFileBinary={Boolean(openFile?.isBinary)}
              openFileReadonly={Boolean(openFile?.readonly)}
              openFileDirty={Boolean(openFile?.dirty)}
              openFileStale={Boolean(openFile?.stale)}
              openFileLoading={Boolean(openFile?.loading)}
              openFileSaving={Boolean(openFile?.saving)}
              openFileError={openFile?.error || null}
              onOpenFile={(path) => {
                void handleOpenFile(path);
              }}
              onOpenFileContentChange={updateOpenFileContent}
              onSaveFile={() => {
                void saveOpenFile();
              }}
              onReloadFile={() => {
                if (openFile?.path) {
                  void openWorkspaceFile(openFile.path);
                }
              }}
              playgroundEnabled={Boolean(result?.created_skill_id)}
              playgroundQuery={playground.query}
              playgroundActiveRunId={playground.activeRunId}
              playgroundRuns={playground.runs}
              playgroundSubmitting={playground.submitting}
              playgroundStatus={playground.status}
              playgroundProgress={playground.progress}
              playgroundTraceEvents={playground.traceEvents}
              playgroundResult={playground.result}
              playgroundError={playground.error}
              onPlaygroundQueryChange={setPlaygroundQuery}
              onPlaygroundRun={() => {
                void startPlaygroundRun();
                setActiveSandboxTab("playground");
              }}
              onPlaygroundCancel={() => {
                if (playground.activeRunId) {
                  void skillService.cancelRun(playground.activeRunId);
                }
              }}
            />
          )}
        />
      </div>
    </div>
  );
}
