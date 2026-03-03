"use client";

import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: "high" | "medium" | "low";
  className?: string;
}

const config = {
  high: { label: "高风险", color: "text-risk-high", bg: "bg-risk-high/10", dot: "bg-risk-high" },
  medium: { label: "中风险", color: "text-risk-medium", bg: "bg-risk-medium/10", dot: "bg-risk-medium" },
  low: { label: "低风险", color: "text-risk-low", bg: "bg-risk-low/10", dot: "bg-risk-low" },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const c = config[level] ?? config.medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium", c.color, c.bg, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
