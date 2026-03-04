"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { RiskTrendBar } from "@/types/datashow";

interface RiskTrendChartProps {
  data: RiskTrendBar[];
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const option = useMemo(() => {
    const months = data.map((d) => {
      // Format "2025-09" -> "9月"
      const month = parseInt(d.month.split("-")[1], 10);
      return `${month}月`;
    });

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: "var(--chart-axis-color)",
        fontFamily: "var(--font-geist-sans), 'Noto Sans SC', sans-serif",
      },
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "var(--tooltip-bg)",
        borderColor: "var(--tooltip-border)",
        borderWidth: 1,
        textStyle: {
          color: "var(--tooltip-text)",
          fontSize: 12,
        },
        axisPointer: {
          type: "shadow" as const,
          shadowStyle: {
            color: "rgba(255,255,255,0.03)",
          },
        },
      },
      legend: {
        show: false, // We render a custom legend in the header
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "3%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: months,
        axisLine: {
          lineStyle: { color: "var(--chart-axis-line)" },
        },
        axisLabel: {
          color: "var(--chart-axis-color)",
          fontSize: 11,
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value" as const,
        axisLine: { show: false },
        axisLabel: {
          color: "var(--chart-axis-color)",
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: "var(--chart-grid-color)" },
        },
      },
      series: [
        {
          name: "高风险",
          type: "bar" as const,
          stack: "risk",
          data: data.map((d) => d.high),
          itemStyle: {
            color: "#EF4444",
            borderRadius: [0, 0, 0, 0],
          },
          barWidth: "40%",
        },
        {
          name: "中风险",
          type: "bar" as const,
          stack: "risk",
          data: data.map((d) => d.medium),
          itemStyle: {
            color: "#F59E0B",
          },
        },
        {
          name: "低风险",
          type: "bar" as const,
          stack: "risk",
          data: data.map((d) => d.low),
          itemStyle: {
            color: "#10B981",
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [data]);

  return (
    <div className="p-6 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white mb-1">风险趋势分布</h3>
          <p className="text-[12px] text-white/30">近12个月风险事件趋势 · 按风险等级分类</p>
        </div>
        <div className="flex gap-3 text-[11px] text-white/52">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-risk-high" />
            高风险
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-risk-medium" />
            中风险
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-risk-low" />
            低风险
          </span>
        </div>
      </div>

      {/* ECharts bar chart */}
      <ReactECharts
        option={option}
        style={{ height: 220, width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge
      />
    </div>
  );
}
