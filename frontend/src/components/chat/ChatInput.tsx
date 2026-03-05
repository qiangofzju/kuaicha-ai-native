"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Icons } from "@/components/shared/Icons";

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div
      className="px-6 pb-5 pt-4 border-t border-white/[0.05]"
      style={{
        background: "linear-gradient(180deg, var(--chat-fade-start), var(--chat-fade-end))",
      }}
    >
      <div className="max-w-[1240px] mx-auto">
        <div className="surface-spotlight relative overflow-hidden rounded-[18px] p-3 backdrop-blur-[10px]">
          <div className="relative flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg border border-chat/[0.32] bg-chat/[0.14] text-chat flex items-center justify-center shrink-0">
              <Icons.Chat size={14} />
            </div>
            <span className="text-[11px] text-white/42">企业信息问答</span>
            <span className="text-[11px] text-white/22 ml-auto">Enter 发送 · Shift+Enter 换行</span>
          </div>

          <div className="relative flex items-end gap-2.5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入企业名称或问题，例如：比亚迪最近的经营状况如何？"
              className="flex-1 bg-transparent border-none outline-none text-white/80 text-[14px] resize-none min-h-[24px] max-h-[120px] placeholder:text-white/25 leading-relaxed"
              rows={1}
              disabled={false}
            />

            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl shrink-0 bg-white/[0.08] border border-white/[0.18] text-white/82 hover:bg-white/[0.12] transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-[2px] bg-white/80" />
                <span className="text-[12px]">停止</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200 ${
                  canSend
                    ? "bg-chat text-white hover:opacity-95 cursor-pointer shadow-[0_10px_22px_rgba(127,149,184,0.32)]"
                    : "bg-white/[0.08] text-white/25 cursor-not-allowed"
                }`}
              >
                <Icons.Send />
              </button>
            )}
          </div>

          <div className="relative flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/24">
              建议输入具体企业名、时间范围与分析维度，结果更准确
            </span>
            {isLoading && (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-chat/80">
                <span className="w-1.5 h-1.5 rounded-full bg-chat animate-pulse" />
                正在流式生成
              </span>
            )}
          </div>
        </div>

        <div className="text-center mt-2">
          <span className="text-[10px] text-white/20">
            快查AI 可能会犯错，请核实重要信息
          </span>
        </div>
      </div>
    </div>
  );
}
