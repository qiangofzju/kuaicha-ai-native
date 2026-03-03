"use client";

import { useState } from "react";
import type { AgentDefinition, AgentResultData } from "@/types/agent";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { Icons } from "@/components/shared/Icons";
import { agentService } from "@/services/agentService";
import { theme } from "@/styles/theme";

interface AgentResultProps {
  agent: AgentDefinition;
  result: AgentResultData;
  onBack: () => void;
  onReset: () => void;
}

type TabKey = "findings" | "report" | "timeline";

const riskLevelColor: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

// Per-agent label configuration
const AGENT_LABEL_CONFIG: Record<string, {
  tabs: [string, string, string];
  ratingLabel: string;
  findingLevelLabels: Record<string, string>;
}> = {
  risk: {
    tabs: ["风险发现", "分析报告", "时间线"],
    ratingLabel: "风险评级",
    findingLevelLabels: { high: "高风险", medium: "中风险", low: "低风险" },
  },
  sentiment: {
    tabs: ["舆情概览", "事件详情", "时间线"],
    ratingLabel: "舆情等级",
    findingLevelLabels: { high: "负面", medium: "中性", low: "正面" },
  },
  tech: {
    tabs: ["技术指标", "评估报告", "里程碑"],
    ratingLabel: "科创评分",
    findingLevelLabels: { high: "领先", medium: "中等", low: "落后" },
  },
};

const DEFAULT_LABEL_CONFIG = AGENT_LABEL_CONFIG.risk;

