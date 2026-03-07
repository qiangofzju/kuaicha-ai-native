"use client";

import type { SkillCreatorResult } from "@/types/skill";

interface SkillCreatorCompletedPanelProps {
  result: SkillCreatorResult;
  onOpenSkill: () => void;
  onBackMarket: () => void;
}

export function SkillCreatorCompletedPanel({
  result,
  onOpenSkill,
  onBackMarket,
}: SkillCreatorCompletedPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)] animate-fadeIn">
      <section className="rounded-2xl border border-white/[0.1] bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h3 className="text-[18px] text-white/92">交付完成</h3>
          <p className="text-[12px] text-white/45 mt-1">已成功创建 {result.created_skill_name}（{result.created_skill_id}）</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <p className="text-[11px] text-white/40 mb-2">交付说明</p>
            <p className="text-[13px] text-white/75 leading-relaxed whitespace-pre-wrap">{result.delivery_notes}</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <p className="text-[11px] text-white/40 mb-2">目录结构</p>
            <pre className="text-[12px] text-white/70 whitespace-pre-wrap leading-6">{result.artifact_tree}</pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenSkill}
              className="px-3.5 py-2 rounded-lg border border-skills/45 bg-skills/18 text-skills text-[13px]"
            >
              进入技能执行
            </button>
            <button
              type="button"
              onClick={onBackMarket}
              className="px-3.5 py-2 rounded-lg border border-white/[0.12] text-white/70 text-[13px] hover:text-white/88"
            >
              返回技能广场
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.1] bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h3 className="text-[14px] text-white/85">关键文件</h3>
          <p className="text-[12px] text-white/45 mt-1">用于后续扩展与审计溯源</p>
        </div>

        <div className="max-h-[560px] overflow-y-auto p-3 space-y-2.5">
          {result.artifact_files.map((file) => (
            <div key={file.path} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-white/85">{file.name}</p>
                <span className="text-[10px] text-white/35">{file.path}</span>
              </div>
              <p className="text-[11px] text-white/45 mt-1">{file.summary}</p>
              {file.preview && (
                <pre className="mt-2 text-[11px] text-white/62 whitespace-pre-wrap max-h-[220px] overflow-y-auto">{file.preview}</pre>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
