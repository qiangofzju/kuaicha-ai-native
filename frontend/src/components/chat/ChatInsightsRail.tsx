"use client";

import type { ChatMessage } from "@/types/chat";
import { Icons } from "@/components/shared/Icons";

const QUICK_QUESTIONS = [
  "同花顺最新风险事件汇总",
  "华为核心子公司与业务结构",
  "宁德时代与比亚迪风险对比",
  "腾讯近半年舆情变化",
];

const CAPABILITY_TAGS = ["风险识别", "舆情监测", "股权穿透", "财务线索", "趋势对比", "关系检索"];

interface ChatInsightsRailProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onPromptSelect: (question: string) => void;
}

export function ChatInsightsRail({ messages, isLoading, onPromptSelect }: ChatInsightsRailProps) {
  const userCount = messages.filter((message) => message.role === "user").length;
  const assistantCount = messages.filter((message) => message.role === "ai").length;
  const latestAssistant = [...messages].reverse().find((message) => message.role === "ai");
  const nextActions = latestAssistant?.actions?.slice(0, 4) ?? [];

  return (
    <aside className="space-y-4">
      <section className="surface-base rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12.5px] font-medium text-white/72">会话概览</h3>
          {isLoading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-chat/80">
              <span className="w-1.5 h-1.5 rounded-full bg-chat animate-pulse" />
              生成中
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
            <p className="text-[10px] text-white/35">总消息</p>
            <p className="text-[14px] font-semibold text-white/82 mt-0.5">{messages.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
            <p className="text-[10px] text-white/35">用户</p>
            <p className="text-[14px] font-semibold text-white/82 mt-0.5">{userCount}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
            <p className="text-[10px] text-white/35">AI</p>
            <p className="text-[14px] font-semibold text-white/82 mt-0.5">{assistantCount}</p>
          </div>
        </div>
      </section>

      <section className="surface-base rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Icons.Sparkle size={14} className="text-chat" />
          <h3 className="text-[12.5px] font-medium text-white/72">高频问题</h3>
        </div>
        <div className="space-y-2">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onPromptSelect(question)}
              className="w-full text-left px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.015] text-[12px] text-white/58 hover:text-white/78 hover:border-chat/35 hover:bg-chat/[0.08] transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-base rounded-2xl p-4">
        <h3 className="text-[12.5px] font-medium text-white/72 mb-3">查询能力</h3>
        <div className="flex flex-wrap gap-1.5">
          {CAPABILITY_TAGS.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-md text-[10.5px] border border-chat/[0.24] bg-chat/[0.1] text-chat/90"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-base rounded-2xl p-4">
        <h3 className="text-[12.5px] font-medium text-white/72 mb-3">下一步建议</h3>
        {nextActions.length > 0 ? (
          <div className="space-y-2">
            {nextActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onPromptSelect(action)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.015] hover:border-white/[0.15] hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[12px] text-white/65 text-left">{action}</span>
                <Icons.ArrowRight size={13} className="text-white/30" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-white/42 leading-relaxed">
            你可以继续追问具体维度，例如“请按时间线展开关键风险事件”。
          </p>
        )}
      </section>
    </aside>
  );
}
