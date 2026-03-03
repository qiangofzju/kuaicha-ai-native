"use client";

import React from "react";
import { useGraphExplorerStore } from "@/stores/graphExplorerStore";
import { useExplorerWebSocket } from "@/hooks/useExplorerWebSocket";
import { ExplorerQueryInput } from "./ExplorerQueryInput";
import { ExplorerProgress } from "./ExplorerProgress";
import { VisualizationBlock } from "./VisualizationBlock";
import { theme } from "@/styles/theme";

const MODULE_ACCENT = theme.colors.modules.datashow;

export function RelationshipExplorer() {
  const currentTaskId = useGraphExplorerStore((s) => s.currentTaskId);
  const taskStatus = useGraphExplorerStore((s) => s.taskStatus);
  const result = useGraphExplorerStore((s) => s.result);
  const error = useGraphExplorerStore((s) => s.error);
  const loadingResult = useGraphExplorerStore((s) => s.loadingResult);
  const queryHistory = useGraphExplorerStore((s) => s.queryHistory);
  const drillDown = useGraphExplorerStore((s) => s.drillDown);
  const submitQuery = useGraphExplorerStore((s) => s.submitQuery);
  const cancelExecution = useGraphExplorerStore((s) => s.cancelExecution);

  // Connect WebSocket for current task
  useExplorerWebSocket(
    taskStatus === "running" ? currentTaskId : null,
  );

  const isRunning = taskStatus === "pending" || taskStatus === "running";
  const showResult = result && taskStatus === "completed";

  return (
    <div className="animate-fadeIn">
      {/* Query input */}
      <ExplorerQueryInput />

      {/* Error state */}
      {error && !isRunning && (
        <div className="mb-6 p-4 rounded-2xl bg-risk-high/10 border border-risk-high/20">
          <p className="text-sm text-risk-high">{error}</p>
        </div>
      )}

      {/* Progress (during execution) */}
      <ExplorerProgress onStop={cancelExecution} />

      {/* Loading result */}
      {loadingResult && (
        <div className="mb-6 flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-datashow/40 border-t-datashow rounded-full animate-spin" />
            <span className="text-[13px] text-white/44">正在加载结果...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {showResult && (
        <div className="animate-fadeIn">
          {/* Query interpretation + Entity tags */}
          <div className="mb-5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[13px] text-white/46 mb-2">
              <span className="text-datashow/60 font-medium">Agent 理解：</span>
              {result.query_interpretation}
            </p>
            {result.relationship_summary && (
              <p className="text-[13px] text-white/40 mb-3">
                {result.relationship_summary}
              </p>
            )}
            {result.entities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.entities.map((entity, i) => (
                  <button
                    key={i}
                    onClick={() => drillDown(entity.name)}
                    className="px-2.5 py-1 rounded-md text-[11px] border transition-colors hover:bg-white/[0.04] cursor-pointer"
                    style={{
                      borderColor: entityColor(entity.type, 0.2),
                      color: entityColor(entity.type, 0.7),
                      background: entityColor(entity.type, 0.05),
                    }}
                  >
                    {entity.name}
                    <span className="ml-1 opacity-50">{entityLabel(entity.type)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visualization grid */}
          <div className={`grid gap-4 mb-5 ${
            result.visualizations.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 2xl:grid-cols-2"
          }`}>
            {result.visualizations.map((viz, i) => (
              <VisualizationBlock
                key={i}
                block={viz}
                onNodeClick={drillDown}
              />
            ))}
          </div>

          {/* Data sources */}
          {result.data_sources.length > 0 && (
            <div className="mb-5 flex items-center gap-2 text-[11px] text-white/20">
              <span>数据来源：</span>
              {result.data_sources.map((src, i) => (
                <span key={i}>
                  {src}{i < result.data_sources.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idle state — no result, not running */}
      {!showResult && !isRunning && !loadingResult && !error && (
        <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: `${MODULE_ACCENT}14`,
              border: `1px solid ${MODULE_ACCENT}2b`,
            }}
          >
            <span className="text-2xl text-datashow/40">◎</span>
          </div>
          <h3 className="text-[15px] font-medium text-white/50 mb-2">
            企业关系图谱探索
          </h3>
          <p className="text-[13px] text-white/28 mb-6 text-center max-w-[360px]">
            通过自然语言查询企业与人物之间的关系网络，AI 将自动搜索数据并选择最佳可视化方式
          </p>

          {/* Quick start suggestions */}
          <div className="flex flex-wrap justify-center gap-2">
            {["马云的商业版图", "腾讯和阿里的竞争关系", "同花顺股权穿透"].map((s) => (
              <button
                key={s}
                onClick={() => submitQuery(s)}
                className="px-3 py-1.5 rounded-lg text-[11.5px] text-datashow/42 bg-datashow/[0.04] border border-datashow/[0.1] hover:text-datashow/60 hover:bg-datashow/[0.08] transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query history (collapsible) */}
      {queryHistory.length > 0 && !isRunning && (
        <QueryHistory
          history={queryHistory}
          onSelect={(q) => submitQuery(q)}
        />
      )}
    </div>
  );
}

// -- Helpers --

function entityColor(type: string, alpha: number): string {
  const colors: Record<string, string> = {
    person: `rgba(210,174,103,${alpha})`,
    company: `rgba(74,158,255,${alpha})`,
    event: `rgba(249,115,22,${alpha})`,
    organization: `rgba(167,139,250,${alpha})`,
  };
  return colors[type] || `rgba(255,255,255,${alpha})`;
}

function entityLabel(type: string): string {
  const labels: Record<string, string> = {
    person: "人物",
    company: "企业",
    event: "事件",
    organization: "机构",
  };
  return labels[type] || type;
}

// -- Query History sub-component --

function QueryHistory({
  history,
  onSelect,
}: {
  history: { query: string; timestamp: string; status: string }[];
  onSelect: (query: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="mt-6 pt-5 border-t border-white/[0.04]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/40 transition-colors mb-3"
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
          ▸
        </span>
        查询历史 ({history.length})
      </button>
      {expanded && (
        <div className="space-y-1.5 animate-fadeIn">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => onSelect(h.query)}
              className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-white/36 hover:text-white/55 hover:bg-white/[0.02] transition-colors flex items-center justify-between"
            >
              <span className="truncate">{h.query}</span>
              <span className="text-[10px] text-white/15 ml-2 flex-shrink-0">
                {new Date(h.timestamp).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
