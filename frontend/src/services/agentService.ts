import { apiFetch } from "./api";
import type { AgentDefinition, AgentConfigSchema, AgentTask, AgentResultData } from "@/types/agent";

export const agentService = {
  listAgents: () => apiFetch<AgentDefinition[]>("/api/agent/list"),

  getSchema: (id: string) => apiFetch<AgentConfigSchema>(`/api/agent/${id}/schema`),

  execute: (id: string, target: string, params: Record<string, unknown> = {}) =>
    apiFetch<{ task_id: string }>(`/api/agent/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ target, params }),
    }),

  getTaskStatus: (taskId: string) => apiFetch<AgentTask>(`/api/agent/tasks/${taskId}`),

  cancelTask: (taskId: string) =>
    apiFetch<{ task_id: string; status: string }>(`/api/agent/tasks/${taskId}`, {
      method: "DELETE",
    }),

  getTaskResult: (taskId: string) => apiFetch<AgentResultData>(`/api/agent/tasks/${taskId}/result`),

  exportResult: async (taskId: string, format: "pdf" | "excel") => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/agent/tasks/${taskId}/export/${format}`);

    if (!res.ok) {
      let detail = `Export failed: ${res.status}`;
      try {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = (await res.json()) as { detail?: string };
          if (payload?.detail) detail = payload.detail;
        } else {
          const text = (await res.text()).trim();
          if (text) detail = text;
        }
      } catch {
        // keep default detail
      }
      throw new Error(detail);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("content-disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const serverFileName = fileNameMatch?.[1];
    const ext = format === "pdf" ? "pdf" : "xlsx";
    const finalFileName = serverFileName || `report_${taskId.slice(0, 8)}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFileName;
    a.click();
    URL.revokeObjectURL(url);

    return {
      fallback: res.headers.get("x-export-fallback"),
      filename: finalFileName,
    };
  },
};
