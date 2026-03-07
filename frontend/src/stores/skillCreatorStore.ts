import { create } from "zustand";
import { skillService } from "@/services/skillService";
import { workspaceService } from "@/services/workspaceService";
import type { SkillCreatorResult, SkillProgress, SkillResultData, SkillTaskStatus, SkillTraceEvent } from "@/types/skill";
import type {
  WorkspaceSession,
  WorkspaceStatus,
  WorkspaceTerminalLineEvent,
  WorkspaceTreeNode,
} from "@/types/workspace";

export type SkillCreatorPhase =
  | "loading"
  | "sandbox_initializing"
  | "building_skill"
  | "build_done"
  | "run_skill_ready"
  | "failed";

interface OpenFileState {
  path: string;
  content: string;
  contentType: string;
  sizeBytes: number;
  etag: string;
  truncated: boolean;
  isBinary: boolean;
  readonly: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  stale: boolean;
}

interface PlaygroundRunState {
  runId: string;
  query: string;
  status: SkillTaskStatus;
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  result: SkillResultData | null;
  error: string | null;
  startedAt: number;
  finishedAt?: number;
  lastEventAt: number;
}

interface PlaygroundState {
  query: string;
  runSessionId: string | null;
  activeRunId: string | null;
  runs: PlaygroundRunState[];
  status: SkillTaskStatus;
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  result: SkillResultData | null;
  error: string | null;
  submitting: boolean;
}

interface SkillCreatorState {
  phase: SkillCreatorPhase;
  prompt: string;

  workspace: WorkspaceSession | null;
  workspaceStatus: WorkspaceStatus;
  sandboxLogs: Array<{ line: string; ts?: string }>;
  workspaceTree: WorkspaceTreeNode[];
  terminalLines: WorkspaceTerminalLineEvent[];
  openFile: OpenFileState | null;

  runId: string | null;
  status: SkillTaskStatus;
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  result: SkillCreatorResult | null;
  error: string | null;
  submitting: boolean;

  playground: PlaygroundState;

  setPrompt: (value: string) => void;
  initializeWorkspace: (seedPrompt?: string) => Promise<void>;
  setWorkspaceStatus: (status: WorkspaceStatus) => void;
  appendSandboxLog: (line: string, ts?: string) => void;
  setWorkspaceTree: (nodes: WorkspaceTreeNode[]) => void;
  refreshTree: () => Promise<void>;
  appendTerminalLine: (line: WorkspaceTerminalLineEvent) => void;

  openWorkspaceFile: (path: string) => Promise<void>;
  markOpenFileChanged: (path: string) => void;
  updateOpenFileContent: (content: string) => void;
  saveOpenFile: () => Promise<void>;

  startCreation: (prompt: string) => Promise<string | null>;
  updateProgress: (progress: SkillProgress) => void;
  appendTrace: (event: SkillTraceEvent) => void;
  completeWithResult: (result: SkillCreatorResult) => void;
  failWithMessage: (message: string) => void;

  setPlaygroundQuery: (value: string) => void;
  startPlaygroundRun: () => Promise<string | null>;
  updatePlaygroundProgress: (runId: string, progress: SkillProgress) => void;
  appendPlaygroundTrace: (runId: string, event: SkillTraceEvent) => void;
  completePlayground: (runId: string, result: SkillResultData) => void;
  failPlayground: (runId: string, message: string) => void;
  touchPlaygroundRun: (runId: string) => void;

  reset: () => void;
}

const initialOpenFile: OpenFileState | null = null;

const initialPlayground: PlaygroundState = {
  query: "",
  runSessionId: null,
  activeRunId: null,
  runs: [],
  status: "pending",
  progress: null,
  traceEvents: [],
  result: null,
  error: null,
  submitting: false,
};

