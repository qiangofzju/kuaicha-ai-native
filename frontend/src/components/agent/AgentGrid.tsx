"use client";

import type { AgentDefinition } from "@/types/agent";
import { AgentCard } from "./AgentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Icons } from "@/components/shared/Icons";

interface AgentGridProps {
  agents: AgentDefinition[];
  loading?: boolean;
}

export function AgentGrid({ agents, loading }: AgentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl surface-base opacity-0 animate-fadeIn"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {/* Skeleton icon */}
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] mb-3 animate-pulse" />
            {/* Skeleton title */}
            <div className="h-4 w-24 rounded bg-white/[0.04] mb-2 animate-pulse" />
            {/* Skeleton description */}
            <div className="h-3 w-full rounded bg-white/[0.03] mb-1.5 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-white/[0.03] mb-3 animate-pulse" />
            {/* Skeleton tags */}
            <div className="flex gap-1.5">
              <div className="h-4 w-10 rounded bg-white/[0.03] animate-pulse" />
              <div className="h-4 w-12 rounded bg-white/[0.03] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={<Icons.Agent size={48} />}
        title="暂无可用智能体"
        description="稍后再试或联系管理员"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      {agents.map((agent, i) => (
        <AgentCard key={agent.id} agent={agent} index={i} />
      ))}
    </div>
  );
}
