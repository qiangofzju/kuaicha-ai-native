"use client";

import { useRef, useState } from "react";
import type { SkillConfigSchema, SkillDefinition } from "@/types/skill";
import { useSkillStore } from "@/stores/skillStore";
import { Icons } from "@/components/shared/Icons";
import { skillService } from "@/services/skillService";

interface SkillConfigProps {
  skill: SkillDefinition;
  schema: SkillConfigSchema;
}

const BATCH_SCENARIO_HINTS: Record<string, string> = {
  filter: "按条件筛选企业名单，支持地域/行业/资质/AI方向等组合条件。",
  export: "上传企业名单或直接自然语言指定企业，并描述要导出的字段，系统自动匹配可用字段。",
  derived: "按多表关联自动计算衍生指标，适合增长率、风险计数、股东集中度等分析导出。",
};

const BATCH_SCENARIO_EXAMPLES: Record<string, string[]> = {
  filter: [
    "杭州市今年的人工智能企业有哪些？",
    "筛选杭州高新技术企业中近三年净利润持续增长的名单",
    "北京和杭州两地AI能力等级L4及以上企业名单",
  ],
  export: [
    "导出同花顺、东方财富、大智慧的第一大股东、近1年法院公告数和最新案号",
    "导出杭州海康威视、安恒信息的AI方向、模型产品、应用场景",
    "导出杭州信息技术企业的企业名称、法人、信用代码、上市状态",
  ],
  derived: [
    "导出杭州信息技术企业的营收CAGR、净利润增长率、ROE、资产负债率",
    "导出杭州AI企业的AI强度评分、近1年司法公告数和高风险事件数",
    "导出深圳制造业企业的第一大股东持股比例和营收两年增长率",
  ],
};

