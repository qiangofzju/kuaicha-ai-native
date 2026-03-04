"use client";

import type { SkillDefinition } from "@/types/skill";
import { getAgentIcon } from "@/components/shared/Icons";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: SkillDefinition;
  variant?: "hero" | "grid";
  onOpen: (skill: SkillDefinition) => void;
}

const COVER_STYLE: Record<string, string> = {
  batch: "radial-gradient(circle at 35% 30%, rgba(245,158,11,0.34), rgba(245,158,11,0.08) 45%, transparent 68%)",
  risk: "radial-gradient(circle at 35% 30%, rgba(239,68,68,0.34), rgba(239,68,68,0.08) 45%, transparent 68%)",
  sentiment: "radial-gradient(circle at 35% 30%, rgba(249,115,22,0.32), rgba(249,115,22,0.08) 45%, transparent 68%)",
  tech: "radial-gradient(circle at 35% 30%, rgba(139,92,246,0.3), rgba(139,92,246,0.08) 45%, transparent 68%)",
  graph: "radial-gradient(circle at 35% 30%, rgba(6,182,212,0.3), rgba(6,182,212,0.08) 45%, transparent 68%)",
  trend: "radial-gradient(circle at 35% 30%, rgba(52,211,153,0.32), rgba(52,211,153,0.08) 45%, transparent 68%)",
  bid: "radial-gradient(circle at 35% 30%, rgba(245,158,11,0.32), rgba(245,158,11,0.08) 45%, transparent 68%)",
  map: "radial-gradient(circle at 35% 30%, rgba(59,130,246,0.3), rgba(59,130,246,0.08) 45%, transparent 68%)",
  job: "radial-gradient(circle at 35% 30%, rgba(16,185,129,0.3), rgba(16,185,129,0.08) 45%, transparent 68%)",
};

export function SkillCard({ skill, variant = "grid", onOpen }: SkillCardProps) {
  const Icon = getAgentIcon(skill.icon);
  const comingSoon = skill.market_status !== "ready";
  const cardClass = variant === "hero" ? "p-6 md:p-7 rounded-3xl min-h-[220px]" : "p-5 rounded-2xl min-h-[196px]";

  return (
    <button
      type="button"
      onClick={() => onOpen(skill)}
      className={cn(
        "w-full text-left relative overflow-hidden border transition-all duration-300 group",
        cardClass,
        comingSoon
          ? "opacity-85 border-white/[0.1] bg-white/[0.015] cursor-not-allowed"
          : "border-white/[0.12] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] hover:border-white/[0.2] hover:shadow-[0_18px_38px_rgba(0,0,0,0.34)]",
      )}
      title={comingSoon ? "技能即将上线" : "进入技能"}
      disabled={comingSoon}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: COVER_STYLE[skill.cover] || COVER_STYLE.batch }} />
      <div className="absolute top-4 right-4">
        {comingSoon ? (
          <span className="text-[10px] px-2 py-1 rounded-md border border-white/[0.16] text-white/42 bg-white/[0.04]">
            即将上线
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-md border bg-skills/20 border-skills/40 text-skills">
            {skill.price_type === "free" ? "免费" : "付费"}
          </span>
        )}
      </div>

      <div className="relative flex items-start gap-4">
        <div
          className="w-12 h-12 shrink-0 rounded-xl border flex items-center justify-center"
          style={{
            borderColor: `${skill.color}45`,
            background: `${skill.color}20`,
            color: skill.color,
          }}
        >
          <Icon />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.05em] uppercase text-skills/75 font-medium mb-2">编辑推荐</p>
          <h3 className="text-[22px] leading-[1.15] font-semibold text-white mb-2">{skill.name}</h3>
          <p className="text-[13px] leading-relaxed text-white/42 line-clamp-2">{skill.description}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-2">
        <p className="text-[12px] text-white/35">{skill.author}</p>
        {!comingSoon && (
          <span className="text-[11px] text-skills/80 opacity-0 group-hover:opacity-100 transition-opacity">
            进入技能 →
          </span>
        )}
      </div>
    </button>
  );
}
