"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme } from "@/styles/theme";
import { getAgentIcon } from "@/components/shared/Icons";
import Link from "next/link";
import { useAgentStore } from "@/stores/agentStore";
import { useAgentWebSocket } from "@/hooks/useAgentWebSocket";
import { AgentConfig } from "@/components/agent/AgentConfig";
import { AgentProgress } from "@/components/agent/AgentProgress";
import { AgentResult } from "@/components/agent/AgentResult";
import { BatchResult } from "@/components/agent/BatchResult";
import { BatchExecutionCanvas } from "@/components/agent/BatchExecutionCanvas";
import type { AgentDefinition } from "@/types/agent";

export default function AgentExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  // Find agent from theme (fallback for static definitions)
  const themeAgent = theme.agents.find((a) => a.id === agentId);

  // Store state
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const configSchema = useAgentStore((s) => s.configSchema);
  const loadingSchema = useAgentStore((s) => s.loadingSchema);
  const loadSchema = useAgentStore((s) => s.loadSchema);
  const currentTaskId = useAgentStore((s) => s.currentTaskId);
  const taskStatus = useAgentStore((s) => s.taskStatus);
  const progress = useAgentStore((s) => s.progress);
  const streamContent = useAgentStore((s) => s.streamContent);
  const traceEvents = useAgentStore((s) => s.traceEvents);
  const result = useAgentStore((s) => s.result);
  const error = useAgentStore((s) => s.error);
  const cancelExecution = useAgentStore((s) => s.cancelExecution);
  const resetExecution = useAgentStore((s) => s.resetExecution);
  const [showBatchResult, setShowBatchResult] = useState(false);

  // Connect WebSocket when task is running
  useAgentWebSocket(taskStatus === "running" ? currentTaskId : null, agentId);

  // Set agent and load schema on mount
  useEffect(() => {
    if (themeAgent) {
      selectAgent(themeAgent as unknown as AgentDefinition);
    }
    loadSchema(agentId);
  }, [agentId, themeAgent, selectAgent, loadSchema]);

  useEffect(() => {
    if (agentId !== "batch") {
      setShowBatchResult(false);
      return;
    }
    if (taskStatus === "running" || taskStatus === "pending") {
      setShowBatchResult(false);
    }
  }, [agentId, taskStatus]);

  const agent = selectedAgent || (themeAgent as unknown as AgentDefinition) || null;
  const moduleAccent = theme.colors.modules.agent;

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Agent not found
      </div>
    );
  }

  const AgentIcon = getAgentIcon(agent.icon);

  // Determine phase: config → progress → result
  const isCompleting = taskStatus === "completed" && !result;
  const batchResultReady = agentId === "batch" && taskStatus === "completed" && !!result && !showBatchResult;
  const shouldShowBatchResult = agentId === "batch" && showBatchResult && !!result && taskStatus === "completed";
  const phase =
    shouldShowBatchResult || (agentId !== "batch" && result && taskStatus === "completed")
      ? "result"
      : taskStatus === "running" || isCompleting || (agentId === "batch" && result && taskStatus === "completed")
        ? "progress"
        : "config";

  const requiredFieldCount = configSchema
    ? configSchema.fields.filter((field) => field.required).length
    : 0;

  const phaseLabel =
    phase === "config"
      ? "待配置"
      : phase === "progress"
        ? batchResultReady
          ? "已完成（待查看结果）"
          : isCompleting
          ? "结果整理中"
          : "执行中"
        : taskStatus === "failed"
          ? "执行失败"
          : "已完成";

  const phaseHint =
    phase === "config"
      ? "填写参数后即可启动任务"
      : phase === "progress"
        ? batchResultReady
          ? "执行轨迹已完整保留，可先复盘后再查看结果"
          : isCompleting
          ? "执行已完成，正在整理结果与交付文件"
          : traceEvents[traceEvents.length - 1]?.detail || progress?.message || "正在持续输出分析过程"
        : "分析结果已生成，可复盘与导出";

  const statusColor =
    phase === "progress" && !batchResultReady
      ? agent.color
      : taskStatus === "failed"
        ? "#EF4444"
        : "#10B981";

  const topFields = configSchema?.fields.slice(0, 3) ?? [];

  return (
    <div className="h-full overflow-y-auto px-6 pb-8 pt-5 animate-fadeIn">
      <div className="max-w-[1380px] mx-auto">
        {/* Back link */}
        <Link
          href="/workspace/agent"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 mb-6 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          返回 Agent 列表
        </Link>

        {/* Agent header */}
        <div
          className="relative overflow-hidden mb-6 p-6 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${moduleAccent}18, rgba(255,255,255,0.02) 48%, rgba(255,255,255,0.012))`,
            border: `1px solid ${moduleAccent}36`,
          }}
        >
          <div
            className="absolute -top-14 -right-10 w-56 h-56 rounded-full"
            style={{ background: `radial-gradient(circle, ${moduleAccent}1c, transparent 72%)` }}
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border"
                style={{ background: `${agent.color}15`, borderColor: `${agent.color}25` }}
              >
                <span style={{ color: agent.color }}>
                  <AgentIcon />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[22px] leading-none font-semibold text-white">
                    {agent.name}
                  </h2>
                  {agent.status === "beta" && (
                    <span className="text-[9px] font-medium text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      Beta
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-white/40 mt-2 max-w-[680px]">
                  {agent.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:justify-end">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 min-w-[112px]">
                <p className="text-[10px] text-white/35">当前阶段</p>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: statusColor }}>
                  {phaseLabel}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 min-w-[112px]">
                <p className="text-[10px] text-white/35">参数字段</p>
                <p className="text-[12px] text-white/70 mt-0.5">
                  {configSchema ? `${configSchema.fields.length} 项` : "加载中"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 min-w-[112px]">
                <p className="text-[10px] text-white/35">必填项</p>
                <p className="text-[12px] text-white/70 mt-0.5">
                  {configSchema ? `${requiredFieldCount} 项` : "--"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && taskStatus === "failed" && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10 animate-fadeIn">
            <p className="text-[13px] text-red-400/80">{error}</p>
            <button
              onClick={resetExecution}
              className="mt-2 text-[12px] text-white/40 hover:text-white/60 underline transition-colors"
            >
              重试
            </button>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1.08fr)_360px]">
          <div className="min-w-0 space-y-4">
            {/* Config Phase */}
            {phase === "config" && (
              <>
                {loadingSchema ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="space-y-4">
                      <div className="h-4 w-20 rounded bg-white/[0.04] animate-pulse" />
                      <div className="space-y-3">
                        <div className="h-3 w-16 rounded bg-white/[0.03] animate-pulse" />
                        <div className="h-10 w-full rounded-xl bg-white/[0.03] animate-pulse" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 w-16 rounded bg-white/[0.03] animate-pulse" />
                        <div className="flex gap-2">
                          <div className="h-8 w-20 rounded-lg bg-white/[0.03] animate-pulse" />
                          <div className="h-8 w-20 rounded-lg bg-white/[0.03] animate-pulse" />
                          <div className="h-8 w-20 rounded-lg bg-white/[0.03] animate-pulse" />
                        </div>
                      </div>
                      <div className="h-11 w-full rounded-xl bg-white/[0.04] animate-pulse mt-6" />
                    </div>
                  </div>
                ) : configSchema ? (
                  <AgentConfig agent={agent} schema={configSchema} />
                ) : (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                    <p className="text-[13px] text-white/35">
                      {error || "无法加载配置"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Progress Phase */}
            {phase === "progress" && (
              agentId === "batch" ? (
                <BatchExecutionCanvas
                  progress={progress}
                  traceEvents={traceEvents}
                  onStop={taskStatus === "running" ? cancelExecution : undefined}
                  resultReady={taskStatus === "completed" && !!result}
                  onViewResult={() => setShowBatchResult(true)}
                />
              ) : (
                <AgentProgress
                  agent={agent}
                  progress={progress}
                  streamContent={streamContent}
                  onStop={cancelExecution}
                />
              )
            )}

            {/* Result Phase */}
            {phase === "result" && result && (
              agentId === "batch" ? (
                <BatchResult
                  agent={agent}
                  result={result}
                  onBack={() => router.push("/workspace/agent")}
                  onReset={resetExecution}
                />
              ) : (
                <AgentResult
                  agent={agent}
                  result={result}
                  onBack={() => router.push("/workspace/agent")}
                  onReset={resetExecution}
                />
              )
            )}
          </div>

          <aside className="xl:sticky xl:top-4 h-fit space-y-4">
            <div className="rounded-2xl border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.28)]">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: statusColor,
                    animation: phase === "progress" ? "dotPulse 1.4s ease infinite" : "none",
                  }}
                />
                <h3 className="text-[13px] font-medium text-white/75">执行状态</h3>
              </div>

              <p className="text-[16px] font-semibold" style={{ color: statusColor }}>
                {phaseLabel}
              </p>
              <p className="text-[12px] text-white/45 mt-1 leading-relaxed">
                {phaseHint}
              </p>

              {phase === "progress" && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-[11px] text-white/35 mb-1">实时进度</p>
                  <p className="text-[20px] leading-none font-semibold" style={{ color: agent.color }}>
                    {progress?.progress ?? 0}%
                  </p>
                  <button
                    type="button"
                    onClick={cancelExecution}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all hover:bg-red-500/10 w-full justify-center"
                    style={{
                      borderColor: "rgba(239,68,68,0.2)",
                      color: "rgba(239,68,68,0.55)",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
                    </svg>
                    停止执行
                  </button>
                </div>
              )}

              {phase === "result" && result?.metadata?.duration !== undefined && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-[11px] text-white/35 mb-1">执行耗时</p>
                  <p className="text-[14px] text-white/70">{result.metadata.duration}s</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.28)]">
              <h3 className="text-[13px] font-medium text-white/75 mb-3">填写与执行建议</h3>

              {topFields.length > 0 ? (
                <div className="space-y-2.5">
                  {topFields.map((field) => (
                    <div
                      key={field.name}
                      className="rounded-xl px-3 py-2.5 border border-white/[0.06] bg-white/[0.01]"
                    >
                      <p className="text-[11px] text-white/35">
                        {field.required ? "必填字段" : "可选字段"}
                      </p>
                      <p className="text-[12px] text-white/70 mt-0.5">{field.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-white/40 leading-relaxed">
                  参数模板加载后，会在这里展示关键字段与填写建议。
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/workspace/agent")}
                  className="px-3 py-1.5 rounded-lg text-[12px] border border-white/[0.08] text-white/55 hover:text-white/75 hover:border-white/[0.14] transition-colors"
                >
                  返回列表
                </button>
                {phase !== "config" && (
                  <button
                    type="button"
                    onClick={resetExecution}
                    className="px-3 py-1.5 rounded-lg text-[12px] border transition-colors"
                    style={{
                      borderColor: `${moduleAccent}3e`,
                      background: `${moduleAccent}14`,
                      color: moduleAccent,
                    }}
                  >
                    重新执行
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
