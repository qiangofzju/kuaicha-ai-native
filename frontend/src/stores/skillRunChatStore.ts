import { create } from "zustand";
import { skillService } from "@/services/skillService";
import { workspaceService } from "@/services/workspaceService";
import type { SkillProgress, SkillResultData, SkillTaskStatus, SkillTraceEvent } from "@/types/skill";
import type { WorkspaceSession, WorkspaceStatus } from "@/types/workspace";

export interface SkillRunChatTurn {
  id: string;
  runId: string | null;
  query: string;
  assistantText: string;
  status: SkillTaskStatus;
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  result: SkillResultData | null;
  error: string | null;
  startedAt: number;
  finishedAt?: number;
  lastEventAt: number;
  connectionWarning: boolean;
  runStartReceived: boolean;
}

interface SkillRunChatState {
  skillId: string;
  composer: string;
  workspace: WorkspaceSession | null;
  workspaceStatus: WorkspaceStatus;
  runSessionId: string | null;
  turns: SkillRunChatTurn[];
  activeRunId: string | null;
  activeTurnId: string | null;
  initializing: boolean;
  submitting: boolean;
  workspaceError: string | null;
  runError: string | null;

  reset: () => void;
  setComposer: (value: string) => void;
  initializeWorkspace: (skillId: string, reuseExisting?: boolean) => Promise<void>;
  ensureRunSession: () => Promise<void>;
  reconnectWorkspace: (skillId: string) => Promise<void>;
  setWorkspaceStatus: (status: WorkspaceStatus) => void;
  setWorkspaceError: (message: string | null) => void;
  startRun: (skillId: string, query?: string) => Promise<string | null>;
  markRunStart: (runId: string, status?: SkillTaskStatus) => void;
  updateRunProgress: (runId: string, progress: SkillProgress) => void;
  appendRunStream: (runId: string, content: string) => void;
  appendRunTrace: (runId: string, event: SkillTraceEvent) => void;
  touchRun: (runId: string) => void;
  setConnectionWarning: (runId: string, warning: boolean) => void;
  completeRun: (runId: string, result: SkillResultData) => void;
  failRun: (runId: string, message: string, status?: SkillTaskStatus) => void;
  cancelActiveRun: () => Promise<void>;
}

