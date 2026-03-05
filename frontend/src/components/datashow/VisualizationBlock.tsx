"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import type { VisualizationBlock as VizBlockType } from "@/types/graphExplorer";
import { GraphRenderer } from "./GraphRenderer";
import { MermaidRenderer } from "./MermaidRenderer";
import { TableRenderer } from "./TableRenderer";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  graph: { label: "关系网络", icon: "◎" },
  mermaid: { label: "结构图", icon: "▦" },
  table: { label: "数据表", icon: "▤" },
  echarts: { label: "图表", icon: "▧" },
};

interface VisualizationBlockProps {
  block: VizBlockType;
  onNodeClick?: (entityName: string) => void;
}

export function VisualizationBlock({ block, onNodeClick }: VisualizationBlockProps) {
  const typeInfo = TYPE_LABELS[block.type] || { label: block.type, icon: "◇" };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-datashow/65">{typeInfo.icon}</span>
          <span className="text-[11px] text-datashow/62 font-medium tracking-[0.06em] uppercase">
            {typeInfo.label}
          </span>
        </div>
        <h4 className="text-[14px] font-medium text-white/78">{block.title}</h4>
        {block.description && (
          <p className="text-[12px] text-white/42 mt-1">{block.description}</p>
        )}
      </div>

      <div className="px-5 pb-5">
        {block.type === "graph" && (
          <GraphRenderer
            data={block.graph_data}
            onNodeClick={onNodeClick}
            height={420}
          />
        )}

        {block.type === "mermaid" && (
          <MermaidRenderer code={block.mermaid_code} />
        )}

        {block.type === "table" && (
          <TableRenderer columns={block.columns} rows={block.rows} />
        )}

        {block.type === "echarts" && (
          <ReactECharts
            option={block.echarts_option}
            style={{ height: block.chart_type === "radar" ? 320 : 280, width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge
          />
        )}
      </div>
    </div>
  );
}
