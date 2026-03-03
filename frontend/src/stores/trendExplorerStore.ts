import { create } from "zustand";
import type { TrendExplorerResult, ExplorerProgress, ExplorerQuery } from "@/types/trendExplorer";
import { agentService } from "@/services/agentService";

type TaskStatus = "idle" | "pending" | "running" | "completed" | "failed";

interface TrendExplorerState {
  currentTaskId: string | null;
  taskStatus: TaskStatus;
  progress: ExplorerProgress | null;
  streamContent: string;
  result: TrendExplorerResult | null;
  error: string | null;
  loadingResult: boolean;
  queryHistory: ExplorerQuery[];

  submitQuery: (query: string) => Promise<void>;
  updateProgress: (progress: ExplorerProgress) => void;
  appendStreamContent: (content: string) => void;
  setTaskStatus: (status: TaskStatus) => void;
  fetchResult: (taskId: string) => Promise<void>;
  setResult: (result: TrendExplorerResult) => void;
  cancelExecution: () => Promise<void>;
  reset: () => void;
  deepDive: (entityName: string) => void;
}

const initialState = {
  currentTaskId: null as string | null,
  taskStatus: "idle" as TaskStatus,
  progress: null as ExplorerProgress | null,
  streamContent: "",
  result: null as TrendExplorerResult | null,
  error: null as string | null,
  loadingResult: false,
};

export const useTrendExplorerStore = create<TrendExplorerState>((set, get) => ({
  ...initialState,
  queryHistory: [],

  submitQuery: async (query: string) => {
    set({
      ...initialState,
      taskStatus: "pending",
      queryHistory: get().queryHistory,
      result: null,
    });

    const historyEntry: ExplorerQuery = {
      query,
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    set((s) => ({ queryHistory: [historyEntry, ...s.queryHistory].slice(0, 10) }));

    try {
      const response = await agentService.execute("trend", query, {});
      set({
        currentTaskId: response.task_id,
        taskStatus: "running",
      });
      set((s) => ({
        queryHistory: s.queryHistory.map((h) =>
          h === historyEntry ? { ...h, taskId: response.task_id, status: "running" as const } : h,
        ),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "查询失败",
        taskStatus: "failed",
      });
    }
  },

  updateProgress: (progress) => {
    set({ progress, taskStatus: "running" });
  },

  appendStreamContent: (content) => {
    set((s) => ({ streamContent: s.streamContent + content }));
  },

  setTaskStatus: (status) => {
    set({ taskStatus: status });
    const taskId = get().currentTaskId;
    if (taskId) {
      set((s) => ({
        queryHistory: s.queryHistory.map((h) =>
          h.taskId === taskId
            ? { ...h, status: status === "completed" ? "completed" : status === "failed" ? "failed" : h.status }
            : h,
        ),
      }));
    }
  },

  fetchResult: async (taskId) => {
    set({ loadingResult: true });
    try {
      const raw = await agentService.getTaskResult(taskId);
      const r = raw as unknown as Record<string, unknown>;
      const trendResult: TrendExplorerResult = {
        task_id: (r.task_id as string) || taskId,
        agent_type: "trend",
        summary: (r.summary as string) || "",
        query_interpretation: (r.query_interpretation as string) || "",
        entities: (r.entities as TrendExplorerResult["entities"]) || [],
        trend_summary: (r.trend_summary as string) || "",
        visualizations: (r.visualizations as TrendExplorerResult["visualizations"]) || [],
        data_sources: (r.data_sources as string[]) || [],
        metadata: (r.metadata as Record<string, unknown>) || {},
      };
      set({ result: trendResult, taskStatus: "completed", loadingResult: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "获取结果失败",
        loadingResult: false,
      });
    }
  },

  setResult: (result) => {
    set({ result, taskStatus: "completed", loadingResult: false });
  },

  cancelExecution: async () => {
    const taskId = get().currentTaskId;
    if (!taskId) return;
    try {
      await agentService.cancelTask(taskId);
    } catch {
      // Ignore cancel errors
    }
    set({ ...initialState, queryHistory: get().queryHistory });
  },

  reset: () => {
    set({ ...initialState, queryHistory: get().queryHistory });
  },

  deepDive: (entityName: string) => {
    get().submitQuery(`分析${entityName}的趋势变化`);
  },
}));
