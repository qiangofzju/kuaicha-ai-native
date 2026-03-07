"use client";

import type { FormEvent } from "react";

interface SkillCreatorComposePanelProps {
  prompt: string;
  submitting: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function SkillCreatorComposePanel({
  prompt,
  submitting,
  onPromptChange,
  onSubmit,
}: SkillCreatorComposePanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-5 md:p-6 animate-fadeIn">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 rounded-md border border-skills/35 bg-skills/10 text-[11px] text-skills">技能</span>
        <span className="text-[12px] text-white/45">描述你想创建的技能能力与交付物</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={8}
          placeholder="例如：创建一个自然语言生成 SQL 的技能，包含 SKILL.md、校验脚本和参考文档，支持在聊天里通过 @ 调用。"
          className="w-full rounded-xl border border-white/[0.12] bg-black/20 px-4 py-3 text-[14px] text-white/85 placeholder:text-white/30 outline-none resize-y focus:border-skills/45"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-white/42">发送后会进入技能创建执行界面，实时展示思考与工具调用。</p>
          <button
            type="submit"
            disabled={submitting || !prompt.trim()}
            className="px-4 py-2 rounded-lg border border-skills/45 bg-skills/18 text-skills text-[13px] disabled:opacity-50"
          >
            {submitting ? "启动中..." : "发送并创建"}
          </button>
        </div>
      </form>
    </div>
  );
}
