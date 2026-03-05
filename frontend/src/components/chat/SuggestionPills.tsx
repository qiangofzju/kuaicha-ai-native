"use client";

const SUGGESTIONS = [
  "比亚迪最近有哪些负面舆情？",
  "华为的核心子公司有哪些？",
  "蚂蚁集团的融资历程",
  "宁德时代 vs 比亚迪电池业务对比",
  "同花顺最新风险事件汇总",
  "腾讯近半年舆情变化趋势",
  "小米集团的股权结构分析",
  "字节跳动主要风险因素",
  "阿里巴巴最新财务状况",
];

interface SuggestionPillsProps {
  onSelect: (question: string) => void;
}

export function SuggestionPills({ onSelect }: SuggestionPillsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5 max-w-[680px]">
      {SUGGESTIONS.map((text, i) => (
        <button
          key={i}
          onClick={() => onSelect(text)}
          className="px-4 py-2.5 rounded-full text-[13px] text-white/60 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/85 transition-all duration-200 cursor-pointer animate-fadeIn"
          style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
