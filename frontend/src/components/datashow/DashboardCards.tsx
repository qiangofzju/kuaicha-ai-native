"use client";

import React from "react";
import type { OverviewCard } from "@/types/datashow";
import { MiniChart } from "./MiniChart";

interface DashboardCardsProps {
  cards: OverviewCard[];
}

export function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px] mb-6">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="relative overflow-hidden p-[18px] rounded-[14px] border opacity-0 animate-fadeIn hover:-translate-y-[3px] transition-all duration-300"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--card-shadow)", animationDelay: `${i * 0.06}s` }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--card-hover-shadow)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--card-inset), var(--card-shadow)"; }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-30" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-white/46">{card.label}</span>
            <span
              className="text-[11px] font-medium"
              style={{
                color: card.trend_up ? "#34D399" : "#EF4444",
              }}
            >
              {card.trend_up ? "\u2191" : "\u2193"} {card.change}
            </span>
          </div>

          <div
            className="text-[30px] leading-none font-semibold mb-3 tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            {card.value}
          </div>

          <MiniChart data={card.trend_data} color={card.color} />
        </div>
      ))}
    </div>
  );
}
