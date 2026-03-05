"use client";

import type { SkillDefinition } from "@/types/skill";
import { getAgentIcon } from "@/components/shared/Icons";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: SkillDefinition;
  variant?: "hero" | "grid";
  onOpen: (skill: SkillDefinition) => void;
}

export function SkillCard({ skill, variant = "grid", onOpen }: SkillCardProps) {
  const Icon = getAgentIcon(skill.icon);
  const comingSoon = skill.market_status !== "ready";
  const isHero = variant === "hero";

  return (
    <button
      type="button"
      onClick={() => onOpen(skill)}
      className={cn(
        "w-full text-left relative overflow-hidden border transition-all duration-300 group rounded-2xl",
        isHero ? "p-6 md:p-7 min-h-[220px]" : "p-5 min-h-[188px]",
        comingSoon
          ? "opacity-90 border-white/[0.08] bg-white/[0.012] cursor-not-allowed"
          : "border-white/[0.10] bg-white/[0.018] hover:border-white/[0.18] hover:bg-white/[0.028] hover:shadow-[0_14px_30px_rgba(0,0,0,0.28)]",
      )}
      title={comingSoon ? "技能即将上线" : "进入技能"}
      disabled={comingSoon}
      style={{ boxShadow: "var(--card-inset)" }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${skill.color}99, transparent)` }}
      />
      <div
        className="absolute -right-16 -top-16 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${skill.color}20, transparent 70%)` }}
      />
      <div className="absolute top-4 right-4">
        {comingSoon ? (
          <span className="text-[10px] px-2 py-1 rounded-md border border-white/[0.14] text-white/45 bg-white/[0.03]">
            即将上线
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-md border text-skills" style={{ background: "rgba(245,158,11,0.14)", borderColor: "rgba(245,158,11,0.34)" }}>
            {skill.price_type === "free" ? "免费" : "付费"}
          </span>
        )}
      </div>

      <div className="relative flex items-start gap-4">
        <div
          className="w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center"
          style={{
            borderColor: `${skill.color}40`,
            background: `${skill.color}16`,
            color: skill.color,
          }}
        >
          <Icon />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.08em] uppercase text-white/40 font-medium mb-1.5">编辑推荐</p>
          <h3 className={cn("leading-[1.2] font-semibold text-white mb-2", isHero ? "text-[23px]" : "text-[17px]")}>{skill.name}</h3>
          <p className={cn("leading-relaxed text-white/45 text-[13px]", isHero ? "line-clamp-3 max-w-[520px]" : "line-clamp-2")}>{skill.description}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3.5">
        <p className="text-[12px] text-white/38">{skill.author}</p>
        {!comingSoon && (
          <span className="text-[11px] text-skills/85 opacity-0 group-hover:opacity-100 transition-opacity">
            进入技能 →
          </span>
        )}
      </div>
    </button>
  );
}
