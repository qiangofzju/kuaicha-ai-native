"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Icons } from "@/components/shared/Icons";
import { SkillShortcutsBar } from "./SkillShortcutsBar";

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

  const insertText = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) {
      setValue((prev) => text + prev);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const next = current.slice(0, start) + text + current.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + text.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, []);

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="px-6 pb-5 pt-3">
      <div className="max-w-[860px] mx-auto">
        <div className="relative rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-3 focus-within:border-white/[0.20] transition-colors">
          <div className="flex items-end gap-2.5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="发消息给快查 AI..."
              className="flex-1 bg-transparent border-none outline-none text-white/80 text-[14px] resize-none min-h-[24px] max-h-[120px] placeholder:text-white/25 leading-relaxed"
              rows={1}
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
        </div>

        <SkillShortcutsBar onInsert={insertText} />

        <div className="text-center mt-2">
          <span className="text-[10px] text-white/18">
            快查AI 可能会犯错，请核实重要信息
          </span>
        </div>
      </div>
    </div>
  );
}
