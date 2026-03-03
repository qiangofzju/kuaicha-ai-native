import { create } from "zustand";
import type {
  AgentDefinition,
  AgentConfigSchema,
  AgentProgress,
  AgentResultData,
  AgentTraceEvent,
  TaskStatus,
} from "@/types/agent";
import { agentService } from "@/services/agentService";

interface AgentState {
  // Data
  agents: AgentDefinition[];
  selectedAgent: AgentDefinition | null;
  configSchema: AgentConfigSchema | null;
  currentTaskId: string | null;
  taskStatus: TaskStatus;
  progress: AgentProgress | null;
  result: AgentResultData | null;
  formValues: Record<string, unknown>;
  streamContent: string;
  traceEvents: AgentTraceEvent[];

  // Loading states
  loadingAgents: boolean;
  loadingSchema: boolean;
  executing: boolean;
  loadingResult: boolean;
  error: string | null;

  // Actions
  loadAgents: () => Promise<void>;
  selectAgent: (agent: AgentDefinition) => void;
  loadSchema: (agentId: string) => Promise<void>;
  setFormValue: (field: string, value: unknown) => void;
  executeAgent: () => Promise<void>;
  updateProgress: (progress: AgentProgress) => void;
  appendStreamContent: (content: string) => void;
  appendTraceEvent: (event: AgentTraceEvent) => void;
  clearTraceEvents: () => void;
  setTaskStatus: (status: TaskStatus) => void;
  setResult: (result: AgentResultData) => void;
  fetchResult: (taskId: string) => Promise<void>;
  cancelExecution: () => Promise<void>;
  reset: () => void;
  resetExecution: () => void;
}

const initialExecutionState = {
  currentTaskId: null,
  taskStatus: "pending" as TaskStatus,
  progress: null,
  result: null,
  streamContent: "",
  traceEvents: [],
  executing: false,
  loadingResult: false,
  error: null,
};

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  agents: [],
  selectedAgent: null,
  configSchema: null,
  formValues: {},
  loadingAgents: false,
  loadingSchema: false,
  ...initialExecutionState,

  loadAgents: async () => {
    set({ loadingAgents: true, error: null });
    try {
      const agents = await agentService.listAgents();
      set({ agents, loadingAgents: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load agents",
        loadingAgents: false,
      });
    }
  },

  selectAgent: (agent) => {
    set({ selectedAgent: agent });
  },

  loadSchema: async (agentId) => {
    set({ loadingSchema: true, error: null, configSchema: null, formValues: {} });
    try {
      const schema = await agentService.getSchema(agentId);
      // Initialize form values with defaults
      const defaultValues: Record<string, unknown> = {};
      for (const field of schema.fields) {
        if (field.default !== undefined) {
          defaultValues[field.name] = field.default;
        } else if (field.type === "multiselect") {
          defaultValues[field.name] = [];
        } else {
          defaultValues[field.name] = "";
        }
      }
      set({ configSchema: schema, formValues: defaultValues, loadingSchema: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load schema",
        loadingSchema: false,
      });
    }
  },

  setFormValue: (field, value) => {
    set((state) => ({
      formValues: { ...state.formValues, [field]: value },
    }));
  },

  executeAgent: async () => {
    const { selectedAgent, formValues } = get();
    if (!selectedAgent) return;

    // Extract target (first text field value) and remaining params
    const schema = get().configSchema;
    let target = "";
    const params: Record<string, unknown> = {};

    if (schema) {
      for (const field of schema.fields) {
        const val = formValues[field.name];
        if (field.name === "target" || field.name === "company" || field.name === "company_name") {
          target = String(val || "");
        } else {
          params[field.name] = val;
        }
      }
    }

    // If no explicit target field found, use the first text field
    if (!target && schema) {
      const firstTextField = schema.fields.find((f) => f.type === "text");
      if (firstTextField) {
        target = String(formValues[firstTextField.name] || "");
      }
    }

    set({
      executing: true,
      error: null,
      taskStatus: "pending",
      progress: null,
      result: null,
      streamContent: "",
      traceEvents: [],
    });

    try {
      const response = await agentService.execute(selectedAgent.id, target, params);
      set({
        currentTaskId: response.task_id,
        taskStatus: "running",
        executing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to execute agent",
        executing: false,
        taskStatus: "failed",
      });
    }
  },

  updateProgress: (progress) => {
    set({ progress, taskStatus: "running" });
  },

  appendStreamContent: (content) => {
    set((state) => ({ streamContent: state.streamContent + content }));
  },

  appendTraceEvent: (event) => {
    set((state) => {
      if (state.traceEvents.some((item) => item.event_id === event.event_id)) {
        return state;
      }
      const nextEvents = [...state.traceEvents, event];
      return { traceEvents: nextEvents.slice(-300) };
    });
  },

  clearTraceEvents: () => {
    set({ traceEvents: [] });
  },

  setTaskStatus: (status) => {
    set({ taskStatus: status });
  },

  setResult: (result) => {
    set({ result, taskStatus: "completed", loadingResult: false });
  },

  fetchResult: async (taskId) => {
    set({ loadingResult: true });
    try {
      const result = await agentService.getTaskResult(taskId);
      set({ result, taskStatus: "completed", loadingResult: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch result",
        loadingResult: false,
      });
    }
  },

  cancelExecution: async () => {
    const taskId = get().currentTaskId;
    if (!taskId) return;
    try {
      await agentService.cancelTask(taskId);
    } catch {
      // Ignore cancel errors
    }
    set({
      ...initialExecutionState,
      taskStatus: "pending" as TaskStatus,
      formValues: get().formValues,
    });
  },

  reset: () => {
    set({
      selectedAgent: null,
      configSchema: null,
      formValues: {},
      ...initialExecutionState,
    });
  },

  resetExecution: () => {
    set({
      ...initialExecutionState,
      formValues: get().formValues,
    });
  },
}));
