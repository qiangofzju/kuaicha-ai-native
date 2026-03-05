import { create } from "zustand";
import type {
  PurchaseRecord,
  SkillDefinition,
  SkillManifest,
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
  manifest: SkillManifest | null;
  currentTaskId: string | null;
  taskStatus: SkillTaskStatus;
  progress: SkillProgress | null;
  result: SkillResultData | null;
  formValues: Record<string, unknown>;
  streamContent: string;
  traceEvents: SkillTraceEvent[];

  loadingSkills: boolean;
  loadingManifest: boolean;
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
  loadManifest: (skillId: string) => Promise<void>;
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

function buildDefaultFormValues(manifest: SkillManifest): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const properties = manifest.input_schema?.properties || {};

  for (const [name, schema] of Object.entries(properties)) {
    if (Array.isArray(schema.enum)) {
      defaults[name] = schema.default ?? schema.enum[0] ?? "";
      continue;
    }
    if (schema.type === "array") {
      defaults[name] = Array.isArray(schema.default) ? schema.default : [];
      continue;
    }
    defaults[name] = schema.default ?? "";
  }

  if (!defaults.scenario) {
    defaults.scenario = "filter";
  }

  return defaults;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  storeSections: [],
  mySkills: [],
  purchaseRecords: [],
  selectedSkill: null,
  manifest: null,
  formValues: {},
  loadingSkills: false,
  loadingManifest: false,
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
    await Promise.all([get().loadSkills(), get().loadStore(), get().loadMySkills()]);
  },

  selectSkill: (skill) => {
    set({ selectedSkill: skill });
  },

  loadManifest: async (skillId) => {
    set({ loadingManifest: true, error: null, manifest: null, formValues: {} });
    try {
      const manifest = await skillService.getManifest(skillId);
      set({
        manifest,
        formValues: buildDefaultFormValues(manifest),
        loadingManifest: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load manifest",
        loadingManifest: false,
      });
    }
  },

  setFormValue: (field, value) => {
    set((state) => ({
      formValues: { ...state.formValues, [field]: value },
    }));
  },

  executeSkill: async () => {
    const { selectedSkill, formValues } = get();
    if (!selectedSkill) return;

    const inputPayload: Record<string, unknown> = {
      ...formValues,
      query: String(formValues.query ?? ""),
      scenario: String(formValues.scenario ?? "filter"),
    };

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
      const response = await skillService.createRun({
        skill_id: selectedSkill.id,
        input: inputPayload,
        context: { source: "standalone" },
      });
      set({
        currentTaskId: response.run_id,
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
      const result = await skillService.getRunResult(taskId);
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
      await skillService.cancelRun(taskId);
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
      manifest: null,
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
