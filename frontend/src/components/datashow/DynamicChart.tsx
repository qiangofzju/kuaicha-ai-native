"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import type { NLChartResponse } from "@/types/datashow";
import { useDatashowStore } from "@/stores/datashowStore";

interface DynamicChartProps {
  chart: NLChartResponse;
}

export function DynamicChart({ chart }: DynamicChartProps) {
  const { clearNLChart } = useDatashowStore();

  return (
    <div className="mb-6 p-5 rounded-2xl border animate-fadeIn" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-white/70">{chart.title}</h3>
        <button
          onClick={clearNLChart}
          className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
        >
          清除
        </button>
      </div>
      <p className="text-[11px] text-white/35 mb-4">{chart.description}</p>

      {/* ECharts */}
      <ReactECharts
        option={chart.echarts_option}
        style={{ height: chart.chart_type === "radar" ? 320 : 280, width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge
      />
    </div>
  );
}
