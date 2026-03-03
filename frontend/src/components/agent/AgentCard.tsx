"use client";

import Link from "next/link";
import type { AgentDefinition } from "@/types/agent";
import { getAgentIcon } from "@/components/shared/Icons";

interface AgentCardProps {
  agent: AgentDefinition;
  index: number;
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const AgentIcon = getAgentIcon(agent.icon);
  const isComing = agent.status === "coming";

  const card = (
    <div
      className={`card-hover group relative overflow-hidden p-5 rounded-2xl surface-elevated block opacity-0 animate-fadeIn ${isComing ? "opacity-60 cursor-default" : "cursor-pointer"}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-35" />
      <div
        className="absolute -right-10 -top-14 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${agent.color}1a, transparent 70%)` }}
      />

      {/* Status badge */}
      {agent.status === "beta" && (
        <span className="absolute top-3 right-3 text-[9px] font-medium text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
          Beta
        </span>
      )}
      {isComing && (
        <span className="absolute top-3 right-3 text-[9px] font-medium text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded">
          即将上线
        </span>
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 border"
        style={{
          background: `${agent.color}15`,
          borderColor: `${agent.color}2a`,
          boxShadow: `0 8px 24px ${agent.color}1f`,
        }}
      >
        <span style={{ color: agent.color }}>
          <AgentIcon />
        </span>
      </div>

      {/* Info */}
      <h3 className="text-[14px] font-semibold text-white/90 mb-1.5">
        {agent.name}
      </h3>
      <p className="text-[12px] text-white/40 leading-relaxed mb-3">
        {agent.description}
      </p>

      {/* Tags */}
      <div className="flex gap-1.5">
        {agent.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10.5px] px-2 py-0.5 rounded border"
            style={{
              color: "rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Hover arrow indicator */}
      {!isComing && (
        <div
          className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0"
          style={{ color: agent.color }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h8M8 4l3 3-3 3" />
          </svg>
        </div>
      )}
    </div>
  );

  if (isComing) return card;

  // Route graph and trend agents to their Datashow tabs
  let href = `/workspace/agent/${agent.id}`;
  if (agent.id === "graph") href = "/workspace/datashow?tab=relation";
  if (agent.id === "trend") href = "/workspace/datashow?tab=trend";

  return (
    <Link href={href}>
      {card}
    </Link>
  );
}
