"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { datashowService } from "@/services/datashowService";
import type { GraphResponse } from "@/types/datashow";

const CATEGORY_COLORS: Record<string, string> = {
  "核心企业": "#4A9EFF",
  "子公司": "#A78BFA",
  "自然人": "#34D399",
  "投资方": "#F59E0B",
  "合作方": "#F97316",
  "竞争对手": "#EF4444",
};

export function RelationshipGraph() {
  const [company, setCompany] = useState("");
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const trimmed = company.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const data = await datashowService.getGraph(trimmed);
      setGraphData(data);
    } catch {
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  };

  const option = useMemo(() => {
    if (!graphData) return null;

    const categories = graphData.categories.map((name) => ({
      name,
      itemStyle: { color: CATEGORY_COLORS[name] || "#6B7280" },
    }));

    const nodes = graphData.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      symbolSize: n.symbol_size,
      category: graphData.categories.indexOf(n.category),
      label: {
        show: true,
        fontSize: n.symbol_size > 40 ? 13 : 10,
        color: "var(--text-main)",
      },
      itemStyle: {
        color: CATEGORY_COLORS[n.category] || "#6B7280",
        borderColor: "var(--chart-axis-line)",
        borderWidth: 1,
      },
    }));

    const edges = graphData.edges.map((e) => ({
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
      },
      legend: {
        data: graphData.categories,
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
          repulsion: 280,
          gravity: 0.1,
          edgeLength: [80, 160],
          layoutAnimation: true,
        },
        emphasis: {
          focus: "adjacency",
          lineStyle: { width: 3 },
        },
      }],
    };
  }, [graphData]);

  return (
    <div className="p-5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70">企业关系图谱</h3>
        <div className="flex items-center gap-2">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="输入企业名称"
            className="w-44 px-2.5 py-1.5 rounded-lg text-[12px] bg-white/[0.045] border border-white/[0.1] text-white/70 placeholder:text-white/25 outline-none focus:border-datashow/35 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !company.trim()}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-datashow/22 text-datashow hover:bg-datashow/32 transition-colors disabled:opacity-40"
          >
            {loading ? "查询中..." : "查询"}
          </button>
        </div>
      </div>

      {/* Graph or placeholder */}
      {option ? (
        <ReactECharts
          option={option}
          style={{ height: 420, width: "100%" }}
          opts={{ renderer: "svg" }}
          notMerge
        />
      ) : (
        <div className="flex items-center justify-center h-[420px] text-white/20 text-sm">
          输入企业名称查询关系图谱
        </div>
      )}
    </div>
  );
}
