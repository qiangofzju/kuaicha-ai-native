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
    <div className="mb-6 p-5 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] border border-white/[0.1] animate-fadeIn shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_36px_rgba(0,0,0,0.24)]">
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
