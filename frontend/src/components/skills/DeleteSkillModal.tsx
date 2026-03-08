"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "@/components/shared/Icons";

interface DeleteSkillModalProps {
  open: boolean;
  skillName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSkillModal({
  open,
  skillName,
  loading = false,
  onClose,
  onConfirm,
}: DeleteSkillModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-[24px] border shadow-[0_26px_72px_rgba(0,0,0,0.48)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)) , var(--panel-bg)",
          borderColor: "rgba(248,113,113,0.22)",
        }}
      >
        <div className="border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
              <Icons.Trash size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-red-300/80">
                Delete Skill
              </p>
              <h3 className="mt-1 text-[18px] font-semibold text-white/92">确认删除技能</h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[13px] leading-6 text-white/76">
              删除后，该技能会从技能广场和“我的技能”中移除，相关文件目录也会被一并清理。
            </p>
            <p className="mt-3 text-[13px] text-white/44">
              仅支持删除你自己创建的技能，官方技能不会显示该操作。
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3">
            <p className="text-[12px] text-white/38">目标技能</p>
            <p className="mt-1 text-[15px] font-medium text-white/90">{skillName || "--"}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[13px] text-white/72 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/12 px-4 py-2 text-[13px] text-red-200 transition-colors hover:bg-red-400/18 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icons.Trash size={14} />
            {loading ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
