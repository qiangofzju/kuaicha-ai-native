"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/shared/Icons";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { theme } from "@/styles/theme";

const MODULE_META: Record<string, { icon: React.FC; title: string; subtitle: string; accent: string }> = {
  chat: { icon: Icons.Chat, title: "智能对话", subtitle: "企业信息即时问答", accent: theme.colors.modules.chat },
  agent: { icon: Icons.Agent, title: "智能体工坊", subtitle: "6 个可用智能体", accent: theme.colors.modules.agent },
  datashow: { icon: Icons.Datashow, title: "数据洞察", subtitle: "可视化分析工作台", accent: theme.colors.modules.datashow },
};

export function TopBar() {
  const pathname = usePathname();
  const moduleId = pathname.includes("/agent") ? "agent" : pathname.includes("/datashow") ? "datashow" : "chat";
  const meta = MODULE_META[moduleId];
  const ModuleIcon = meta.icon;
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="h-[58px] flex items-center justify-between px-7 border-b border-white/[0.06] shrink-0 backdrop-blur-sm bg-[linear-gradient(180deg,rgba(10,14,27,0.92),rgba(10,14,27,0.78))]">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold text-white/95">
            <span
              className="w-[26px] h-[26px] rounded-[8px] border flex items-center justify-center"
              style={{
                color: meta.accent,
                background: `${meta.accent}1a`,
                borderColor: `${meta.accent}3a`,
              }}
            >
              <ModuleIcon />
            </span>
            {meta.title}
          </div>
          <div className="text-[11px] text-white/42 px-2.5 py-1 bg-white/[0.02] border border-white/[0.08] rounded-[7px]">
            {meta.subtitle}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3.5 py-[7px] bg-white/[0.02] rounded-[11px] border border-white/[0.09] w-64 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.14] transition-colors"
            onClick={() => setPaletteOpen(true)}
          >
            <Icons.Search />
            <span className="text-white/30 text-[12.5px] flex-1">搜索模块、Agent 或命令...</span>
            <span className="text-[10px] text-white/22 px-1.5 py-0.5 bg-white/[0.05] border border-white/[0.06] rounded-[4px]">⌘K</span>
          </div>
          <div className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center cursor-pointer text-white/40 hover:text-white/65 hover:border-white/[0.14] transition-colors">
            <Icons.Pulse />
          </div>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
