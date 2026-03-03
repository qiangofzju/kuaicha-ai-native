import { create } from "zustand";
import { datashowService } from "@/services/datashowService";
import type { OverviewResponse, NLChartResponse } from "@/types/datashow";

interface DatashowState {
  overview: OverviewResponse | null;
  isLoading: boolean;
  error: string | null;

  // Tab navigation
  activeTab: string;

  // NL Query
  nlChart: NLChartResponse | null;
  nlLoading: boolean;
  nlError: string | null;

  setActiveTab: (tab: string) => void;
  loadOverview: () => Promise<void>;
  submitNLQuery: (query: string) => Promise<void>;
  clearNLChart: () => void;
}

export const useDatashowStore = create<DatashowState>((set, get) => ({
  overview: null,
  isLoading: false,
  error: null,

  activeTab: "overview",

  nlChart: null,
  nlLoading: false,
  nlError: null,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  loadOverview: async () => {
    // Skip if already loading
    if (get().isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const data = await datashowService.getOverview();
      set({ overview: data, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load overview data";
      set({ error: message, isLoading: false });
    }
  },

  submitNLQuery: async (query: string) => {
    set({ nlLoading: true, nlError: null });
    try {
      const chart = await datashowService.nlQuery(query);
      set({ nlChart: chart, nlLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "图表生成失败，请重试";
      set({ nlError: message, nlLoading: false });
    }
  },

  clearNLChart: () => {
    set({ nlChart: null, nlError: null });
  },
}));
