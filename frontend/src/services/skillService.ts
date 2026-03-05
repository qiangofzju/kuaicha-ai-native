import { apiFetch } from "./api";
import type {
  PurchaseRecord,
  SkillCatalogItem,
  SkillConfigSchema,
  SkillDefinition,
  SkillManifest,
  SkillResultData,
  SkillRunCreateResponse,
  SkillRunRequest,
  SkillStoreSection,
  SkillTask,
} from "@/types/skill";

export const skillService = {
  listSkills: () => apiFetch<SkillDefinition[]>("/api/skills/list"),

  getStore: () => apiFetch<{ sections: SkillStoreSection[] }>("/api/skills/store"),

  getMySkills: () => apiFetch<SkillDefinition[]>("/api/skills/mine"),

  getPurchaseRecords: () => apiFetch<PurchaseRecord[]>("/api/skills/purchase-records"),

  createSkill: (payload: { name: string; description: string; category: string }) =>
    apiFetch<{ status: string; message: string; review_id: string }>("/api/skills/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCatalog: () => apiFetch<SkillCatalogItem[]>("/api/skills/catalog"),

  getManifest: (id: string) => apiFetch<SkillManifest>(`/api/skills/${id}/manifest`),

  createRun: (payload: SkillRunRequest) =>
    apiFetch<SkillRunCreateResponse>("/api/skills/runs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRunStatus: (runId: string) => apiFetch<SkillTask>(`/api/skills/runs/${runId}`),

  cancelRun: (runId: string) =>
    apiFetch<{ run_id: string; status: string }>(`/api/skills/runs/${runId}/cancel`, {
      method: "POST",
    }),

  getRunResult: (runId: string) => apiFetch<SkillResultData>(`/api/skills/runs/${runId}/result`),

  exportRunResult: async (runId: string, format: "pdf" | "excel") => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/skills/runs/${runId}/export/${format}`);
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
        // ignore parsing errors
      }
      throw new Error(detail);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("content-disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const serverFileName = fileNameMatch?.[1];
    const ext = format === "pdf" ? "pdf" : "xlsx";
    const finalFileName = serverFileName || `skill_report_${runId.slice(0, 8)}.${ext}`;
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

  // Compatibility endpoints
  getSchema: (id: string) => apiFetch<SkillConfigSchema>(`/api/skills/${id}/schema`),

  execute: (id: string, target: string, params: Record<string, unknown> = {}) =>
    apiFetch<{ task_id: string }>(`/api/skills/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ target, params }),
    }),

  getTaskStatus: (taskId: string) => apiFetch<SkillTask>(`/api/skills/tasks/${taskId}`),

  cancelTask: (taskId: string) =>
    apiFetch<{ task_id: string; status: string }>(`/api/skills/tasks/${taskId}`, {
      method: "DELETE",
    }),

  getTaskResult: (taskId: string) => apiFetch<SkillResultData>(`/api/skills/tasks/${taskId}/result`),

  exportResult: async (taskId: string, format: "pdf" | "excel") => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/skills/tasks/${taskId}/export/${format}`);
    if (!res.ok) {
      throw new Error(`Export failed: ${res.status}`);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("content-disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const serverFileName = fileNameMatch?.[1];
    const ext = format === "pdf" ? "pdf" : "xlsx";
    const finalFileName = serverFileName || `skill_report_${taskId.slice(0, 8)}.${ext}`;
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

  uploadCompanyList: async (file: File) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const fd = new FormData();
    fd.append("file", file);
    const response = await fetch(`${API_BASE}/api/skills/batch/upload-companies`, {
      method: "POST",
      body: fd,
    });
    if (!response.ok) {
      throw new Error("文件上传失败");
    }
    return response.json() as Promise<{ companies: string[]; count: number; filename: string }>;
  },
};
