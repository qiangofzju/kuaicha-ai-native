"use client";

import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "@/services/api";
import { useAgentStore } from "@/stores/agentStore";
import type { AgentTraceEvent } from "@/types/agent";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const COMPLETE_FETCH_DELAY_MS = 900;

export function useAgentWebSocket(taskId: string | null, agentId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const completeTimer = useRef<ReturnType<typeof setTimeout>>();
  const completionPending = useRef(false);

  const updateProgress = useAgentStore((s) => s.updateProgress);
  const appendStreamContent = useAgentStore((s) => s.appendStreamContent);
  const appendTraceEvent = useAgentStore((s) => s.appendTraceEvent);
  const setTaskStatus = useAgentStore((s) => s.setTaskStatus);
  const fetchResult = useAgentStore((s) => s.fetchResult);

  const cleanup = useCallback(() => {
    completionPending.current = false;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }
    if (completeTimer.current) {
      clearTimeout(completeTimer.current);
      completeTimer.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (id: string) => {
      cleanup();

      const url = getWsUrl(`/ws/agent/${id}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "agent_progress") {
            const data = msg.data;
            updateProgress({
              progress: data.progress ?? 0,
              stage: data.stage ?? "",
              message: data.message ?? "",
              stageIndex: data.stageIndex,
              totalStages: data.totalStages,
            });
          } else if (msg.type === "agent_stream") {
            // Streaming text chunk from LLM analysis
            appendStreamContent(msg.data?.content ?? "");
          } else if (msg.type === "agent_trace") {
            const data = msg.data ?? {};
            if (typeof data.event_id === "string") {
              appendTraceEvent({
                event_id: String(data.event_id),
                ts: String(data.ts ?? ""),
                stage: String(data.stage ?? ""),
                stage_index: Number(data.stage_index ?? 0),
                kind: data.kind ?? "info",
                title: String(data.title ?? ""),
                detail: String(data.detail ?? ""),
                metrics: typeof data.metrics === "object" && data.metrics
                  ? data.metrics
                  : {},
                status: data.status ?? "running",
              } as AgentTraceEvent);
            }
          } else if (msg.type === "agent_complete") {
            const currentAgentId = useAgentStore.getState().selectedAgent?.id;
            const shouldDelayFetch = agentId === "batch" || currentAgentId === "batch";

            if (shouldDelayFetch) {
              completionPending.current = true;
              completeTimer.current = setTimeout(() => {
                setTaskStatus("completed");
                fetchResult(id);
                completionPending.current = false;
                cleanup();
              }, COMPLETE_FETCH_DELAY_MS);
            } else {
              setTaskStatus("completed");
              fetchResult(id);
              cleanup();
            }
          } else if (msg.type === "agent_error") {
            setTaskStatus("failed");
            cleanup();
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      ws.onclose = () => {
        // Only reconnect if we still have a valid task
        const currentTaskId = useAgentStore.getState().currentTaskId;
        const currentStatus = useAgentStore.getState().taskStatus;

        if (
          currentTaskId === id &&
          !completionPending.current &&
          currentStatus === "running" &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(() => {
            connect(id);
          }, RECONNECT_DELAY);
        }
      };
    },
    [agentId, cleanup, updateProgress, appendStreamContent, appendTraceEvent, setTaskStatus, fetchResult],
  );

  useEffect(() => {
    if (taskId) {
      connect(taskId);
    }

    return () => {
      cleanup();
    };
  }, [taskId, connect, cleanup]);
}
