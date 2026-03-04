"use client";

import type { SkillDefinition, SkillStoreSection } from "@/types/skill";
import { SkillCard } from "./SkillCard";

interface SkillSectionProps {
  section: SkillStoreSection;
  onOpenSkill: (skill: SkillDefinition) => void;
  showMore?: boolean;
}

export function SkillSection({ section, onOpenSkill, showMore = false }: SkillSectionProps) {
  const isHero = section.style === "hero";
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[30px] sm:text-[40px] leading-none font-semibold text-white/95 mb-2">{section.title}</h3>
          {section.subtitle && <p className="text-[13px] text-white/38">{section.subtitle}</p>}
        </div>
        {showMore && (
          <button
            type="button"
            className="text-[22px] text-white/78 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            查看更多
            <span className="text-white/55">›</span>
          </button>
        )}
      </div>

      {isHero ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {section.items.slice(0, 2).map((skill) => (
            <SkillCard key={skill.id} skill={skill} variant="hero" onOpen={onOpenSkill} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {section.items.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onOpen={onOpenSkill} />
          ))}
        </div>
      )}
    </section>
  );
}