const initialState = {
  skillId: "",
  composer: "",
  workspace: null,
  workspaceStatus: "initializing" as WorkspaceStatus,
  runSessionId: null,
  turns: [] as SkillRunChatTurn[],
  activeRunId: null,
  activeTurnId: null,
  initializing: false,
  submitting: false,
  workspaceError: null,
  runError: null,
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function createLocalRunSessionId(): string {
  return `rs-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateTurnById(
  turns: SkillRunChatTurn[],
  turnId: string,
  updater: (turn: SkillRunChatTurn) => SkillRunChatTurn,
): SkillRunChatTurn[] {
  return turns.map((turn) => (turn.id === turnId ? updater(turn) : turn));
}

function updateTurnByRunId(
  turns: SkillRunChatTurn[],
  runId: string,
  updater: (turn: SkillRunChatTurn) => SkillRunChatTurn,
): SkillRunChatTurn[] {
  return turns.map((turn) => (turn.runId === runId ? updater(turn) : turn));
}

export const useSkillRunChatStore = create<SkillRunChatState>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState }),

  setComposer: (value) => set({ composer: value }),

  initializeWorkspace: async (skillId, reuseExisting = true) => {
    set({
      skillId,
      workspace: null,
      workspaceStatus: "initializing",
      runSessionId: null,
      activeRunId: null,
      activeTurnId: null,
      initializing: true,
      workspaceError: null,
      runError: null,
    });

    try {
      const workspace = await workspaceService.createSession({
        purpose: "skill_run",
        skill_id: skillId,
        reuse_existing: reuseExisting,
      });
      set({
        workspace,
        workspaceStatus: workspace.status,
        initializing: false,
      });
    } catch (err) {
      set({
        initializing: false,
        workspaceStatus: "failed",
        workspaceError: mapError(err, "沙盒初始化失败"),
      });
    }
  },

  ensureRunSession: async () => {
    const workspaceId = get().workspace?.workspace_id;
    const workspaceStatus = get().workspaceStatus;
    if (!workspaceId || workspaceStatus !== "ready" || get().runSessionId) return;

    try {
      const payload = await workspaceService.createRunSession(workspaceId);
      set({ runSessionId: payload.run_session_id, workspaceError: null });
    } catch {
      set({
        runSessionId: createLocalRunSessionId(),
        workspaceError: null,
      });
    }
  },

  reconnectWorkspace: async (skillId) => {
    await get().initializeWorkspace(skillId, false);
  },

  setWorkspaceStatus: (status) => {
    set((state) => ({
      workspaceStatus: status,
      initializing: status === "initializing",
      workspaceError: status === "failed" ? state.workspaceError || "沙盒连接失败" : state.workspaceError,
    }));
  },

  setWorkspaceError: (message) => set({ workspaceError: message }),

  startRun: async (skillId, query) => {
    const text = (query ?? get().composer).trim();
    const workspace = get().workspace;
    const runSessionId = get().runSessionId;
    const activeRunId = get().activeRunId;
    if (!text || !workspace || !runSessionId) return null;
    if (activeRunId) {
      set({ runError: "当前已有运行中的任务，请先停止。" });
      return null;
    }

    const turnId = `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const pendingTurn: SkillRunChatTurn = {
      id: turnId,
      runId: null,
      query: text,
      assistantText: "",
      status: "pending",
      progress: { stage: "初始化", progress: 0, message: "准备启动技能运行" },
      traceEvents: [],
      result: null,
      error: null,
      startedAt: now,
      lastEventAt: now,
      connectionWarning: false,
      runStartReceived: false,
    };

    set((state) => ({
      turns: [...state.turns, pendingTurn],
      activeTurnId: turnId,
      activeRunId: null,
      submitting: true,
      composer: "",
      runError: null,
    }));

    try {
      const response = await skillService.createRun({
        skill_id: skillId,
        input: { query: text },
        context: {
          source: "skill_run_chat",
          workspace_id: workspace.workspace_id,
          session_id: workspace.session_id,
          display_root: workspace.display_root,
          run_session_id: runSessionId,
          timeout_sec: 240,
        },
      });

      set((state) => ({
        turns: updateTurnById(state.turns, turnId, (turn) => ({
          ...turn,
          runId: response.run_id,
          status: response.status === "pending" ? "pending" : "running",
          progress: { stage: "初始化", progress: 1, message: "运行已创建，正在连接执行流" },
          lastEventAt: Date.now(),
        })),
        activeRunId: response.run_id,
        activeTurnId: turnId,
        submitting: false,
      }));
      return response.run_id;
    } catch (err) {
      set((state) => ({
        turns: updateTurnById(state.turns, turnId, (turn) => ({
          ...turn,
          status: "failed",
          error: mapError(err, "运行启动失败"),
          finishedAt: Date.now(),
        })),
        activeTurnId: null,
        submitting: false,
        runError: mapError(err, "运行启动失败"),
      }));
      return null;
    }
  },

  markRunStart: (runId, status = "running") => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        status,
        runStartReceived: true,
        lastEventAt: Date.now(),
        connectionWarning: false,
      })),
      activeRunId: runId,
      runError: null,
    }));
  },

  updateRunProgress: (runId, progress) => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        status: "running",
        progress,
        runStartReceived: true,
        lastEventAt: Date.now(),
        connectionWarning: false,
      })),
      runError: null,
    }));
  },

  appendRunStream: (runId, content) => {
    if (!content) return;
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        status: "running",
        assistantText: `${turn.assistantText}${content}`,
        runStartReceived: true,
        lastEventAt: Date.now(),
        connectionWarning: false,
      })),
      runError: null,
    }));
  },

  appendRunTrace: (runId, event) => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => {
        if (turn.traceEvents.some((item) => item.event_id === event.event_id)) {
          return turn;
        }
        return {
          ...turn,
          traceEvents: [...turn.traceEvents, event].slice(-600),
          lastEventAt: Date.now(),
          connectionWarning: false,
        };
      }),
      runError: null,
    }));
  },

  touchRun: (runId) => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        lastEventAt: Date.now(),
        connectionWarning: false,
      })),
      runError: null,
    }));
  },

  setConnectionWarning: (runId, warning) => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        connectionWarning: warning,
      })),
      runError: warning ? "连接异常，已暂停接收事件，可尝试重连沙盒。" : null,
    }));
  },

  completeRun: (runId, result) => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        status: "completed",
        result,
        assistantText: turn.assistantText || `${result.summary}\n`,
        error: null,
        progress: { stage: "完成", progress: 100, message: result.summary || "运行完成" },
        finishedAt: Date.now(),
        lastEventAt: Date.now(),
        connectionWarning: false,
      })),
      activeRunId: state.activeRunId === runId ? null : state.activeRunId,
      activeTurnId: state.activeRunId === runId ? null : state.activeTurnId,
      runError: null,
    }));
  },

  failRun: (runId, message, status = "failed") => {
    set((state) => ({
      turns: updateTurnByRunId(state.turns, runId, (turn) => ({
        ...turn,
        status,
        error: message,
        finishedAt: Date.now(),
      })),
      activeRunId: state.activeRunId === runId ? null : state.activeRunId,
      activeTurnId: state.activeRunId === runId ? null : state.activeTurnId,
      runError: message,
    }));
  },

  cancelActiveRun: async () => {
    const activeRunId = get().activeRunId;
    if (!activeRunId) return;
    try {
      await skillService.cancelRun(activeRunId);
    } catch {
      // Ignore cancellation API errors and rely on websocket/status refresh.
    }
    set((state) => ({
      turns: updateTurnByRunId(state.turns, activeRunId, (turn) => ({
        ...turn,
        status: "cancelled",
        error: turn.error,
        finishedAt: Date.now(),
      })),
      activeRunId: null,
      activeTurnId: null,
    }));
  },
}));
