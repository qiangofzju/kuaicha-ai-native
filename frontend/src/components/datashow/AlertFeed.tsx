"use client";

import React from "react";
import type { AlertItem } from "@/types/datashow";

interface AlertFeedProps {
  alerts: AlertItem[];
}

const levelColors: Record<string, { dot: string; text: string }> = {
  high: { dot: "bg-risk-high", text: "text-risk-high" },
  medium: { dot: "bg-risk-medium", text: "text-risk-medium" },
  low: { dot: "bg-risk-low", text: "text-risk-low" },
  info: { dot: "bg-chat", text: "text-chat" },
};

export function AlertFeed({ alerts }: AlertFeedProps) {
  return (
    <div className="p-5 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_42px_rgba(0,0,0,0.28)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-medium text-white/70">实时预警</h3>
        <span className="text-[10px] text-datashow flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-datashow" /> LIVE
        </span>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 scrollbar-thin">
        {alerts.map((alert, i) => {
          const colors = levelColors[alert.level] || levelColors.info;
          return (
            <div
              key={`${alert.company}-${i}`}
              className="flex items-start gap-2.5 p-2.5 rounded-[10px] bg-white/[0.03] border border-white/[0.08] opacity-0 animate-slideIn"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Level dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors.dot}`}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-white/70 truncate">
                  {alert.company}
                </div>
                <div className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                  {alert.event}
                </div>
              </div>

              {/* Time */}
              <span className="text-[10px] text-white/25 shrink-0 whitespace-nowrap">
                {alert.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
