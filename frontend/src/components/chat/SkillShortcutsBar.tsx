"use client";

import { Icons } from "@/components/shared/Icons";

const SHORTCUTS = [
  { label: "风控尽调", icon: Icons.Shield, prefix: "@风控尽调 " },
  { label: "舆情简报", icon: Icons.Pulse, prefix: "@舆情简报 " },
  { label: "科创评估", icon: Icons.Brain, prefix: "@科创评估 " },
  { label: "股权穿透", icon: Icons.Network, prefix: "@股权穿透 " },
  { label: "趋势对比", icon: Icons.TrendUp, prefix: "@趋势对比 " },
];

interface SkillShortcutsBarProps {
  onInsert: (text: string) => void;
}

export function SkillShortcutsBar({ onInsert }: SkillShortcutsBarProps) {
  return (
    <div className="flex items-center gap-1 mt-2 px-1 flex-wrap">
      {SHORTCUTS.map((item) => {
        const ItemIcon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => onInsert(item.prefix)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/38 hover:text-white/65 hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <ItemIcon size={13} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
