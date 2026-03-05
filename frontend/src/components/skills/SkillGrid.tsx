"use client";

import type { SkillDefinition } from "@/types/skill";
import { SkillCard } from "./SkillCard";

interface SkillGridProps {
  skills: SkillDefinition[];
  onOpenSkill: (skill: SkillDefinition) => void;
}

export function SkillGrid({ skills, onOpenSkill }: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-8 text-center text-white/40 text-[13px]">
        暂无技能
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} onOpen={onOpenSkill} />
      ))}
    </div>
  );
}
