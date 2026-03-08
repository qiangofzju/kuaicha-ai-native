"use client";

import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "@/services/api";
import { useSkillStore } from "@/stores/skillStore";
import type { SkillTraceEvent } from "@/types/skill";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useSkillWebSocket(taskId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const watchdogTimer = useRef<ReturnType<typeof setInterval>>();
  const lastEventAt = useRef<number>(Date.now());

  const updateProgress = useSkillStore((s) => s.updateProgress);
  const appendStreamContent = useSkillStore((s) => s.appendStreamContent);
  const appendTraceEvent = useSkillStore((s) => s.appendTraceEvent);
  const setTaskStatus = useSkillStore((s) => s.setTaskStatus);
  const fetchResult = useSkillStore((s) => s.fetchResult);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }
    if (watchdogTimer.current) {
      clearInterval(watchdogTimer.current);
      watchdogTimer.current = undefined;
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
      const ws = new WebSocket(getWsUrl(`/ws/skills/runs/${id}`));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        lastEventAt.current = Date.now();
        watchdogTimer.current = setInterval(() => {
          if (Date.now() - lastEventAt.current > 10_000) {
            setTaskStatus("failed");
            cleanup();
          }
        }, 1500);
      };

      ws.onmessage = (event) => {
        lastEventAt.current = Date.now();
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "skill_heartbeat") {
            return;
          }
          if (msg.type === "skill_progress") {
            const data = msg.data;
            updateProgress({
              progress: data.progress ?? 0,
              stage: data.stage ?? "",
              message: data.message ?? "",
              stageIndex: data.stageIndex,
              totalStages: data.totalStages,
            });
          } else if (msg.type === "skill_stream") {
            appendStreamContent(msg.data?.content ?? "");
          } else if (msg.type === "skill_trace") {
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
                metrics: typeof data.metrics === "object" && data.metrics ? data.metrics : {},
                status: data.status ?? "running",
              } as SkillTraceEvent);
            }
          } else if (msg.type === "skill_complete") {
            const status = msg.data?.status;
            if (status === "cancelled") {
              setTaskStatus("cancelled");
            } else {
              setTaskStatus("completed");
              fetchResult(id);
            }
            cleanup();
          } else if (msg.type === "skill_error") {
            setTaskStatus("failed");
            cleanup();
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onerror = () => {
        // handled by onclose
      };

      ws.onclose = () => {
        const currentTaskId = useSkillStore.getState().currentTaskId;
        const currentStatus = useSkillStore.getState().taskStatus;

        if (
          currentTaskId === id &&
          currentStatus === "running" &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(() => connect(id), RECONNECT_DELAY);
        }
      };
    },
    [cleanup, updateProgress, appendStreamContent, appendTraceEvent, setTaskStatus, fetchResult],
  );

  useEffect(() => {
    if (taskId) connect(taskId);
    return () => cleanup();
  }, [taskId, connect, cleanup]);
}
