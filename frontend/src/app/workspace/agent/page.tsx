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

        <div className="flex items-center gap-2.5 mb-5 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] bg-white/[0.03] border border-white/[0.08] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Icons.Filter size={14} />
            <span className="text-[12.5px] text-white/40">筛选</span>
          </div>
          {filterTags.map((tag) => {
            const isActive = tag === activeFilter;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveFilter(tag)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] border transition-colors shrink-0"
                style={{
                  background: isActive ? `${moduleAccent}20` : "rgba(255,255,255,0.02)",
                  borderColor: isActive ? `${moduleAccent}4a` : "rgba(255,255,255,0.08)",
                  color: isActive ? moduleAccent : "rgba(255,255,255,0.4)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Agent grid */}
        <AgentGrid agents={filteredAgents} loading={loadingAgents} />
      </div>
    </div>
  );
}
