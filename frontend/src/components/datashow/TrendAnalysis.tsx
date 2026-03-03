"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { datashowService } from "@/services/datashowService";
import type { TrendResponse } from "@/types/datashow";

export function TrendAnalysis() {
  const [input, setInput] = useState("同花顺, 东方财富, 大智慧");
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const companies = input
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (companies.length === 0 || loading) return;
    setLoading(true);
    try {
      const data = await datashowService.getTrends(companies);
      setTrendData(data);
    } catch {
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  };

  const option = useMemo(() => {
    if (!trendData) return null;

    const months = trendData.months.map((m) => {
      const month = parseInt(m.split("-")[1], 10);
      return `${month}月`;
    });

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: "rgba(255,255,255,0.5)",
        fontFamily: "var(--font-geist-sans), 'Noto Sans SC', sans-serif",
      },
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(10, 14, 26, 0.95)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        textStyle: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
      },
      legend: {
        data: trendData.series.map((s) => s.name),
        textStyle: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
        top: 0,
        right: 0,
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "3%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: months,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value" as const,
        name: "风险评分",
        nameTextStyle: { color: "rgba(255,255,255,0.35)", fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
      },
      series: trendData.series.map((s) => ({
        name: s.name,
        type: "line" as const,
        smooth: true,
        data: s.data,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        symbolSize: 6,
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${s.color}20` },
              { offset: 1, color: `${s.color}00` },
            ],
          },
        },
      })),
    };
  }, [trendData]);

  return (
    <div className="p-5 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_42px_rgba(0,0,0,0.28)]">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70">多企业趋势对比</h3>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="输入企业名（逗号分隔）"
            className="w-64 px-3 py-2 rounded-lg text-[13px] bg-white/[0.045] border border-white/[0.1] text-white/70 placeholder:text-white/25 outline-none focus:border-datashow/35 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-datashow/22 text-datashow hover:bg-datashow/32 transition-colors disabled:opacity-40"
          >
            {loading ? "加载中..." : "对比"}
          </button>
        </div>
      </div>

      {/* Chart or placeholder */}
      {option ? (
        <ReactECharts
          option={option}
          style={{ height: 280, width: "100%" }}
          opts={{ renderer: "svg" }}
          notMerge
        />
      ) : (
        <div className="flex items-center justify-center h-[280px] text-white/20 text-sm">
          输入企业名称进行趋势对比分析
        </div>
      )}
    </div>
  );
}
