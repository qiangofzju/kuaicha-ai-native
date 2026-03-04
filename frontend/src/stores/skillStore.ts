import { create } from "zustand";
import type {
  PurchaseRecord,
  SkillConfigSchema,
  SkillDefinition,
  SkillProgress,
  SkillResultData,
  SkillStoreSection,
  SkillTaskStatus,
  SkillTraceEvent,
} from "@/types/skill";
import { skillService } from "@/services/skillService";

interface SkillState {
  skills: SkillDefinition[];
  storeSections: SkillStoreSection[];
  mySkills: SkillDefinition[];
  purchaseRecords: PurchaseRecord[];
  selectedSkill: SkillDefinition | null;
  configSchema: SkillConfigSchema | null;
  currentTaskId: string | null;
  taskStatus: SkillTaskStatus;
  progress: SkillProgress | null;
  result: SkillResultData | null;
  formValues: Record<string, unknown>;
  streamContent: string;
  traceEvents: SkillTraceEvent[];

  loadingSkills: boolean;
  loadingSchema: boolean;
  loadingStore: boolean;
  loadingPurchaseRecords: boolean;
  executing: boolean;
  loadingResult: boolean;
  error: string | null;

  loadSkills: () => Promise<void>;
  loadStore: () => Promise<void>;
  loadMySkills: () => Promise<void>;
  loadPurchaseRecords: () => Promise<void>;
  loadMarketplace: () => Promise<void>;
  selectSkill: (skill: SkillDefinition) => void;
  loadSchema: (skillId: string) => Promise<void>;
  setFormValue: (field: string, value: unknown) => void;
  executeSkill: () => Promise<void>;
  updateProgress: (progress: SkillProgress) => void;
  appendStreamContent: (content: string) => void;
  appendTraceEvent: (event: SkillTraceEvent) => void;
  clearTraceEvents: () => void;
  setTaskStatus: (status: SkillTaskStatus) => void;
  setResult: (result: SkillResultData) => void;
  fetchResult: (taskId: string) => Promise<void>;
  cancelExecution: () => Promise<void>;
  reset: () => void;
  resetExecution: () => void;
}

const initialExecutionState = {
  currentTaskId: null,
  taskStatus: "pending" as SkillTaskStatus,
  progress: null,
  result: null,
  streamContent: "",
  traceEvents: [],
  executing: false,
  loadingResult: false,
  error: null,
};

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  storeSections: [],
  mySkills: [],
  purchaseRecords: [],
  selectedSkill: null,
  configSchema: null,
  formValues: {},
  loadingSkills: false,
  loadingSchema: false,
  loadingStore: false,
  loadingPurchaseRecords: false,
  ...initialExecutionState,

  loadSkills: async () => {
    set({ loadingSkills: true, error: null });
    try {
      const skills = await skillService.listSkills();
      set({ skills, loadingSkills: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load skills",
        loadingSkills: false,
      });
    }
  },

  loadStore: async () => {
    set({ loadingStore: true, error: null });
    try {
      const data = await skillService.getStore();
      set({ storeSections: data.sections || [], loadingStore: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load store",
        loadingStore: false,
      });
    }
  },

  loadMySkills: async () => {
    try {
      const mySkills = await skillService.getMySkills();
      set({ mySkills });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load my skills",
      });
    }
  },

  loadPurchaseRecords: async () => {
    set({ loadingPurchaseRecords: true });
    try {
      const purchaseRecords = await skillService.getPurchaseRecords();
      set({ purchaseRecords, loadingPurchaseRecords: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load purchase records",
        loadingPurchaseRecords: false,
      });
    }
  },

  loadMarketplace: async () => {
    await Promise.all([
      get().loadSkills(),
      get().loadStore(),
      get().loadMySkills(),
    ]);
  },

  selectSkill: (skill) => {
    set({ selectedSkill: skill });
  },

  loadSchema: async (skillId) => {
    set({ loadingSchema: true, error: null, configSchema: null, formValues: {} });
    try {
      const schema = await skillService.getSchema(skillId);
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

  executeSkill: async () => {
    const { selectedSkill, formValues, configSchema } = get();
    if (!selectedSkill) return;

    let target = "";
    const params: Record<string, unknown> = {};

    if (configSchema) {
      for (const field of configSchema.fields) {
        const val = formValues[field.name];
        if (field.name === "target" || field.name === "company" || field.name === "company_name") {
          target = String(val || "");
        } else {
          params[field.name] = val;
        }
      }
    }

    if (!target && configSchema) {
      const firstTextField = configSchema.fields.find((f) => f.type === "text");
      if (firstTextField) {
        target = String(formValues[firstTextField.name] || "");
      }
    }
    if (Array.isArray(formValues.company_names) && formValues.company_names.length > 0) {
      params.company_names = formValues.company_names;
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
      const response = await skillService.execute(selectedSkill.id, target, params);
      set({
        currentTaskId: response.task_id,
        taskStatus: "running",
        executing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to execute skill",
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
      const result = await skillService.getTaskResult(taskId);
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
      await skillService.cancelTask(taskId);
    } catch {
      // ignore cancel errors
    }
    set({
      ...initialExecutionState,
      taskStatus: "pending" as SkillTaskStatus,
      formValues: get().formValues,
    });
  },

  reset: () => {
    set({
      skills: [],
      storeSections: [],
      mySkills: [],
      purchaseRecords: [],
      selectedSkill: null,
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
