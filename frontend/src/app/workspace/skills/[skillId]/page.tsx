"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SkillConfig } from "@/components/skills/SkillConfig";
import { SkillExecutionCanvas } from "@/components/skills/runtime/SkillExecutionCanvas";
import { SkillRunChatPage } from "@/components/skills/runtime/SkillRunChatPage";
import { SkillResultPanel } from "@/components/skills/runtime/SkillResultPanel";
import { useSkillStore } from "@/stores/skillStore";
import { useSkillWebSocket } from "@/hooks/useSkillWebSocket";
import { theme } from "@/styles/theme";
import { getAgentIcon } from "@/components/shared/Icons";
import { skillService } from "@/services/skillService";
import type { SkillDefinition } from "@/types/skill";

export default function SkillExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const skillId = params.skillId as string;

  const skills = useSkillStore((s) => s.skills);
  const selectedSkill = useSkillStore((s) => s.selectedSkill);
  const selectSkill = useSkillStore((s) => s.selectSkill);
  const loadSkills = useSkillStore((s) => s.loadSkills);
  const manifest = useSkillStore((s) => s.manifest);
  const loadingManifest = useSkillStore((s) => s.loadingManifest);
  const loadManifest = useSkillStore((s) => s.loadManifest);
  const currentTaskId = useSkillStore((s) => s.currentTaskId);
  const taskStatus = useSkillStore((s) => s.taskStatus);
  const progress = useSkillStore((s) => s.progress);
  const traceEvents = useSkillStore((s) => s.traceEvents);
  const result = useSkillStore((s) => s.result);
  const error = useSkillStore((s) => s.error);
  const cancelExecution = useSkillStore((s) => s.cancelExecution);
  const resetExecution = useSkillStore((s) => s.resetExecution);

  const [showResult, setShowResult] = useState(false);
  const skillFromTheme = theme.skills.find((s) => s.id === skillId) as unknown as SkillDefinition | undefined;
  const skill = selectedSkill || skills.find((s) => s.id === skillId) || skillFromTheme || null;

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    if (skill) {
      selectSkill(skill);
    }
  }, [skill, selectSkill]);

  useEffect(() => {
    loadManifest(skillId);
  }, [skillId, loadManifest]);

  useEffect(() => {
    if (taskStatus === "running" || taskStatus === "pending") {
      setShowResult(false);
    }
  }, [taskStatus]);

  const generatedSkill = manifest?.execution?.agent_id === "generated-skill-runtime";
  const isBuilderSkill = Boolean(
    manifest
      && (
        manifest.source === "builder"
        || manifest.source === "user_generated"
        || (manifest.author === "@SkillCreator" && generatedSkill)
      ),
  );
  useSkillWebSocket(manifest && !isBuilderSkill && taskStatus === "running" ? currentTaskId : null);

  if (!skill) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Skill not found
      </div>
    );
  }

  const SkillIcon = getAgentIcon(skill.icon);
  const accent = manifest?.ui?.theme_accent || skill.color || theme.colors.modules.skills;
  const ready = skill.market_status === "ready";
  const allowExport = !generatedSkill && (manifest?.ui?.standalone?.show_export ?? true);
  const resultReady = taskStatus === "completed" && !!result && !showResult;
  const phase = showResult && result ? "result" : taskStatus === "running" || taskStatus === "completed" ? "progress" : "config";
  const phaseHint = phase === "config"
    ? "填写参数后启动技能"
    : phase === "progress"
      ? resultReady
        ? "执行完成，轨迹已保留，可先复盘再查看结果"
        : traceEvents[traceEvents.length - 1]?.detail || progress?.message || "正在持续输出分析过程"
      : allowExport ? "结果已生成，可导出交付" : "结果已生成，可继续复用该技能";

  if (manifest && isBuilderSkill) {
    return <SkillRunChatPage skillId={skillId} skill={skill} manifest={manifest} />;
  }

  return (
    <div className="h-full overflow-y-auto px-6 pb-8 pt-5 animate-fadeIn">
      <div className="max-w-[1380px] mx-auto space-y-5">
        <Link
          href="/workspace/skills"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          返回技能广场
        </Link>

        <div
          className="relative overflow-hidden p-6 rounded-2xl border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-inset), var(--shadow-mid)",
          }}
        >
          <div className="absolute -top-14 -right-10 w-56 h-56 rounded-full" style={{ background: `radial-gradient(circle, ${accent}14, transparent 70%)` }} />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center" style={{ background: `${skill.color}14`, borderColor: `${skill.color}30`, color: skill.color }}>
                <SkillIcon />
              </div>
              <div>
                <h2 className="text-[20px] leading-none font-semibold text-white">{manifest?.display_name || skill.name}</h2>
                <p className="text-[13px] text-white/42 mt-2 max-w-[680px]">{manifest?.description || skill.description}</p>
                <p className="text-[11px] text-white/35 mt-1.5">{manifest?.author || skill.author}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.1] bg-white/[0.015] px-3 py-2">
              <p className="text-[10px] text-white/35">当前状态</p>
              <p className="text-[12px] mt-0.5" style={{ color: resultReady ? "#10B981" : accent }}>
                {phase === "config" ? "待配置" : phase === "result" ? "已完成" : resultReady ? "已完成（待查看结果）" : "执行中"}
              </p>
            </div>
          </div>
        </div>

        {!ready && (
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-8 text-center">
            <h3 className="text-[20px] text-white/82 mb-2">该技能即将上线</h3>
            <p className="text-[13px] text-white/40 mb-4">该技能尚未开放，请关注后续版本更新</p>
            <button
              type="button"
              onClick={() => router.push("/workspace/skills")}
              className="px-4 py-2 rounded-lg border border-white/[0.12] text-white/70 hover:text-white/88 hover:bg-white/[0.05] transition-colors"
            >
              返回技能商店
            </button>
          </div>
        )}

        {ready && error && taskStatus === "failed" && (
          <div className="p-4 rounded-xl bg-red-500/6 border border-red-500/20 text-[13px] text-red-400/80">
            {error}
          </div>
        )}

        {ready && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="min-w-0 space-y-4">
              {phase === "config" && (
                loadingManifest ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white/40 text-[13px]">
                    正在加载技能配置...
                  </div>
                ) : manifest ? (
                  <SkillConfig skill={skill} manifest={manifest} />
                ) : (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white/40 text-[13px]">
                    无法加载技能配置
                  </div>
                )
              )}

              {phase === "progress" && (
                <SkillExecutionCanvas
                  progress={progress}
                  traceEvents={traceEvents}
                  stages={manifest?.ui?.stages}
                  onStop={taskStatus === "running" ? cancelExecution : undefined}
                  resultReady={resultReady}
                  onViewResult={() => setShowResult(true)}
                  accentColor={accent}
                />
              )}

              {phase === "result" && result && (
                <SkillResultPanel
                  skill={skill}
                  result={result}
                  onBack={() => router.push("/workspace/skills")}
                  onReset={resetExecution}
                  onExport={skillService.exportRunResult}
                  allowExport={allowExport}
                />
              )}
            </div>

            <aside className="xl:sticky xl:top-4 h-fit">
              <div className="rounded-2xl border border-white/[0.1] bg-white/[0.015] p-5" style={{ boxShadow: "var(--card-inset)" }}>
                <h3 className="text-[13px] text-white/75 mb-2">执行状态</h3>
                <p className="text-[16px] font-semibold" style={{ color: resultReady ? "#10B981" : accent }}>
                  {phase === "config" ? "待配置" : phase === "result" ? "结果页" : resultReady ? "已完成（待查看结果）" : "执行中"}
                </p>
                <p className="text-[12px] text-white/44 mt-1 leading-relaxed">{phaseHint}</p>

                {phase === "progress" && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/35 mb-1">实时进度</p>
                    <p className="text-[20px] leading-none font-semibold text-skills">{progress?.progress ?? 0}%</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
