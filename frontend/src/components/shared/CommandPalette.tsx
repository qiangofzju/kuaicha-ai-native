"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons, getAgentIcon } from "@/components/shared/Icons";
import { theme } from "@/styles/theme";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.FC<{ size?: number }>;
  color: string;
  group: "agent" | "module" | "action";
}

const MODULE_ITEMS: PaletteItem[] = [
  { id: "mod-chat", label: "智能对话", description: "企业信息即时问答", href: "/workspace/chat", icon: Icons.Chat, color: theme.colors.modules.chat, group: "module" },
  { id: "mod-agent", label: "智能体工坊", description: "场景化 Agent 自动执行", href: "/workspace/agent", icon: Icons.Agent, color: theme.colors.modules.agent, group: "module" },
  { id: "mod-datashow", label: "数据洞察", description: "可视化分析工作台", href: "/workspace/datashow", icon: Icons.Datashow, color: theme.colors.modules.datashow, group: "module" },
];

const GROUP_LABELS: Record<string, string> = {
  agent: "智能体",
  action: "快速操作",
  module: "模块导航",
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build agent items from theme
  const agentItems: PaletteItem[] = useMemo(() =>
    theme.agents.map((a) => {
      // Route graph and trend agents to datashow tabs
      const agentId = a.id as string;
      let href = `/workspace/agent/${agentId}`;
      if (agentId === "graph") href = "/workspace/datashow?tab=relation";
      if (agentId === "trend") href = "/workspace/datashow?tab=trend";
      return {
        id: `agent-${a.id}`,
        label: a.name,
        description: a.description,
        href,
        icon: getAgentIcon(a.icon),
        color: a.color,
        group: "agent" as const,
      };
    }), []);

  // Build filtered results
  const results = useMemo(() => {
    const items: PaletteItem[] = [];
    const q = query.trim().toLowerCase();

    if (!q) {
      items.push(...agentItems, ...MODULE_ITEMS);
    } else {
      // Match agents
      for (const a of agentItems) {
        const agent = theme.agents.find((x) => `agent-${x.id}` === a.id);
        const matchFields = [a.label, a.description, ...(agent?.tags || [])].join(" ").toLowerCase();
        if (matchFields.includes(q)) items.push(a);
      }
      // Match modules
      for (const m of MODULE_ITEMS) {
        if (m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) {
          items.push(m);
        }
      }
      // Quick actions based on query
      items.push({
        id: "action-chat",
        label: `在 Chat 中查询「${query}」`,
        description: "使用智能对话搜索",
        href: `/workspace/chat?q=${encodeURIComponent(query)}`,
        icon: Icons.Chat,
        color: theme.colors.modules.chat,
        group: "action",
      });
      items.push({
        id: "action-graph",
        label: `查看「${query}」关系图谱`,
        description: "使用数据洞察探索关系",
        href: "/workspace/datashow?tab=relation",
        icon: Icons.Network,
        color: theme.colors.modules.datashow,
        group: "action",
      });
    }

    return items;
  }, [query, agentItems]);

  // Group results for display
  const groupedResults = useMemo(() => {
    const groups: { key: string; label: string; items: PaletteItem[] }[] = [];
    const order = ["agent", "action", "module"];
    for (const g of order) {
      const items = results.filter((r) => r.group === g);
      if (items.length > 0) {
        groups.push({ key: g, label: GROUP_LABELS[g], items });
      }
    }
    return groups;
  }, [results]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= results.length) setSelectedIndex(Math.max(0, results.length - 1));
  }, [results.length, selectedIndex]);

  const handleSelect = useCallback((item: PaletteItem) => {
    onClose();
    router.push(item.href);
  }, [onClose, router]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(6,8,15,0.78)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[540px] rounded-2xl border overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        style={{
          background: "linear-gradient(180deg, rgba(14,18,32,0.98), rgba(10,14,24,0.98))",
          borderColor: "rgba(255,255,255,0.1)",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <Icons.Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="搜索智能体、模块或操作..."
            className="flex-1 bg-transparent border-none outline-none text-white/90 text-[14px] placeholder:text-white/25"
          />
          <span
            className="text-[11px] text-white/25 px-2 py-0.5 rounded-[5px] border cursor-pointer hover:text-white/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
            onClick={onClose}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {groupedResults.map((group) => (
            <div key={group.key}>
              <div className="px-5 py-1.5 text-[11px] text-white/30 font-medium tracking-wide">
                {group.label}
              </div>
              {group.items.map((item) => {
                const idx = flatIndex++;
                const isSelected = idx === selectedIndex;
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                    }}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div
                      className="w-[30px] h-[30px] rounded-[8px] border flex items-center justify-center shrink-0"
                      style={{
                        color: item.color,
                        background: `${item.color}12`,
                        borderColor: `${item.color}25`,
                      }}
                    >
                      <ItemIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/85 truncate">{item.label}</div>
                      <div className="text-[11px] text-white/35 truncate">{item.description}</div>
                    </div>
                    {isSelected && (
                      <div className="text-[11px] text-white/20 shrink-0">
                        <Icons.ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {results.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-white/25">
              没有匹配的结果
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
