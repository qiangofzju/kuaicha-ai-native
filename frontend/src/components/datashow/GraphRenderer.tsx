"use client";

import React, { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { GraphNode, GraphEdge } from "@/types/datashow";

const CATEGORY_COLORS: Record<string, string> = {
  // Standard categories
  "核心企业": "#4A9EFF",
  "子公司": "#A78BFA",
  "自然人": "#34D399",
  "投资方": "#F59E0B",
  "合作方": "#F97316",
  "竞争对手": "#EF4444",
  // Explorer categories
  "核心人物": "#06B6D4",
  "创办企业": "#4A9EFF",
  "投资平台": "#F59E0B",
  "投资企业": "#F97316",
  "关联机构": "#A78BFA",
  "关联人物": "#34D399",
  "竞争领域": "#6B7280",
  "核心": "#06B6D4",
};

// Color pool for dynamic categories
const COLOR_POOL = [
  "#06B6D4", "#4A9EFF", "#A78BFA", "#34D399", "#F59E0B",
  "#F97316", "#EF4444", "#EC4899", "#8B5CF6", "#10B981",
];

interface GraphRendererProps {
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    categories: string[];
  };
  onNodeClick?: (nodeName: string) => void;
  height?: number;
}

export function GraphRenderer({ data, onNodeClick, height = 480 }: GraphRendererProps) {
  const option = useMemo(() => {
    const categories = data.categories.map((name, i) => ({
      name,
      itemStyle: { color: CATEGORY_COLORS[name] || COLOR_POOL[i % COLOR_POOL.length] },
    }));

    const nodes = data.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      symbolSize: n.symbol_size,
      category: data.categories.indexOf(n.category),
      label: {
        show: true,
        fontSize: n.symbol_size > 40 ? 13 : n.symbol_size > 30 ? 11 : 10,
        color: "var(--text-main)",
      },
      itemStyle: {
        color: CATEGORY_COLORS[n.category] || COLOR_POOL[data.categories.indexOf(n.category) % COLOR_POOL.length],
        borderColor: "var(--chart-axis-line)",
        borderWidth: 1,
      },
    }));

    const edges = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: {
        show: true,
        formatter: e.label,
        fontSize: 9,
        color: "var(--text-weak)",
      },
      lineStyle: {
        color: "var(--canvas-node-stroke)",
        width: 1.5,
        curveness: 0.1,
      },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        backgroundColor: "var(--tooltip-bg)",
        borderColor: "var(--tooltip-border)",
        borderWidth: 1,
        textStyle: { color: "var(--tooltip-text)", fontSize: 12 },
        formatter: (params: { dataType: string; data: { name: string; category: number } }) => {
          if (params.dataType === "node") {
            const cat = data.categories[params.data.category] || "";
            return `<b>${params.data.name}</b><br/><span style="color:rgba(255,255,255,0.5)">${cat}</span>`;
          }
          return "";
        },
      },
      legend: {
        data: data.categories,
        textStyle: { color: "var(--chart-axis-color)", fontSize: 11 },
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [{
        type: "graph",
        layout: "force",
        roam: true,
        draggable: true,
        categories,
        data: nodes,
        links: edges,
        force: {
          repulsion: 300,
          gravity: 0.08,
          edgeLength: [80, 180],
          layoutAnimation: true,
        },
        emphasis: {
          focus: "adjacency",
          lineStyle: { width: 3 },
        },
      }],
    };
  }, [data]);

  const onEvents = useMemo(() => {
    if (!onNodeClick) return undefined;
    return {
      click: (params: { dataType: string; data: { name: string } }) => {
        if (params.dataType === "node" && params.data?.name) {
          onNodeClick(params.data.name);
        }
      },
    };
  }, [onNodeClick]);

  const handleClick = useCallback((params: { dataType: string; data: { name: string } }) => {
    if (onNodeClick && params.dataType === "node" && params.data?.name) {
      onNodeClick(params.data.name);
    }
  }, [onNodeClick]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      opts={{ renderer: "svg" }}
      notMerge
      onEvents={onEvents ? { click: handleClick } : undefined}
    />
  );
}