function generateReportMarkdown(result: AgentResultData, agentName: string): string {
  const ratingLabels: Record<string, string> = {
    A: "低风险", B: "中等风险", C: "较高风险", D: "高风险", E: "极高风险",
  };
  const levelLabels: Record<string, string> = {
    high: "高", medium: "中", low: "低",
  };
  const trendLabels: Record<string, string> = {
    up: "↑上升", down: "↓下降", stable: "→稳定",
  };

  let md = `# ${agentName}报告\n\n`;
  if (result.risk_rating) {
    md += `**评级**: ${result.risk_rating} (${ratingLabels[result.risk_rating] || "未知"})\n\n`;
  }
  md += `## 摘要\n\n${result.summary}\n\n`;

  const findings = result.risk_findings || [];
  if (findings.length > 0) {
    md += `## 分析发现\n\n`;
    md += `| 维度 | 等级 | 评分 | 趋势 | 说明 |\n`;
    md += `|------|------|------|------|------|\n`;
    for (const f of findings) {
      const score = (f as Record<string, unknown>).score ?? "-";
      const trend = trendLabels[(f as Record<string, unknown>).trend as string] ?? "-";
      md += `| ${f.label} | ${levelLabels[f.level] || f.level} | ${score} | ${trend} | ${f.description} |\n`;
    }
    md += `\n`;
  }

  const sections = result.report_sections || [];
  if (sections.length > 0) {
    md += `## 分析报告\n\n`;
    for (const s of sections) {
      md += `### ${s.title}\n\n${s.content}\n\n`;
    }
  }

  const timeline = result.timeline || [];
  if (timeline.length > 0) {
    md += `## 重要事件时间线\n\n`;
    md += `| 日期 | 事件 | 等级 |\n`;
    md += `|------|------|------|\n`;
    for (const t of timeline) {
      md += `| ${t.date} | ${t.event} | ${levelLabels[t.level] || t.level} |\n`;
    }
    md += `\n`;
  }

  return md;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AgentResult({ agent, result, onBack, onReset }: AgentResultProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("findings");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const moduleAccent = theme.colors.modules.agent;

  const labelConfig = AGENT_LABEL_CONFIG[result.agent_type || agent.id] || DEFAULT_LABEL_CONFIG;
  const findings = result.risk_findings || [];
  const sections = result.report_sections || [];
  const timeline = result.timeline || [];

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Map letter rating (A-E) to risk level for the badge
  const ratingToLevel: Record<string, "high" | "medium" | "low"> = {
    A: "low", B: "low", C: "medium", D: "high", E: "high",
  };
  const riskLevel = result.risk_rating ? (ratingToLevel[result.risk_rating] ?? "medium") : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "findings", label: labelConfig.tabs[0] },
    { key: "report", label: labelConfig.tabs[1] },
    { key: "timeline", label: labelConfig.tabs[2] },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Summary Card */}
      <div className="p-6 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_42px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-white/70">分析摘要</h3>
          {riskLevel && result.risk_rating && (
            <RiskBadge level={riskLevel} />
          )}
        </div>
        <p className="text-[13px] text-white/60 leading-relaxed">
          {result.summary}
        </p>

        {/* Metadata */}
        {result.metadata && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
            {result.metadata.duration !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/35">
                <Icons.Clock />
                <span>耗时 {result.metadata.duration}s</span>
              </div>
            )}
            {result.metadata.data_points !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/35">
                <Icons.BarChart size={14} />
                <span>{result.metadata.data_points} 数据点</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 rounded-[10px] text-[12px] font-medium transition-all"
            style={{
              background:
                activeTab === tab.key
                  ? `${moduleAccent}16`
                  : "transparent",
              color:
                activeTab === tab.key
                  ? moduleAccent
                  : "rgba(255,255,255,0.4)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_42px_rgba(0,0,0,0.28)]">
        {/* Findings tab */}
        {activeTab === "findings" && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <p className="text-[13px] text-white/30 text-center py-8">
                暂无数据
              </p>
            ) : (
              findings.map((finding, i) => {
                const levelColor =
                  riskLevelColor[finding.level?.toLowerCase()] || "#6B7280";

                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] opacity-0 animate-fadeIn"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: levelColor }}
                        />
                        <span className="text-[13px] font-medium text-white/80">
                          {finding.label}
                        </span>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          color: levelColor,
                          background: `${levelColor}15`,
                        }}
                      >
                        {labelConfig.findingLevelLabels[finding.level] || finding.level}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/45 leading-relaxed pl-3.5">
                      {finding.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Report tab */}
        {activeTab === "report" && (
          <div className="space-y-2">
            {sections.length === 0 ? (
              <p className="text-[13px] text-white/30 text-center py-8">
                暂无报告内容
              </p>
            ) : (
              sections.map((section, i) => {
                const isExpanded = expandedSections.has(i);
                const levelColor = section.level
                  ? riskLevelColor[section.level.toLowerCase()] || moduleAccent
                  : moduleAccent;

                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.04] overflow-hidden opacity-0 animate-fadeIn"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <button
                      onClick={() => toggleSection(i)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {section.level && (
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: levelColor }}
                          />
                        )}
                        <span className="text-[13px] font-medium text-white/80">
                          {section.title}
                        </span>
                      </div>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className={`text-white/30 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <path d="M3 5l3 3 3-3" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 animate-fadeIn">
                        <div className="pl-3.5 border-l border-white/[0.06]">
                          <p className="text-[12px] text-white/50 leading-relaxed whitespace-pre-wrap">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === "timeline" && (
          <div className="relative">
            {timeline.length === 0 ? (
              <p className="text-[13px] text-white/30 text-center py-8">
                暂无时间线数据
              </p>
            ) : (
              <div className="space-y-0">
                {timeline.map((item, i) => {
                  const levelColor =
                    riskLevelColor[item.level?.toLowerCase()] || agent.color;

                  return (
                    <div
                      key={i}
                      className="relative flex gap-4 pb-6 last:pb-0 opacity-0 animate-fadeIn"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      {/* Timeline line */}
                      {i < timeline.length - 1 && (
                        <div className="absolute left-[5px] top-3 bottom-0 w-px bg-white/[0.06]" />
                      )}

                      {/* Timeline dot */}
                      <div
                        className="w-[11px] h-[11px] rounded-full shrink-0 mt-0.5 relative z-10"
                        style={{
                          background: levelColor,
                          boxShadow: `0 0 8px ${levelColor}30`,
                        }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] text-white/70">
                            {item.event}
                          </p>
                          <span className="text-[10px] text-white/30 shrink-0">
                            {item.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-colors"
        >
          返回列表
        </button>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-colors"
        >
          <Icons.Refresh />
          重新执行
        </button>
        <button
          onClick={() => agentService.exportResult(result.task_id, "pdf")}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${moduleAccent}, ${moduleAccent}cc)`,
          }}
        >
          <Icons.Export />
          PDF
        </button>
        <button
          onClick={() => agentService.exportResult(result.task_id, "excel")}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${moduleAccent}cc, ${moduleAccent}99)`,
          }}
        >
          <Icons.Export />
          Excel
        </button>
        <button
          onClick={() => {
            const md = generateReportMarkdown(result, agent.name);
            const date = new Date().toISOString().slice(0, 10);
            downloadFile(md, `${agent.name}_${date}.md`);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-colors"
        >
          <Icons.Export />
          Markdown
        </button>
      </div>
    </div>
  );
}