export function SkillConfig({ skill, schema }: SkillConfigProps) {
  const formValues = useSkillStore((s) => s.formValues);
  const setFormValue = useSkillStore((s) => s.setFormValue);
  const executeSkill = useSkillStore((s) => s.executeSkill);
  const executing = useSkillStore((s) => s.executing);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isBatch = schema.skill_id === "batch";
  const scenario = String(formValues.scenario ?? "filter");
  const uploadedCompanyCount = Array.isArray(formValues.company_names)
    ? (formValues.company_names as string[]).length
    : 0;
  const activeBatchExamples = isBatch
    ? (BATCH_SCENARIO_EXAMPLES[scenario] || BATCH_SCENARIO_EXAMPLES.filter)
    : [];
  const batchQueryPlaceholder = activeBatchExamples[0] || "请输入企业库批量处理需求";
  const accent = skill.color || "#F59E0B";

  const handleFileUpload = async (fieldName: string, file: File) => {
    setUploadingField(fieldName);
    try {
      const data = await skillService.uploadCompanyList(file);
      setFormValue("company_names", data.companies);
      setFormValue(fieldName, file.name);
      setUploadedFiles((prev) => ({ ...prev, [fieldName]: file.name }));
    } catch {
      setValidationErrors((prev) => ({ ...prev, [fieldName]: "文件解析失败，请检查格式" }));
    } finally {
      setUploadingField(null);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const val = formValues[field.name];
      if (
        val === undefined ||
        val === null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0)
      ) {
        errors[field.name] = `${field.label}不能为空`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div
      className="p-6 rounded-2xl border animate-fadeIn"
      style={{
        background: `linear-gradient(135deg, ${accent}14, var(--select-option-bg))`,
        boxShadow: "var(--card-inset), var(--shadow-hard)",
        borderColor: `${accent}36`,
      }}
    >
      <h3 className="text-sm font-medium text-white/70 mb-4">配置参数</h3>

      {isBatch && (
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2.5">
          <p className="text-[12px] text-white/72 leading-relaxed">
            当前采用自然语言驱动：直接描述“要导出哪些企业的哪些信息/衍生指标”，系统自动执行分层选表、SQL 生成与交付。
          </p>
          <p className="text-[11px] text-white/42 leading-relaxed">
            {BATCH_SCENARIO_HINTS[scenario] || BATCH_SCENARIO_HINTS.filter}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {activeBatchExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setFormValue("query", example)}
                className="px-2.5 py-1 rounded-lg text-[11px] border transition-colors text-left"
                style={{
                  borderColor: `${accent}30`,
                  background: `${accent}10`,
                  color: "var(--text-sub)",
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {schema.fields.map((field) => {
          if (
            isBatch &&
            (field.name === "company_list_file" || field.name === "company_names_text") &&
            scenario !== "export"
          ) {
            return null;
          }

          return (
            <div key={field.name}>
              <label className="block text-[12px] text-white/50 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400/70 ml-0.5">*</span>}
              </label>

              {field.type === "text" && field.name === "query" && isBatch ? (
                <textarea
                  placeholder={batchQueryPlaceholder || field.placeholder || ""}
                  value={String(formValues[field.name] ?? "")}
                  onChange={(e) => setFormValue(field.name, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.035] border border-white/[0.12] text-sm text-white/82 placeholder:text-white/25 outline-none focus:border-white/[0.22] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] resize-y"
                />
              ) : field.type === "text" && field.name === "company_names_text" && isBatch ? (
                <textarea
                  placeholder={field.placeholder || ""}
                  value={String(formValues[field.name] ?? "")}
                  onChange={(e) => setFormValue(field.name, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.035] border border-white/[0.12] text-sm text-white/82 placeholder:text-white/25 outline-none focus:border-white/[0.22] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] resize-y"
                />
              ) : field.type === "text" ? (
                <input
                  type="text"
                  placeholder={field.placeholder || ""}
                  value={String(formValues[field.name] ?? "")}
                  onChange={(e) => setFormValue(field.name, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.035] border border-white/[0.12] text-sm text-white/82 placeholder:text-white/25 outline-none focus:border-white/[0.22] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                />
              ) : null}

              {field.type === "select" && (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((opt) => {
                    const selected = formValues[field.name] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormValue(field.name, opt.value)}
                        className="px-4 py-2 rounded-lg text-[12px] border transition-colors"
                        style={{
                          borderColor: selected ? `${accent}48` : "var(--select-option-border)",
                          background: selected ? `${accent}14` : "var(--select-option-bg)",
                          color: selected ? accent : "var(--text-muted)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === "file" && (
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    className="hidden"
                    ref={(el) => {
                      fileRefs.current[field.name] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(field.name, file);
                    }}
                  />
                  <div
                    className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
                    style={{
                      borderColor: uploadedFiles[field.name] ? `${accent}50` : "var(--upload-area-border)",
                      background: uploadedFiles[field.name] ? `${accent}08` : "var(--upload-area-bg)",
                    }}
                    onClick={() => fileRefs.current[field.name]?.click()}
                  >
                    {uploadingField === field.name ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                        <p className="text-[12px] text-white/40">正在解析文件…</p>
                      </div>
                    ) : uploadedFiles[field.name] ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Icons.Check size={18} className="text-[#10B981]" />
                        <p className="text-[12px]" style={{ color: accent }}>
                          已上传：{uploadedFiles[field.name]}
                        </p>
                        <p className="text-[11px] text-white/30">点击重新上传</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Icons.Upload size={22} className="text-white/25" />
                        <p className="text-[12px] text-white/45">点击上传企业名单</p>
                        <p className="text-[11px] text-white/25">支持 .xlsx .csv .txt，每行一个企业名称</p>
                      </div>
                    )}
                  </div>
                  {uploadedCompanyCount > 0 && (
                    <p className="text-[11px] text-white/35 mt-1.5">已解析企业 {uploadedCompanyCount} 家</p>
                  )}
                </div>
              )}

              {validationErrors[field.name] && (
                <p className="text-[11px] text-red-400/80 mt-1">{validationErrors[field.name]}</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={executing}
        onClick={() => {
          if (validate()) executeSkill();
        }}
        className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        }}
      >
        {executing ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            正在启动...
          </>
        ) : (
          <>
            <Icons.Play />
            开始执行
          </>
        )}
      </button>
    </div>
  );
}
