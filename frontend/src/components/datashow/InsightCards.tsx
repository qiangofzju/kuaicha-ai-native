"use client";

import React from "react";
import { getAgentIcon } from "@/components/shared/Icons";
import type { InsightItem } from "@/types/datashow";

interface InsightCardsProps {
  insights: InsightItem[];
}

const typeAccent: Record<string, { border: string; bg: string; text: string }> = {
  warning: {
    border: "border-risk-medium/30",
    bg: "bg-risk-medium/10",
    text: "text-risk-medium",
  },
  info: {
    border: "border-chat/30",
    bg: "bg-chat/10",
    text: "text-chat",
  },
  success: {
    border: "border-datashow/30",
    bg: "bg-datashow/10",
    text: "text-datashow",
  },
};

export function InsightCards({ insights }: InsightCardsProps) {
  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/70">AI 洞察摘要</h3>
        <button className="text-[11px] text-white/30 hover:text-white/50 transition-colors">刷新</button>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, i) => {
          const accent = typeAccent[insight.type] || typeAccent.info;
          const IconComponent = getAgentIcon(insight.icon);

          return (
            <div
              key={insight.title}
              className={`p-4 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] border ${accent.border} opacity-0 animate-fadeIn hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300`}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg ${accent.bg} flex items-center justify-center shrink-0`}
                >
                  <IconComponent className={accent.text} size={16} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-white/80 mb-1">
                    {insight.title}
                  </div>
                  <div className="text-[11px] text-white/40 leading-relaxed">
                    {insight.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