const initialState = {
  phase: "loading" as SkillCreatorPhase,
  prompt: "",
  workspace: null,
  workspaceStatus: "initializing" as WorkspaceStatus,
  sandboxLogs: [] as Array<{ line: string; ts?: string }>,
  workspaceTree: [] as WorkspaceTreeNode[],
  terminalLines: [] as WorkspaceTerminalLineEvent[],
  openFile: initialOpenFile,
  runId: null,
  status: "pending" as SkillTaskStatus,
  progress: null,
  traceEvents: [] as SkillTraceEvent[],
  result: null,
  error: null,
  submitting: false,
  playground: initialPlayground,
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export const useSkillCreatorStore = create<SkillCreatorState>((set, get) => ({
  ...initialState,

  setPrompt: (value) => set({ prompt: value }),

  initializeWorkspace: async (seedPrompt = "") => {
    set({
      phase: "loading",
      error: null,
      sandboxLogs: [],
      workspaceTree: [],
      terminalLines: [],
      workspace: null,
      workspaceStatus: "initializing",
      openFile: null,
    });

    try {
      const workspace = await workspaceService.createSession({
        purpose: "skill_create",
        seed_prompt: seedPrompt,
      });
      set({
        workspace,
        workspaceStatus: workspace.status,
        phase: workspace.status === "ready" ? "sandbox_initializing" : "sandbox_initializing",
      });
      const tree = await workspaceService.getTree(workspace.workspace_id);
      set({ workspaceTree: tree.nodes });
    } catch (err) {
      set({
        phase: "failed",
        error: mapError(err, "初始化沙盒失败"),
      });
    }
  },

  setWorkspaceStatus: (status) => {
    set((state) => {
      const next: Partial<SkillCreatorState> = {
        workspaceStatus: status,
      };
      if (status === "ready" && (state.phase === "loading" || state.phase === "sandbox_initializing")) {
        next.phase = "sandbox_initializing";
      }
      if (status === "failed") {
        next.phase = "failed";
        next.error = state.error || "沙盒初始化失败";
      }
      return next as SkillCreatorState;
    });
  },

  appendSandboxLog: (line, ts) => {
    set((state) => ({
      sandboxLogs: [...state.sandboxLogs, { line, ts }].slice(-500),
    }));
  },

  setWorkspaceTree: (nodes) => set({ workspaceTree: nodes }),

  refreshTree: async () => {
    const workspaceId = get().workspace?.workspace_id;
    if (!workspaceId) return;
    try {
      const tree = await workspaceService.getTree(workspaceId);
      set({ workspaceTree: tree.nodes });
    } catch {
      // ignore tree refresh failures
    }
  },

  appendTerminalLine: (line) => {
    set((state) => ({
      terminalLines: [...state.terminalLines, line].slice(-1000),
    }));
  },

  openWorkspaceFile: async (path) => {
    const workspaceId = get().workspace?.workspace_id;
    if (!workspaceId) return;
    set({
      openFile: {
        path,
        content: "",
        contentType: "text/plain",
        sizeBytes: 0,
        etag: "",
        truncated: false,
        isBinary: false,
        readonly: false,
        dirty: false,
        loading: true,
        saving: false,
        error: null,
        stale: false,
      },
    });
    try {
      const data = await Promise.race([
        workspaceService.readFile(workspaceId, path),
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error("文件读取超时，请重试")), 12_000);
        }),
      ]);
      set({
        openFile: {
          path: data.path,
          content: data.content,
          contentType: data.content_type,
          sizeBytes: data.size_bytes,
          etag: data.etag,
          truncated: data.truncated,
          isBinary: data.is_binary,
          readonly: data.readonly,
          dirty: false,
          loading: false,
          saving: false,
          error: null,
          stale: false,
        },
      });
    } catch (err) {
      set({
        openFile: {
          path,
          content: "",
          contentType: "text/plain",
          sizeBytes: 0,
          etag: "",
          truncated: false,
          isBinary: false,
          readonly: false,
          dirty: false,
          loading: false,
          saving: false,
          error: mapError(err, "文件打开失败"),
          stale: false,
        },
      });
    }
  },

  markOpenFileChanged: (path) => {
    set((state) => {
      if (!state.openFile) return state;
      if (state.openFile.path !== path) return state;
      if (state.openFile.loading || state.openFile.saving) return state;
      return {
        openFile: {
          ...state.openFile,
          stale: !state.openFile.dirty,
        },
      };
    });
  },

  updateOpenFileContent: (content) => {
    set((state) => {
      if (!state.openFile) return state;
      return {
        openFile: {
          ...state.openFile,
          content,
          dirty: true,
          stale: false,
        },
      };
    });
  },

  saveOpenFile: async () => {
    const workspaceId = get().workspace?.workspace_id;
    const openFile = get().openFile;
    if (!workspaceId || !openFile || openFile.readonly) return;

    set({
      openFile: {
        ...openFile,
        saving: true,
        error: null,
      },
    });

    try {
      const resp = await workspaceService.writeFile(workspaceId, {
        path: openFile.path,
        content: openFile.content,
        if_match_etag: openFile.etag,
      });
      set({
        openFile: {
          ...openFile,
          path: resp.path,
          dirty: false,
          saving: false,
          error: null,
          etag: resp.etag || openFile.etag,
          stale: false,
        },
      });
      await get().refreshTree();
    } catch (err) {
      set({
        openFile: {
          ...openFile,
          saving: false,
          error: mapError(err, "保存失败"),
        },
      });
    }
  },

  startCreation: async (prompt) => {
    const query = prompt.trim();
    const workspace = get().workspace;
    if (!query) {
      set({ error: "请输入技能需求" });
      return null;
    }
    if (!workspace) {
      set({ error: "沙盒尚未就绪" });
      return null;
    }

    set({
      submitting: true,
      error: null,
      prompt: query,
      phase: "building_skill",
      status: "pending",
      progress: { stage: "初始化", progress: 0, message: "准备启动创建任务" },
      traceEvents: [],
      result: null,
      runId: null,
      playground: { ...initialPlayground },
    });

    try {
      const resp = await skillService.createRun({
        skill_id: "skill-creator",
        input: { query },
        context: {
          source: "skill_creator_ui",
          workspace_id: workspace.workspace_id,
          session_id: workspace.session_id,
          display_root: workspace.display_root,
        },
      });
      set({
        runId: resp.run_id,
        status: "running",
        submitting: false,
      });
      return resp.run_id;
    } catch (err) {
      set({
        phase: "failed",
        status: "failed",
        error: mapError(err, "创建任务启动失败"),
        submitting: false,
      });
      return null;
    }
  },

  updateProgress: (progress) => {
    set({ progress, status: "running", phase: "building_skill" });
  },

  appendTrace: (event) => {
    set((state) => {
      if (state.traceEvents.some((item) => item.event_id === event.event_id)) {
        return state;
      }
      return {
        traceEvents: [...state.traceEvents, event].slice(-600),
      };
    });
  },

  completeWithResult: (result) => {
    set({
      phase: "build_done",
      status: "completed",
      result,
      error: null,
      submitting: false,
      progress: {
        stage: "交付完成",
        progress: 100,
        message: result.summary || "技能创建完成",
      },
      playground: {
        ...initialPlayground,
        query: "",
      },
    });
  },

  failWithMessage: (message) => {
    set({
      phase: "failed",
      status: "failed",
      error: message,
      submitting: false,
    });
  },

  setPlaygroundQuery: (value) => {
    set((state) => ({
      phase: state.phase === "build_done" ? "run_skill_ready" : state.phase,
      playground: {
        ...state.playground,
        query: value,
      },
    }));
  },

  startPlaygroundRun: async () => {
    const state = get();
    const query = state.playground.query.trim();
    const workspace = state.workspace;
    const skillId = state.result?.created_skill_id;

    if (!query || !workspace || !skillId) {
      return null;
    }
    if (state.playground.status === "running" && state.playground.activeRunId) {
      set((s) => ({
        playground: {
          ...s.playground,
          error: "当前已有运行中的任务，请先停止后再发起新一轮。",
        },
      }));
      return null;
    }

    const runSessionId = state.playground.runSessionId || `rs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    set({
      phase: "run_skill_ready",
      playground: {
        ...state.playground,
        runSessionId,
        submitting: true,
        error: null,
        activeRunId: null,
        status: "pending",
        progress: { stage: "初始化", progress: 0, message: "准备执行技能" },
        traceEvents: [],
        result: null,
      },
    });

    try {
      const resp = await skillService.createRun({
        skill_id: skillId,
        input: { query },
        context: {
          source: "workspace_playground",
          workspace_id: workspace.workspace_id,
          session_id: workspace.session_id,
          display_root: workspace.display_root,
          run_session_id: runSessionId,
        },
      });

      set((s) => ({
        playground: {
          ...s.playground,
          activeRunId: resp.run_id,
          runs: [
            ...s.playground.runs,
            {
              runId: resp.run_id,
              query,
              status: "running",
              progress: { stage: "初始化", progress: 0, message: "准备执行技能" },
              traceEvents: [],
              result: null,
              error: null,
              startedAt: Date.now(),
              lastEventAt: Date.now(),
            },
          ],
          status: "running",
          submitting: false,
        },
      }));
      return resp.run_id;
    } catch (err) {
      set((s) => ({
        playground: {
          ...s.playground,
          status: "failed",
          submitting: false,
          error: mapError(err, "运行技能失败"),
        },
      }));
      return null;
    }
  },

  updatePlaygroundProgress: (runId, progress) => {
    set((state) => ({
      phase: "run_skill_ready",
      playground: {
        ...state.playground,
        progress,
        status: state.playground.activeRunId === runId ? "running" : state.playground.status,
        runs: state.playground.runs.map((item) => {
          if (item.runId !== runId) return item;
          return {
            ...item,
            status: "running",
            progress,
            lastEventAt: Date.now(),
          };
        }),
      },
    }));
  },

  appendPlaygroundTrace: (runId, event) => {
    set((state) => {
      if (state.playground.activeRunId === runId && state.playground.traceEvents.some((item) => item.event_id === event.event_id)) {
        return state;
      }
      const runs = state.playground.runs.map((item) => {
        if (item.runId !== runId) return item;
        if (item.traceEvents.some((trace) => trace.event_id === event.event_id)) return item;
        return {
          ...item,
          traceEvents: [...item.traceEvents, event].slice(-600),
          lastEventAt: Date.now(),
        };
      });
      const active = runs.find((item) => item.runId === state.playground.activeRunId);
      return {
        phase: "run_skill_ready",
        playground: {
          ...state.playground,
          traceEvents: active?.traceEvents || state.playground.traceEvents,
          runs,
        },
      };
    });
  },

  completePlayground: (runId, result) => {
    set((state) => ({
      phase: "run_skill_ready",
      playground: {
        ...state.playground,
        status: state.playground.activeRunId === runId ? "completed" : state.playground.status,
        result: state.playground.activeRunId === runId ? result : state.playground.result,
        submitting: false,
        error: state.playground.activeRunId === runId ? null : state.playground.error,
        progress: {
          stage: "完成",
          progress: 100,
          message: result.summary || "运行完成",
        },
        runs: state.playground.runs.map((item) => {
          if (item.runId !== runId) return item;
          return {
            ...item,
            status: "completed",
            result,
            error: null,
            progress: { stage: "完成", progress: 100, message: result.summary || "运行完成" },
            finishedAt: Date.now(),
            lastEventAt: Date.now(),
          };
        }),
      },
    }));
  },

  failPlayground: (runId, message) => {
    set((state) => ({
      phase: "run_skill_ready",
      playground: {
        ...state.playground,
        status: state.playground.activeRunId === runId ? "failed" : state.playground.status,
        error: state.playground.activeRunId === runId ? message : state.playground.error,
        submitting: false,
        runs: state.playground.runs.map((item) => {
          if (item.runId !== runId) return item;
          return {
            ...item,
            status: "failed",
            error: message,
            finishedAt: Date.now(),
            lastEventAt: Date.now(),
          };
        }),
      },
    }));
  },

  touchPlaygroundRun: (runId) => {
    set((state) => ({
      playground: {
        ...state.playground,
        runs: state.playground.runs.map((item) => (item.runId === runId ? { ...item, lastEventAt: Date.now() } : item)),
      },
    }));
  },

  reset: () => set({ ...initialState }),
}));
