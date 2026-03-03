"use client";

import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "@/services/api";
import { useGraphExplorerStore } from "@/stores/graphExplorerStore";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useExplorerWebSocket(taskId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const updateProgress = useGraphExplorerStore((s) => s.updateProgress);
  const appendStreamContent = useGraphExplorerStore((s) => s.appendStreamContent);
  const setTaskStatus = useGraphExplorerStore((s) => s.setTaskStatus);
  const fetchResult = useGraphExplorerStore((s) => s.fetchResult);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
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
            appendStreamContent(msg.data?.content ?? "");
          } else if (msg.type === "agent_complete") {
            setTaskStatus("completed");
            fetchResult(id);
            cleanup();
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
        const currentTaskId = useGraphExplorerStore.getState().currentTaskId;
        const currentStatus = useGraphExplorerStore.getState().taskStatus;

        if (
          currentTaskId === id &&
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
    [cleanup, updateProgress, appendStreamContent, setTaskStatus, fetchResult],
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
