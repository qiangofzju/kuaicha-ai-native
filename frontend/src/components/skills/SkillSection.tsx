"use client";

import type { SkillDefinition, SkillStoreSection } from "@/types/skill";
import { SkillCard } from "./SkillCard";

interface SkillSectionProps {
  section: SkillStoreSection;
  onOpenSkill: (skill: SkillDefinition) => void;
  onDeleteSkill?: (skill: SkillDefinition) => void;
  showMore?: boolean;
}

export function SkillSection({ section, onOpenSkill, onDeleteSkill, showMore = false }: SkillSectionProps) {
  const isHero = section.style === "hero";
  const count = section.items.length;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-[20px] font-semibold tracking-[-0.01em] text-white/88">{section.title}</h3>
          {count > 0 && (
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-white/36">
              {count}
            </span>
          )}
          {section.subtitle && (
            <>
              <span className="h-3.5 w-px bg-white/[0.08]" />
              <p className="text-[13px] text-white/34">{section.subtitle}</p>
            </>
          )}
        </div>
        {showMore && (
          <button
            type="button"
            className="text-[12px] text-white/40 hover:text-white/65 transition-colors inline-flex items-center gap-1"
          >
            查看全部
            <span className="text-[13px]">&#8250;</span>
          </button>
        )}
      </div>

      {/* Grid */}
      {isHero ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {section.items.slice(0, 2).map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              variant="hero"
              onOpen={onOpenSkill}
              onDelete={onDeleteSkill}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {section.items.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onOpen={onOpenSkill} onDelete={onDeleteSkill} />
          ))}
        </div>
      )}
    </section>
  );
}
