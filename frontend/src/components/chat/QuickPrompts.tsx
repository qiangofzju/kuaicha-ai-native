"use client";

import { Icons } from "@/components/shared/Icons";
import type { QuickPrompt } from "@/types/chat";

const QUICK_PROMPTS: QuickPrompt[] = [
  { question: "比亚迪最近有哪些负面舆情？", tag: "舆情" },
  { question: "华为的核心子公司有哪些？", tag: "股权" },
  { question: "蚂蚁集团的融资历程", tag: "融资" },
  { question: "宁德时代 vs 比亚迪电池业务对比", tag: "对比" },
];

interface QuickPromptsProps {
  onSelect: (question: string) => void;
}

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
      {QUICK_PROMPTS.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item.question)}
          className="group relative overflow-hidden flex items-center justify-between p-4 rounded-2xl surface-base cursor-pointer text-left transition-all duration-300 hover:-translate-y-[1px] hover:border-chat/30 hover:bg-chat/[0.08] animate-fadeIn"
          style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-35" />

          <div>
            <div className="text-[13.5px] text-white/74 mb-2 group-hover:text-white/90 transition-colors leading-relaxed">
              {item.question}
            </div>
            <span className="text-[10.5px] text-chat bg-chat/[0.12] border border-chat/[0.24] px-2 py-0.5 rounded-md">
              {item.tag}
            </span>
          </div>
          <span className="text-white/22 group-hover:text-chat/85 transition-colors">
            <Icons.ArrowRight />
          </span>
        </button>
      ))}
    </div>
  );
}
