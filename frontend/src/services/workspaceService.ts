import { apiFetch } from "./api";
import type {
  WorkspaceCreatorResultPayload,
  WorkspaceFilePayload,
  WorkspaceFileUpdatePayload,
  WorkspaceRunSession,
  WorkspaceSession,
  WorkspaceTreeResponse,
} from "@/types/workspace";

export const workspaceService = {
  createSession: (payload: { purpose: string; seed_prompt?: string; skill_id?: string; reuse_existing?: boolean }) =>
    apiFetch<WorkspaceSession>("/api/workspace/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSession: (workspaceId: string) =>
    apiFetch<WorkspaceSession>(`/api/workspace/sessions/${workspaceId}`),

  getTree: (workspaceId: string, path = "") => {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    return apiFetch<WorkspaceTreeResponse>(`/api/workspace/sessions/${workspaceId}/tree${query}`);
  },

  readFile: (workspaceId: string, path: string, maxBytes = 1_500_000) =>
    apiFetch<WorkspaceFilePayload>(
      `/api/workspace/sessions/${workspaceId}/file?path=${encodeURIComponent(path)}&max_bytes=${maxBytes}`,
    ),

  writeFile: (workspaceId: string, payload: { path: string; content: string; if_match_etag?: string }) =>
    apiFetch<WorkspaceFileUpdatePayload>(`/api/workspace/sessions/${workspaceId}/file`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getCreatorResult: (workspaceId: string, runId?: string) => {
    const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
    return apiFetch<WorkspaceCreatorResultPayload>(
      `/api/workspace/sessions/${workspaceId}/creator-result${query}`,
    );
  },

  createRunSession: (workspaceId: string) =>
    apiFetch<WorkspaceRunSession>(`/api/workspace/sessions/${workspaceId}/run-session`, {
      method: "POST",
    }),
};
