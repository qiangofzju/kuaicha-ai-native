"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { Icons, getAgentIcon } from "@/components/shared/Icons";
import { cn } from "@/lib/utils";
import { theme } from "@/styles/theme";

const TABS = [
  { id: "chat", href: "/workspace/chat", label: "Chat", labelCn: "智能对话", icon: Icons.Chat, accent: theme.colors.modules.chat },
  { id: "agent", href: "/workspace/agent", label: "Agent", labelCn: "智能体工坊", icon: Icons.Agent, accent: theme.colors.modules.agent },
  { id: "datashow", href: "/workspace/datashow", label: "Datashow", labelCn: "数据洞察", icon: Icons.Datashow, accent: theme.colors.modules.datashow },
];

const QUICK_LINKS = [
  { id: "new-chat", label: "新建会话", icon: Icons.Plus },
  { id: "agent-list", label: "Agent 列表", icon: Icons.Agent, href: "/workspace/agent" },
  { id: "relation", label: "关系图谱", icon: Icons.Network, href: "/workspace/datashow?tab=relation" },
  { id: "trend", label: "趋势分析", icon: Icons.TrendUp, href: "/workspace/datashow?tab=trend" },
];

function formatSessionTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { sessions, currentSessionId, loadSessions, setCurrentSession, createSession, renameSession, deleteSession } = useChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const activeTabId = TABS.find((t) => pathname.startsWith(t.href))?.id || "chat";
  const featuredAgents = useMemo(
    () => theme.agents.filter((agent) => agent.status !== "coming").slice(0, 4),
    [],
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewSession = async () => {
    await createSession();
    router.push("/workspace/chat");
  };

  const handleSelectSession = (id: string) => {
    setCurrentSession(id);
    router.push("/workspace/chat");
  };

  const handleStartRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const handleFinishRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id);
  };

  return (
    <div
      className="flex flex-col h-full border-r border-white/[0.08] shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        width: sidebarCollapsed ? 72 : 256,
        background:
          "radial-gradient(220px 180px at 80% -8%, rgba(130,145,176,0.14), transparent 72%), linear-gradient(180deg, #0a0f1d 0%, #080c16 100%)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.03)",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 cursor-pointer",
          sidebarCollapsed ? "py-5 justify-center" : "py-5 px-4"
        )}
        onClick={toggleSidebar}
      >
        <Icons.Logo />
        {!sidebarCollapsed && (
          <span
            className="text-[17px] font-bold tracking-[0.2px]"
            style={{
              background: "linear-gradient(135deg, #E8A838, #F06543)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            快查 AI
          </span>
        )}
      </div>

      <div className={cn("h-px bg-white/[0.08]", sidebarCollapsed ? "mx-3" : "mx-4")} />

      <div className={cn("flex flex-col gap-1.5", sidebarCollapsed ? "p-2" : "p-3.5")}>
        {!sidebarCollapsed && (
          <p className="text-[10px] tracking-[1.2px] uppercase text-white/28 px-2">工作台</p>
        )}
        {TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          const TabIcon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-[10px] cursor-pointer transition-all duration-200",
                sidebarCollapsed ? "py-2.5 justify-center" : "py-2.5 px-3",
                isActive
                  ? "border border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border border-transparent hover:bg-white/[0.045] hover:border-white/[0.05]"
              )}
              title={tab.labelCn}
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${tab.accent}1f, rgba(255,255,255,0.012))`,
                      borderColor: `${tab.accent}36`,
                      boxShadow: `0 10px 24px rgba(0,0,0,0.28)`,
                    }
                  : undefined
              }
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute rounded"
                  style={
                    sidebarCollapsed
                      ? { left: "50%", top: 0, transform: "translateX(-50%)", width: 20, height: 3, background: tab.accent }
                      : { left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, background: tab.accent }
                  }
                />
              )}
              <span style={{ color: isActive ? tab.accent : "rgba(255,255,255,0.45)" }} className="transition-colors">
                <TabIcon />
              </span>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13.5px] tracking-wide",
                      isActive ? "font-semibold text-white" : "font-normal text-white/55"
                    )}
                  >
                    {tab.label}
                  </span>
                  <span className="block text-[10px] text-white/28 mt-0.5">{tab.labelCn}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className={cn("h-px bg-white/[0.08]", sidebarCollapsed ? "mx-3" : "mx-4")} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className={cn("px-3 pt-3", sidebarCollapsed ? "pb-2" : "pb-3")}>
          {!sidebarCollapsed && (
            <p className="text-[10px] tracking-[1.2px] uppercase text-white/28 mb-2 px-1">快速入口</p>
          )}
          <div className={cn("grid gap-1.5", sidebarCollapsed ? "grid-cols-1" : "grid-cols-1")}>
            {QUICK_LINKS.map((item) => {
              const ItemIcon = item.icon;
              const quickIsActive = item.href ? pathname.includes(item.href.split("?")[0]) : false;
              const content = (
                <div
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-[10px] border transition-colors",
                    sidebarCollapsed ? "justify-center py-2.5" : "px-3 py-2.5",
                    quickIsActive
                      ? "border-white/[0.14] bg-white/[0.06] text-white/78"
                      : "border-white/[0.06] bg-white/[0.02] text-white/48 hover:bg-white/[0.04] hover:text-white/65"
                  )}
                  title={item.label}
                >
                  <ItemIcon size={15} />
                  {!sidebarCollapsed && <span className="text-[12.5px]">{item.label}</span>}
                </div>
              );

              if (item.id === "new-chat") {
                return (
                  <button key={item.id} type="button" onClick={handleNewSession}>
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.id} href={item.href || "/workspace/chat"}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {!sidebarCollapsed && (
          <>
            <div className="h-px bg-white/[0.08] mx-4" />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] font-semibold text-white/30 tracking-[1.2px] uppercase">
                  最近会话
                </div>
                <button
                  onClick={handleNewSession}
                  className="text-white/25 hover:text-white/50 transition-colors"
                  title="新建会话"
                >
                  <Icons.Plus size={14} />
                </button>
              </div>
              <div className="max-h-[240px] overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      "group rounded-[10px] cursor-pointer mb-1.5 border transition-colors",
                      currentSessionId === session.id
                        ? "bg-white/[0.065] border-white/[0.11]"
                        : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.08]"
                    )}
                  >
                    <div className="flex items-start gap-2 px-2.5 pt-2.5 pb-2">
                      <Icons.Clock size={13} />
                      {editingId === session.id ? (
                        <input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          onBlur={handleFinishRename}
                          onKeyDown={(event) => { if (event.key === "Enter") handleFinishRename(); }}
                          className="flex-1 bg-transparent border-none outline-none text-[12px] text-white/70"
                          autoFocus
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white/70 truncate">{session.title}</p>
                          <p className="text-[10px] text-white/28 mt-0.5">
                            {session.message_count} 条消息 · {formatSessionTime(session.created_at)}
                          </p>
                        </div>
                      )}
                      {editingId !== session.id && (
                        <div className="hidden group-hover:flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(event) => { event.stopPropagation(); handleStartRename(session.id, session.title); }}
                            className="text-white/22 hover:text-white/50 transition-colors"
                            title="重命名"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M8.5 1.5l2 2M1 11l.5-2L9 1.5l2 2L3.5 11z" />
                            </svg>
                          </button>
                          <button
                            onClick={(event) => handleDelete(session.id, event)}
                            className="text-white/22 hover:text-red-400/70 transition-colors"
                            title="删除"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M2 3h8M4.5 3V2h3v1M3 3v7.5h6V3" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {sessions.length === 0 && (
                <div className="text-[11px] text-white/20 text-center py-4">
                  暂无会话记录
                </div>
              )}
            </div>
          </>
        )}

        {!sidebarCollapsed && (
          <>
            <div className="h-px bg-white/[0.08] mx-4" />
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-white/30 tracking-[1.2px] uppercase mb-2.5">
                常用 Agent
              </div>
              <div className="space-y-1.5">
                {featuredAgents.map((agent) => {
                  const AgentIcon = getAgentIcon(agent.icon);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => router.push(`/workspace/agent/${agent.id}`)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors text-left"
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center border shrink-0"
                        style={{
                          color: agent.color,
                          background: `${agent.color}12`,
                          borderColor: `${agent.color}25`,
                        }}
                      >
                        <AgentIcon size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] text-white/75 truncate">{agent.name}</p>
                        <p className="text-[10px] text-white/30 truncate">{agent.tags[0]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-2.5 border-t border-white/[0.08]",
          sidebarCollapsed ? "py-4 justify-center" : "py-4 px-4"
        )}
      >
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #7f95b8, #a7b6d0)" }}
        >
          W
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-white/85">Wang Lei</div>
              <div className="text-[11px] text-white/35">Enterprise</div>
            </div>
            <div className="cursor-pointer text-white/30 hover:text-white/50 transition-colors">
              <Icons.Settings />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
