"use client";

import type { RiskDetail } from "@/types/chat";

const LEVEL_CONFIG = {
  high: {
    label: "高风险",
    color: "text-risk-high",
    bg: "bg-risk-high/10",
    dot: "bg-risk-high",
    border: "border-risk-high/20",
  },
  medium: {
    label: "中风险",
    color: "text-risk-medium",
    bg: "bg-risk-medium/10",
    dot: "bg-risk-medium",
    border: "border-risk-medium/20",
  },
  low: {
    label: "低风险",
    color: "text-risk-low",
    bg: "bg-risk-low/10",
    dot: "bg-risk-low",
    border: "border-risk-low/20",
  },
};

interface RiskCardProps {
  details: RiskDetail[];
}

export function RiskCard({ details }: RiskCardProps) {
  if (!details || details.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl surface-elevated overflow-hidden animate-fadeIn">
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-chat" />
        <span className="text-[11px] text-white/40 font-medium tracking-wide uppercase">
          风险摘要
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {details.map((detail, i) => {
          const cfg = LEVEL_CONFIG[detail.level];
          return (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-[12px] text-white/50 shrink-0 w-[80px]">
                  {detail.label}
                </span>
                <span className="text-[13px] text-white/80 truncate">
                  {detail.value}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ml-3 ${cfg.color} ${cfg.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
