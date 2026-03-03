import { apiFetch } from "./api";
import type {
  OverviewResponse,
  NLChartResponse,
  GraphResponse,
  TrendResponse,
} from "@/types/datashow";

export const datashowService = {
  getOverview: () => apiFetch<OverviewResponse>("/api/datashow/overview"),

  nlQuery: (query: string) =>
    apiFetch<NLChartResponse>("/api/datashow/nl-query", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  getGraph: (company: string) =>
    apiFetch<GraphResponse>(`/api/datashow/graph/${encodeURIComponent(company)}`),

  getTrends: (companies?: string[]) => {
    const params = companies ? `?companies=${companies.map(encodeURIComponent).join(",")}` : "";
    return apiFetch<TrendResponse>(`/api/datashow/trends${params}`);
  },
};
