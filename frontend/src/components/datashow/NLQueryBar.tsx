"use client";

import React, { useState } from "react";
import { Icons } from "@/components/shared/Icons";
import { useDatashowStore } from "@/stores/datashowStore";

const SUGGESTIONS = [
  "企业风险等级分布",
  "月度风险趋势变化",
  "行业分布占比",
  "标杆企业多维对比",
  "高风险企业排名",
  "企业地域分布",
];

export function NLQueryBar() {
  const [query, setQuery] = useState("");
  const { nlLoading, submitNLQuery } = useDatashowStore();

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || nlLoading) return;
    submitNLQuery(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleSuggestion = (text: string) => {
    setQuery(text);
    submitNLQuery(text);
  };

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden flex items-center gap-3 px-[18px] py-3 rounded-[14px] surface-elevated transition-colors focus-within:border-datashow/35">
        <Icons.Sparkle className="text-datashow shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="用自然语言描述你想看的图表，例如：把这批企业按风险分布画出来"
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-white/74 placeholder:text-white/28"
        />
        <button
          onClick={handleSubmit}
          disabled={nlLoading || !query.trim()}
          className="px-4 py-[8px] rounded-[9px] text-[12.5px] font-medium bg-datashow text-white hover:opacity-95 transition-colors disabled:opacity-40 disabled:cursor-default shadow-[0_10px_22px_rgba(210,174,103,0.32)]"
        >
          {nlLoading ? "生成中..." : "生成"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            className="px-2.5 py-1 rounded-md text-[11.5px] text-white/40 bg-white/[0.03] border border-white/[0.08] hover:text-white/62 hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
