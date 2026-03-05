"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatSkillCardArtifact } from "@/types/chat";

interface SkillInvokeCardProps {
  artifact: ChatSkillCardArtifact;
  running?: boolean;
  onRun: (input: Record<string, unknown>) => Promise<void>;
}

export function SkillInvokeCard({ artifact, running = false, onRun }: SkillInvokeCardProps) {
  const router = useRouter();
  const [query, setQuery] = useState(String(artifact.prefill.query ?? ""));
  const [scenario, setScenario] = useState(String(artifact.prefill.scenario ?? "filter"));
  const [companyNamesText, setCompanyNamesText] = useState(String(artifact.prefill.company_names_text ?? ""));

  const visibleFields = useMemo(() => artifact.ui?.chat_card?.show_fields || ["scenario", "query"], [artifact.ui?.chat_card?.show_fields]);

  const handleRun = async () => {
    await onRun({
      query,
      scenario,
      company_names_text: companyNamesText,
    });
  };

  return (
    <div className="mt-3 rounded-xl border border-white/[0.1] bg-white/[0.02] p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-chat/80">技能唤醒</p>
          <h4 className="text-[14px] text-white/90 mt-0.5">{artifact.display_name}</h4>
          {artifact.description && <p className="text-[12px] text-white/50 mt-1">{artifact.description}</p>}
        </div>
        <span className="px-2 py-1 rounded-md text-[10px] border border-chat/[0.25] text-chat/85 bg-chat/[0.1]">@{artifact.skill_id}</span>
      </div>

      {visibleFields.includes("scenario") && (
        <div>
          <p className="text-[11px] text-white/45 mb-1.5">处理场景</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "筛选", value: "filter" },
              { label: "结构化导出", value: "export" },
              { label: "衍生字段", value: "derived" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setScenario(item.value)}
                className="px-2.5 py-1 rounded-md text-[11px] border transition-colors"
                style={{
                  borderColor: scenario === item.value ? "rgba(127,149,184,0.45)" : "rgba(255,255,255,0.12)",
                  background: scenario === item.value ? "rgba(127,149,184,0.15)" : "rgba(255,255,255,0.02)",
                  color: scenario === item.value ? "#B8CAE4" : "rgba(255,255,255,0.55)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleFields.includes("query") && (
        <div>
          <p className="text-[11px] text-white/45 mb-1.5">查询需求</p>
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[12px] bg-white/[0.03] border border-white/[0.12] text-white/85 placeholder:text-white/25 outline-none focus:border-chat/[0.35]"
            placeholder="请输入查询需求"
          />
        </div>
      )}

      {visibleFields.includes("company_names_text") && scenario === "export" && (
        <div>
          <p className="text-[11px] text-white/45 mb-1.5">企业名单（可选）</p>
          <textarea
            rows={2}
            value={companyNamesText}
            onChange={(e) => setCompanyNamesText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[12px] bg-white/[0.03] border border-white/[0.12] text-white/85 placeholder:text-white/25 outline-none focus:border-chat/[0.35]"
            placeholder="例如：同花顺，东方财富，大智慧"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={running || !query.trim()}
          className="px-3 py-1.5 rounded-md text-[12px] border transition-colors disabled:opacity-50"
          style={{ borderColor: "rgba(127,149,184,0.5)", background: "rgba(127,149,184,0.14)", color: "#C8D8EE" }}
        >
          {running ? "执行中..." : "运行技能"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/workspace/skills/${artifact.skill_id}`)}
          className="px-3 py-1.5 rounded-md text-[12px] border border-white/[0.15] text-white/65 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
        >
          在独立页打开
        </button>
      </div>
    </div>
  );
}
