"use client";

import React, { useState } from "react";
import { useTrendExplorerStore } from "@/stores/trendExplorerStore";
import { Icons } from "@/components/shared/Icons";

const SUGGESTIONS = [
  "同花顺近一年风险趋势",
  "比亚迪 vs 宁德时代",
  "新能源行业趋势",
  "腾讯经营指标变化",
  "蚂蚁集团风险走势",
  "医药行业发展趋势",
];

export function TrendQueryInput() {
  const [query, setQuery] = useState("");
  const submitQuery = useTrendExplorerStore((s) => s.submitQuery);
  const taskStatus = useTrendExplorerStore((s) => s.taskStatus);
  const isRunning = taskStatus === "pending" || taskStatus === "running";

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isRunning) return;
    submitQuery(trimmed);
  };

  const handleSuggestion = (suggestion: string) => {
    if (isRunning) return;
    setQuery(suggestion);
    submitQuery(suggestion);
  };

  return (
    <div className="mb-6">
      {/* Query input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Icons.TrendUp className="w-4 h-4 text-datashow/50 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="输入企业名称或趋势查询，例如：同花顺近一年风险趋势"
          disabled={isRunning}
          className="flex-1 bg-transparent text-[14px] text-white/74 placeholder:text-white/27 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isRunning || !query.trim()}
          className="px-4 py-2 rounded-[10px] text-[12.5px] font-medium transition-all disabled:opacity-40"
          style={{
            background: isRunning
              ? "rgba(210,174,103,0.12)"
              : "linear-gradient(135deg, rgba(210,174,103,0.9), rgba(210,174,103,0.72))",
            color: isRunning ? "rgba(210,174,103,0.56)" : "#fff",
          }}
        >
          {isRunning ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-datashow/40 border-t-datashow rounded-full animate-spin" />
              分析中
            </span>
          ) : (
            "分析"
          )}
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg text-[11.5px] text-white/38 bg-white/[0.03] border border-white/[0.06] hover:text-white/58 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
