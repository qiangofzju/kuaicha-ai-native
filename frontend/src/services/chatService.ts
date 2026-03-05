import { apiFetch, apiStreamFetch } from "./api";
import type { ChatSession } from "@/types/chat";

export const chatService = {
  createSession: (title?: string) =>
    apiFetch<ChatSession>("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  listSessions: () => apiFetch<ChatSession[]>("/api/chat/sessions"),

  renameSession: (sessionId: string, title: string) =>
    apiFetch<ChatSession>(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteSession: (sessionId: string) =>
    apiFetch<{ status: string }>(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  sendMessage: (
    sessionId: string,
    content: string,
    options?: RequestInit,
  ) => apiStreamFetch(`/api/chat/sessions/${sessionId}/messages`, { content }, options),

  invokeSkill: (
    sessionId: string,
    payload: {
      skill_id: string;
      input: Record<string, unknown>;
      origin_message_id?: string;
    },
    options?: RequestInit,
  ) => apiStreamFetch(`/api/chat/sessions/${sessionId}/skill-invocations`, payload, options),
};
