import { create } from "zustand";
import type {
  ChatMessage,
  ChatSession,
  ChatSkillCardArtifact,
  ChatSkillRun,
  RiskDetail,
} from "@/types/chat";
import type { SkillTraceEvent } from "@/types/skill";
import { chatService } from "@/services/chatService";

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  abortController: AbortController | null;

  loadSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<ChatSession>;
  setCurrentSession: (id: string) => void;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  invokeSkill: (messageId: string, skillId: string, input: Record<string, unknown>) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

function parseSsePayloads(chunkText: string): { payloads: string[]; rest: string } {
  const parts = chunkText.split(/\r?\n\r?\n/);
  const rest = parts.pop() || "";
  const payloads: string[] = [];

  for (const part of parts) {
    const dataLines = part
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    const payload = dataLines.join("\n").trim();
    if (payload) {
      payloads.push(payload);
    }
  }

  return { payloads, rest };
}

function appendRunOrUpdate(message: ChatMessage, runId: string, updater: (run: ChatSkillRun) => ChatSkillRun): ChatMessage {
  const runs = message.skill_runs || [];
  const found = runs.find((item) => item.run_id === runId);
  if (found) {
    return {
      ...message,
      skill_runs: runs.map((item) => (item.run_id === runId ? updater(item) : item)),
    };
  }
  const nextRun = updater({
    run_id: runId,
    skill_id: "",
    status: "pending",
    trace_events: [],
  });
  return {
    ...message,
    skill_runs: [...runs, nextRun],
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  abortController: null,

  loadSessions: async () => {
    try {
      const sessions = await chatService.listSessions();
      set({ sessions });
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  },

  createSession: async (title?: string) => {
    const session = await chatService.createSession(title);
    set((s) => ({
      sessions: [session, ...s.sessions],
      currentSessionId: session.id,
      messages: [],
    }));
    return session;
  },

  setCurrentSession: (id: string) => {
    set({ currentSessionId: id, messages: [] });
  },

  renameSession: async (id: string, title: string) => {
    try {
      await chatService.renameSession(id, title);
      set((s) => ({
        sessions: s.sessions.map((session) =>
          session.id === id ? { ...session, title } : session
        ),
      }));
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  },

  deleteSession: async (id: string) => {
    try {
      await chatService.deleteSession(id);
      set((s) => {
        const sessions = s.sessions.filter((session) => session.id !== id);
        const currentSessionId =
          s.currentSessionId === id ? sessions[0]?.id || null : s.currentSessionId;
        return {
          sessions,
          currentSessionId,
          messages: s.currentSessionId === id ? [] : s.messages,
        };
      });
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  stopStreaming: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
      set({ abortController: null, isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const state = get();
    if (state.isLoading) return;

    let sessionId = state.currentSessionId;
    if (!sessionId) {
      const session = await get().createSession(content.slice(0, 20));
      sessionId = session.id;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "ai",
      content: "",
      isStreaming: true,
    };

    const controller = new AbortController();

    set((s) => ({
      messages: [...s.messages, userMessage, aiMessage],
      isLoading: true,
      abortController: controller,
    }));

    let streamCompleted = false;
    let streamAborted = false;

    try {
      const response = await chatService.sendMessage(sessionId, content, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          const flushed = parseSsePayloads(`${buffer}\n\n`);
          for (const payload of flushed.payloads) {
            try {
              const event = JSON.parse(payload);
              if (event.type === "done") {
                streamCompleted = true;
              }
            } catch {
              // no-op
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const parsed = parseSsePayloads(buffer);
        buffer = parsed.rest;

        for (const jsonStr of parsed.payloads) {
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "token") {
              const token = typeof event.data === "string" ? event.data : "";
              if (!token) continue;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, content: m.content + token } : m
                ),
              }));
            } else if (event.type === "details") {
              const details: RiskDetail[] = event.data;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, details } : m
                ),
              }));
            } else if (event.type === "actions") {
              const actions: string[] = event.data;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, actions } : m
                ),
              }));
            } else if (event.type === "skill_card") {
              const artifact: ChatSkillCardArtifact = {
                type: "skill_card",
                skill_id: String(event.data?.skill_id || ""),
                display_name: String(event.data?.display_name || "技能"),
                description: event.data?.description,
                message: event.data?.message,
                prefill: typeof event.data?.prefill === "object" && event.data.prefill ? event.data.prefill : {},
                required_fields: Array.isArray(event.data?.required_fields) ? event.data.required_fields : [],
                ui: typeof event.data?.ui === "object" ? event.data.ui : undefined,
              };
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        content: artifact.message || "",
                        artifacts: [artifact],
                        isStreaming: false,
                      }
                    : m
                ),
              }));
            } else if (event.type === "done") {
              streamCompleted = true;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === aiMessageId ? { ...m, isStreaming: false } : m
                ),
                isLoading: false,
                abortController: null,
              }));
            }
          } catch {
            // no-op
          }
        }
      }

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        ),
        isLoading: false,
        abortController: null,
      }));

      if (streamCompleted) {
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, message_count: session.message_count + 2 }
              : session
          ),
        }));
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      streamAborted = aborted;
      if (!aborted) {
        console.error("Failed to send message:", err);
      }

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: aborted ? m.content || "已停止生成" : "抱歉，请求出错了，请稍后重试。",
                isStreaming: false,
                streamStopped: aborted,
              }
            : m
        ),
        isLoading: false,
        abortController: null,
      }));
    } finally {
      if (streamAborted) {
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, message_count: session.message_count + 1 }
              : session
          ),
        }));
      }
    }
  },

  invokeSkill: async (messageId, skillId, input) => {
    const sessionId = get().currentSessionId;
    if (!sessionId) return;
    if (get().isLoading) return;

    const controller = new AbortController();
    const tempRunId = `run-${Date.now()}`;

    set((s) => ({
      isLoading: true,
      abortController: controller,
      messages: s.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              skill_runs: [
                ...(m.skill_runs || []),
                {
                  run_id: tempRunId,
                  skill_id: skillId,
                  status: "pending",
                  trace_events: [],
                },
              ],
            }
          : m
      ),
    }));

    let currentRunId = tempRunId;

    try {
      const response = await chatService.invokeSkill(
        sessionId,
        {
          skill_id: skillId,
          input,
          origin_message_id: messageId,
        },
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSsePayloads(buffer);
        buffer = parsed.rest;

        for (const payload of parsed.payloads) {
          if (!payload) continue;

          try {
            const event = JSON.parse(payload);

            if (event.type === "skill_run_started") {
              const runId = String(event.data?.run_id || currentRunId);
              currentRunId = runId;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === messageId
                    ? {
                        ...m,
                        skill_runs: (m.skill_runs || []).map((run) =>
                          run.run_id === tempRunId
                            ? {
                                ...run,
                                run_id: runId,
                                skill_id: skillId,
                                status: "running",
                              }
                            : run
                        ),
                      }
                    : m
                ),
              }));
            } else if (event.type === "skill_progress") {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === messageId
                    ? appendRunOrUpdate(m, currentRunId, (run) => ({
                        ...run,
                        skill_id: run.skill_id || skillId,
                        status: "running",
                        progress: Number(event.data?.progress || 0),
                        stage: String(event.data?.stage || ""),
                        message: String(event.data?.message || ""),
                      }))
                    : m
                ),
              }));
            } else if (event.type === "skill_trace") {
              const trace = event.data as SkillTraceEvent;
              set((s) => ({
                messages: s.messages.map((m) => {
                  if (m.id !== messageId) return m;
                  return appendRunOrUpdate(m, currentRunId, (run) => {
                    if (run.trace_events.some((item) => item.event_id === trace.event_id)) {
                      return run;
                    }
                    return {
                      ...run,
                      skill_id: run.skill_id || skillId,
                      trace_events: [...run.trace_events, trace].slice(-300),
                    };
                  });
                }),
              }));
            } else if (event.type === "skill_result") {
              completed = true;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === messageId
                    ? appendRunOrUpdate(m, currentRunId, (run) => ({
                        ...run,
                        skill_id: run.skill_id || skillId,
                        status: "completed",
                        result: event.data,
                      }))
                    : m
                ),
              }));
            } else if (event.type === "skill_error") {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === messageId
                    ? appendRunOrUpdate(m, currentRunId, (run) => ({
                        ...run,
                        skill_id: run.skill_id || skillId,
                        status: "failed",
                        error: String(event.data?.message || "技能执行失败"),
                      }))
                    : m
                ),
              }));
            } else if (event.type === "done") {
              completed = true;
            }
          } catch {
            // no-op
          }
        }
      }

      if (!completed) {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? appendRunOrUpdate(m, currentRunId, (run) => ({
                  ...run,
                  skill_id: run.skill_id || skillId,
                  status: "failed",
                  error: run.error || "技能执行中断",
                }))
              : m
          ),
        }));
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId
            ? appendRunOrUpdate(m, currentRunId, (run) => ({
                ...run,
                skill_id: run.skill_id || skillId,
                status: aborted ? "cancelled" : "failed",
                error: aborted ? "已停止执行" : "技能执行请求失败",
              }))
            : m
        ),
      }));
    } finally {
      set({ isLoading: false, abortController: null });
    }
  },
}));
