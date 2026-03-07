"use client";

import { useMemo, useState } from "react";
import type { SkillDefinition, SkillResultData } from "@/types/skill";

interface SkillResultPanelProps {
  skill: SkillDefinition;
  result: SkillResultData;
  onBack: () => void;
  onReset: () => void;
  onExport: (taskId: string, format: "excel" | "pdf") => Promise<{ fallback?: string | null; filename: string }>;
  allowExport?: boolean;
}

export function SkillResultPanel({ skill, result, onBack, onReset, onExport, allowExport = true }: SkillResultPanelProps) {
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportHint, setExportHint] = useState<string>("");

  const columns = useMemo(() => result.columns || [], [result.columns]);
  const rows = useMemo(() => result.preview_rows || [], [result.preview_rows]);
  const generatedMode = result.query_type === "generated" || result.result_mode === "inline_delivery";

  const taskId = result.task_id || result.run_id;

  const handleExport = async (format: "excel" | "pdf") => {
    if (!taskId) return;
    setExporting(format);
    setExportHint("");
    try {
      const info = await onExport(taskId, format);
      if (info.fallback) {
        setExportHint("Excel 依赖缺失，已自动降级为 CSV 导出");
      }
    } catch (err) {
      setExportHint(err instanceof Error ? err.message : "导出失败，请稍后重试");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-inset), var(--shadow-mid)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] text-white/45">{skill.name}</p>
            <h3 className="text-[18px] text-white/92 mt-1">执行结果</h3>
            <p className="text-[13px] text-white/58 mt-2 leading-relaxed max-w-[860px]">{result.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            {allowExport && !generatedMode && (
              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={!taskId || exporting !== null}
                className="px-3.5 py-2 rounded-lg text-[12px] border transition-colors disabled:opacity-50"
                style={{ borderColor: `${skill.color}55`, color: skill.color, background: `${skill.color}14` }}
              >
                {exporting === "excel" ? "导出中..." : "下载 Excel"}
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2 rounded-lg text-[12px] border border-white/[0.12] text-white/70 hover:text-white/88 hover:bg-white/[0.04] transition-colors"
            >
              重新执行
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 rounded-lg text-[12px] border border-white/[0.12] text-white/60 hover:text-white/85 transition-colors"
            >
              返回广场
            </button>
          </div>
        </div>
        {exportHint && <p className="text-[12px] text-amber-300/80 mt-3">{exportHint}</p>}
      </div>

      {generatedMode && (
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-5">
          <h4 className="text-[13px] text-white/75 mb-2">技能交付说明</h4>
          <p className="text-[13px] text-white/60 leading-relaxed">
            {result.delivery_notes || `当前技能已完成执行，共返回 ${rows.length} 条结构化内容。你可以继续提交更细化的请求。`}
          </p>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <h4 className="text-[12px] text-white/70">{generatedMode ? "结构化结果" : "预览数据"}</h4>
          <span className="text-[11px] text-white/40">总计 {result.total_count ?? rows.length} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: `${skill.color}10` }}>
                {(columns.length ? columns : [{ key: "_empty", label: "字段", type: "text" }]).map((col) => (
                  <th key={col.key} className="text-left px-3 py-2 border-b border-white/[0.07] text-white/70 font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-white/40" colSpan={Math.max(1, columns.length)}>
                    暂无可展示数据
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-white/75 whitespace-nowrap">
                      {String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
