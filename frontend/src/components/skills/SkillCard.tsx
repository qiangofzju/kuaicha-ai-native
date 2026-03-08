"use client";

import { useEffect, useRef, useState } from "react";
import type { SkillDefinition } from "@/types/skill";
import { Icons, getAgentIcon } from "@/components/shared/Icons";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: SkillDefinition;
  variant?: "hero" | "grid";
  onOpen: (skill: SkillDefinition) => void;
  onDelete?: (skill: SkillDefinition) => void;
}

function isUserCreatedSkill(skill: SkillDefinition) {
  return (
    skill.deletable === true ||
    skill.source === "builder" ||
    skill.source_raw === "user_generated" ||
    skill.author === "@SkillCreator" ||
    skill.tags.includes("用户创建")
  );
}

const USER_SKILL_ICON_POOL = [
  "Shield",
  "Alert",
  "TrendUp",
  "Brain",
  "Network",
  "Briefcase",
  "Database",
  "Globe",
  "Pulse",
  "BarChart",
  "Doc",
  "Table",
] as const;

const USER_SKILL_COLOR_POOL = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#06B6D4",
  "#EF4444",
  "#F97316",
  "#6366F1",
  "#14B8A6",
] as const;

function hashSkillId(skillId: string) {
  let hash = 0;
  for (let index = 0; index < skillId.length; index += 1) {
    hash = (hash * 31 + skillId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function SkillCard({ skill, variant = "grid", onOpen, onDelete }: SkillCardProps) {
  const comingSoon = skill.market_status !== "ready";
  const isHero = variant === "hero";
  const isUserCreated = isUserCreatedSkill(skill);
  const fallbackSeed = hashSkillId(skill.id);
  const iconName =
    isUserCreated && (!skill.icon || skill.icon === "Sparkle")
      ? USER_SKILL_ICON_POOL[fallbackSeed % USER_SKILL_ICON_POOL.length]
      : skill.icon;
  const accentColor =
    isUserCreated && (!skill.color || skill.color === "#22C55E")
      ? USER_SKILL_COLOR_POOL[fallbackSeed % USER_SKILL_COLOR_POOL.length]
      : skill.color;
  const Icon = getAgentIcon(iconName);
  const canManage = Boolean(isUserCreated && onDelete);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayTags = skill.tags.filter((tag) => tag !== "用户创建" && tag !== "MVP").slice(0, 2);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <button
      type="button"
      onClick={() => !comingSoon && onOpen(skill)}
      className={cn(
        "w-full text-left relative overflow-hidden border transition-all duration-300 group rounded-2xl",
        comingSoon
          ? "opacity-80 border-white/[0.06] bg-white/[0.01] cursor-not-allowed"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:-translate-y-[2px] hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)]",
      )}
      title={comingSoon ? "技能即将上线" : "进入技能"}
      disabled={comingSoon}
    >
      <div
        className="pointer-events-none absolute left-4 right-4 top-3 h-px rounded-full"
        style={{
          background:
            comingSoon || isUserCreated
              ? "rgba(255,255,255,0.06)"
              : accentColor,
        }}
      />

      <div className={cn(isHero ? "p-5 pt-8 md:p-6 md:pt-9" : "px-5 pb-4 pt-8")}>
        {/* Header: icon + badge/menu */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `${accentColor}18`,
              color: accentColor,
            }}
          >
            <Icon size={20} />
          </div>

          <div className="flex items-center gap-1.5">
            {comingSoon ? (
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-white/[0.08] text-white/35 bg-white/[0.02]">
                即将上线
              </span>
            ) : (
              <span
                className="text-[10px] px-2 py-0.5 rounded-md border"
                style={{
                  color: accentColor,
                  background: `${accentColor}14`,
                  borderColor: `${accentColor}30`,
                }}
              >
                {skill.price_type === "free" ? "免费" : "付费"}
              </span>
            )}

            {canManage && (
              <div
                ref={menuRef}
                className="relative"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((open) => !open);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-colors hover:text-white/55 hover:bg-white/[0.06]"
                  aria-label={`管理 ${skill.name}`}
                >
                  <Icons.DotsVertical size={13} />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-8 z-20 min-w-[110px] rounded-xl border p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                    style={{
                      background: "var(--panel-bg)",
                      borderColor: "var(--panel-border)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete?.(skill);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-400/10"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title & description */}
        <h3 className={cn("font-semibold leading-snug text-white/90 mb-2", isHero ? "text-[17px]" : "text-[15px]")}>
          {skill.name}
        </h3>
        <p className={cn("text-[13px] leading-[1.6] text-white/38 mb-4", isHero ? "line-clamp-3" : "line-clamp-2")}>
          {skill.description}
        </p>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-md px-2 py-0.5 text-[11px] text-white/40 border border-white/[0.06] bg-white/[0.02]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
          <p className="text-[12px] text-white/30">{skill.author}</p>
          {!comingSoon && (
            <span className="text-[11px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              进入 &#8250;
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
