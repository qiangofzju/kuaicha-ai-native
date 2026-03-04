"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { AgentGrid } from "@/components/agent/AgentGrid";
import { theme } from "@/styles/theme";
import { Icons } from "@/components/shared/Icons";
import type { AgentDefinition } from "@/types/agent";

export default function AgentListPage() {
  const agents = useAgentStore((s) => s.agents);
  const loadingAgents = useAgentStore((s) => s.loadingAgents);
  const loadAgents = useAgentStore((s) => s.loadAgents);
  const reset = useAgentStore((s) => s.reset);
  const [activeFilter, setActiveFilter] = useState("全部");

  useEffect(() => {
    reset();
    loadAgents();
  }, [loadAgents, reset]);

  // Fallback to theme agents if backend returned empty
  const displayAgents = useMemo(
    () => (
      agents.length > 0
        ? agents
        : loadingAgents
          ? []
          : (theme.agents as unknown as AgentDefinition[])
    ),
    [agents, loadingAgents],
  );
  const moduleAccent = theme.colors.modules.agent;

  // Extract unique tags from agents, prepend "全部"
  const filterTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const a of displayAgents) {
      for (const t of a.tags) tagSet.add(t);
    }
    return ["全部", ...Array.from(tagSet)];
  }, [displayAgents]);

  // Filter agents by selected tag
  const filteredAgents = useMemo(() => {
    if (activeFilter === "全部") return displayAgents;
    return displayAgents.filter((a) => a.tags.includes(activeFilter));
  }, [displayAgents, activeFilter]);

  return (
    <div className="h-full overflow-y-auto p-6 animate-fadeIn">
      <div className="max-w-[1200px] mx-auto">
        <div
          className="relative overflow-hidden p-7 rounded-[20px] border mb-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_52px_rgba(0,0,0,0.36)]"
          style={{
            background: `linear-gradient(135deg, ${moduleAccent}18, rgba(255,255,255,0.018))`,
            borderColor: `${moduleAccent}42`,
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-[180px] h-[180px] rounded-full"
            style={{ background: `radial-gradient(circle, ${moduleAccent}20, transparent 70%)` }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: moduleAccent }}><Icons.Sparkle size={14} /></span>
              <span className="text-[11px] font-medium tracking-[0.5px]" style={{ color: moduleAccent }}>AGENT WORKBENCH</span>
            </div>
            <h2 className="text-[20px] font-bold text-white mb-1.5">选择智能体，一步到位完成任务</h2>
            <p className="text-[13px] text-white/40 max-w-[520px]">
              每个 Agent 针对特定场景深度优化，自动完成从数据采集到报告交付的全流程
            </p>
          </div>
        </div>

        {/* ── Premium Filter Bar ── */}
        <div className="relative mb-5">
          <div
            className="relative rounded-[14px] border overflow-hidden"
            style={{
              background: "var(--filter-bar-bg)",
              borderColor: "var(--filter-bar-border)",
              boxShadow: "var(--filter-bar-shadow)",
            }}
          >
            {/* Scroll fade — left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, var(--bg-fade-color) 0%, transparent 100%)" }}
            />
            {/* Scroll fade — right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to left, var(--bg-fade-color) 0%, transparent 100%)" }}
            />

            <div
              className="no-scrollbar flex items-center gap-1.5 overflow-x-auto"
              style={{ padding: "10px 18px" }}
            >
              {/* Filter label button */}
              <div
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border mr-1"
                style={{
                  background: `${moduleAccent}12`,
                  borderColor: `${moduleAccent}30`,
                  color: moduleAccent,
                  boxShadow: `0 0 10px ${moduleAccent}18`,
                }}
              >
                <Icons.Filter size={12} />
                <span className="text-[11.5px] font-semibold tracking-wide">筛选</span>
              </div>

              {/* Divider */}
              <div
                className="w-px h-4 shrink-0 mx-0.5"
                style={{ background: "rgba(128,145,176,0.15)" }}
              />

              {/* Tag chips */}
              {filterTags.map((tag) => {
                const isActive = tag === activeFilter;
                const count =
                  tag === "全部"
                    ? displayAgents.length
                    : displayAgents.filter((a) => a.tags.includes(tag)).length;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveFilter(tag)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border text-[11.5px] font-medium transition-all duration-200"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${moduleAccent}26, ${moduleAccent}0e)`
                        : "var(--filter-chip-bg)",
                      borderColor: isActive
                        ? `${moduleAccent}52`
                        : "rgba(128,145,176,0.10)",
                      color: isActive ? moduleAccent : "var(--filter-chip-text)",
                      boxShadow: isActive
                        ? `0 0 18px ${moduleAccent}2c, inset 0 1px 0 rgba(255,255,255,0.10)`
                        : "none",
                      transform: isActive ? "translateY(-0.5px)" : "none",
                    }}
                  >
                    {tag}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-[5px] font-normal min-w-[18px] text-center tabular-nums"
                      style={{
                        background: isActive
                          ? `${moduleAccent}22`
                          : "var(--filter-count-bg)",
                        color: isActive
                          ? `${moduleAccent}dd`
                          : "var(--filter-count-text)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agent grid */}
        <AgentGrid agents={filteredAgents} loading={loadingAgents} />
      </div>
    </div>
  );
}
