"use client";

import { useState } from "react";

interface CreateSkillModalProps {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string; category: string }) => Promise<void>;
}

export function CreateSkillModal({ open, submitting = false, onClose, onSubmit }: CreateSkillModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[720px] rounded-2xl border border-white/[0.12] bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] shadow-[0_22px_58px_rgba(0,0,0,0.45)]">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-[18px] text-white/92">创建技能（MVP Mock）</h3>
          <button type="button" onClick={onClose} className="text-white/45 hover:text-white/75 transition-colors text-[18px]">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] text-white/55 mb-1.5">技能名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-[14px] text-white/86 placeholder:text-white/25 outline-none focus:border-skills/45"
              placeholder="例如：企业批量风险筛查技能"
            />
          </div>
          <div>
            <label className="block text-[12px] text-white/55 mb-1.5">技能描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-[14px] text-white/86 placeholder:text-white/25 outline-none focus:border-skills/45 resize-y"
              placeholder="简述技能能力、输入输出、适用场景"
            />
          </div>
          <div>
            <label className="block text-[12px] text-white/55 mb-1.5">技能分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-[14px] text-white/86 outline-none focus:border-skills/45"
            >
              <option value="general">通用</option>
              <option value="risk">风控</option>
              <option value="data">数据处理</option>
              <option value="insight">洞察分析</option>
            </select>
          </div>

          {error && <p className="text-[12px] text-red-400/82">{error}</p>}

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/[0.12] text-white/60 hover:text-white/82 hover:bg-white/[0.05] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                const trimmedName = name.trim();
                const trimmedDesc = description.trim();
                if (!trimmedName || !trimmedDesc) {
                  setError("请填写技能名称与描述");
                  return;
                }
                setError("");
                await onSubmit({ name: trimmedName, description: trimmedDesc, category });
                setName("");
                setDescription("");
                setCategory("general");
              }}
              className="px-4 py-2 rounded-lg border border-skills/45 bg-skills/20 text-skills hover:bg-skills/28 transition-colors disabled:opacity-55"
            >
              {submitting ? "提交中..." : "提交审核"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
