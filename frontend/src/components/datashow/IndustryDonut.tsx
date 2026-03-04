"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { IndustrySegment } from "@/types/datashow";

interface IndustryDonutProps {
  data: IndustrySegment[];
}

export function IndustryDonut({ data }: IndustryDonutProps) {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );

  const option = useMemo(() => {
    return {
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: "var(--font-geist-sans), 'Noto Sans SC', sans-serif",
      },
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "var(--tooltip-bg)",
        borderColor: "var(--tooltip-border)",
        borderWidth: 1,
        textStyle: {
          color: "var(--tooltip-text)",
          fontSize: 12,
        },
        formatter: (params: { name: string; value: number; percent: number }) => {
          return `<span style="font-weight:600">${params.name}</span><br/>${params.value} 家 (${params.percent}%)`;
        },
      },
      legend: {
        orient: "vertical" as const,
        right: "5%",
        top: "center",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 14,
        textStyle: {
          color: "var(--chart-axis-color)",
          fontSize: 11,
        },
        formatter: (name: string) => {
          const item = data.find((d) => d.label === name);
          return item ? `${name}  ${item.percentage}` : name;
        },
      },
      series: [
        {
          type: "pie" as const,
          radius: ["52%", "72%"],
          center: ["35%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderColor: "var(--chart-donut-border)",
            borderWidth: 2,
            borderRadius: 4,
          },
          label: {
            show: true,
            position: "center" as const,
            formatter: () => {
              return `{total|${total.toLocaleString()}}\n{label|监控企业}`;
            },
            rich: {
              total: {
                fontSize: 22,
                fontWeight: 700 as const,
                color: "var(--text-main)",
                lineHeight: 30,
                fontFamily: "var(--font-geist-sans), 'Noto Sans SC', sans-serif",
              },
              label: {
                fontSize: 11,
                color: "var(--text-weak)",
                lineHeight: 18,
              },
            },
          },
          emphasis: {
            label: { show: true },
            scaleSize: 6,
          },
          data: data.map((d) => ({
            name: d.label,
            value: d.value,
            itemStyle: { color: d.color },
          })),
        },
      ],
    };
  }, [data, total]);

  return (
    <div className="p-5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/70">行业分布</h3>
      </div>

      {/* ECharts donut */}
      <ReactECharts
        option={option}
        style={{ height: 220, width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge
      />
    </div>
  );
}
