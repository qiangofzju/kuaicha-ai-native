"use client";

import { useEffect, useMemo, useState } from "react";
import { getAgentIcon } from "@/components/shared/Icons";
import { skillService } from "@/services/skillService";
import type { SkillDefinition } from "@/types/skill";

interface SkillShortcutsBarProps {
  onInsert: (text: string) => void;
}

export function SkillShortcutsBar({ onInsert }: SkillShortcutsBarProps) {
  const [skills, setSkills] = useState<SkillDefinition[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const list = await skillService.listSkills();
        if (!active) return;
        setSkills(list.filter((item) => item.market_status === "ready").slice(0, 8));
      } catch {
        if (!active) return;
        setSkills([]);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const shortcuts = useMemo(
    () =>
      skills.map((skill) => ({
        id: skill.id,
        label: skill.name.replace(/技能$/, "") || skill.name,
        prefix: `@${skill.id} `,
        icon: getAgentIcon(skill.icon),
      })),
    [skills],
  );

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-2 px-1 flex-wrap">
      {shortcuts.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onInsert(item.prefix)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/38 hover:text-white/65 hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <Icon size={13} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
