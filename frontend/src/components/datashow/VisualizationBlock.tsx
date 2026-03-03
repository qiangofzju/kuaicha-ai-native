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
    <div className="rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_42px_rgba(0,0,0,0.28)] overflow-hidden">
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
