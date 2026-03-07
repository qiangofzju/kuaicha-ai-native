"use client";

import { useEffect, useRef } from "react";
import type { SkillTraceEvent } from "@/types/skill";
import { TraceEventItem } from "./TraceEventItem";

interface TraceTimelineProps {
  events: SkillTraceEvent[];
}

export function TraceTimeline({ events }: TraceTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  return (
    <div ref={containerRef} className="max-h-[600px] overflow-y-auto pr-1">
      <div className="relative pl-5">
        {/* Vertical timeline line */}
        <div
          className="absolute left-[7px] top-3 bottom-3 w-[2px]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <div className="space-y-3">
          {events.length === 0 && (
            <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-3 text-[12px] text-white/40">
              等待执行事件...
            </div>
          )}
          {events.map((event, idx) => (
            <div key={event.event_id} className="relative">
              {/* Timeline connector dot */}
              <div
                className="absolute -left-5 top-3 w-[10px] h-[10px] rounded-full border-2"
                style={{
                  borderColor: event.status === "done" ? "#10B981"
                    : event.status === "warning" ? "#F59E0B"
                    : event.status === "error" ? "#EF4444"
                    : "rgba(255,255,255,0.25)",
                  background: event.status === "done" ? "#10B981"
                    : event.status === "running" && idx === events.length - 1 ? "rgba(255,255,255,0.25)"
                    : "var(--bg-root, #06080f)",
                }}
              />
              <TraceEventItem event={event} isLatest={idx === events.length - 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
