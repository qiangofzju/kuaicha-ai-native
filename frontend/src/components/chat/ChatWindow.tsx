"use client";

import { useChat } from "@/hooks/useChat";
import { Icons } from "@/components/shared/Icons";
import { QuickPrompts } from "./QuickPrompts";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ChatInsightsRail } from "./ChatInsightsRail";

export function ChatWindow() {
  const { messages, isLoading, messagesEndRef, handleSend, stopStreaming } = useChat();
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col animate-fadeIn">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto h-full max-w-[1240px] px-6 py-5">
          <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 min-h-0 flex flex-col">
              {!hasMessages ? (
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="mb-6 animate-fadeIn-slow">
                    <div className="surface-spotlight relative overflow-hidden rounded-[28px] px-7 py-8">
                      <div className="relative">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/[0.025] border border-white/[0.1] mb-5">
                          <span className="text-chat mr-2">
                            <Icons.Sparkle />
                          </span>
                          <span className="text-[12px] text-white/45 tracking-[0.3px]">
                            快查 AI · 企业智能助手
                          </span>
                        </div>

                        <h2 className="text-[32px] md:text-[36px] leading-[1.2] font-semibold text-main mb-3 tracking-tight">
                          用一段对话，获取可执行企业洞察
                        </h2>
                        <p className="text-[14px] text-white/44 leading-relaxed max-w-[640px]">
                          支持风险、财务、股权、舆情与产业趋势多维查询，输出结构化结论与下一步建议。
                        </p>

                        <div className="mt-5 flex items-center gap-2.5 flex-wrap">
                          {["风险洞察", "经营分析", "股权穿透", "舆情追踪"].map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-md text-[10.5px] text-white/45 border border-white/[0.08] bg-white/[0.02]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <QuickPrompts onSelect={handleSend} />
                </div>
              ) : (
                <>
                  <div className="shrink-0 mb-4">
                    <div className="mx-auto max-w-[860px] px-3">
                      <div className="h-10 rounded-xl border border-white/[0.1] bg-[linear-gradient(180deg,rgba(10,14,28,0.9),rgba(10,14,28,0.76))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_20px_rgba(0,0,0,0.24)] backdrop-blur-md flex items-center justify-between px-3">
                        <span className="text-[11px] text-white/38">
                          对话中 · {messages.length} 条消息
                        </span>
                        {isLoading && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-chat/85">
                            <span className="w-1.5 h-1.5 rounded-full bg-chat animate-pulse" />
                            实时输出中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    <div className="mx-auto max-w-[860px] px-1">
                      {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside className="hidden xl:block min-h-0 overflow-y-auto pr-1">
              <ChatInsightsRail
                messages={messages}
                isLoading={isLoading}
                onPromptSelect={handleSend}
              />
            </aside>
          </div>
        </div>
      </div>

      <ChatInput onSend={handleSend} onStop={stopStreaming} isLoading={isLoading} />
    </div>
  );
}
