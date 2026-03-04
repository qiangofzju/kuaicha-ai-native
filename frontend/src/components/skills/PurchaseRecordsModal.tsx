"use client";

import type { PurchaseRecord } from "@/types/skill";

interface PurchaseRecordsModalProps {
  open: boolean;
  records: PurchaseRecord[];
  loading?: boolean;
  onClose: () => void;
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function PurchaseRecordsModal({ open, records, loading = false, onClose }: PurchaseRecordsModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] rounded-2xl border border-white/[0.12] bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] shadow-[0_22px_58px_rgba(0,0,0,0.45)]">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-[18px] text-white/92">购买记录</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/45 hover:text-white/75 transition-colors text-[18px]"
          >
            ×
          </button>
        </div>
        <div className="p-5 max-h-[420px] overflow-y-auto space-y-3">
          {loading && <p className="text-[13px] text-white/40">正在加载购买记录...</p>}
          {!loading && records.length === 0 && (
            <p className="text-[13px] text-white/40">暂无购买记录</p>
          )}
          {records.map((record) => (
            <div
              key={record.record_id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] text-white/85">{record.skill_name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded border border-white/[0.12] text-white/60">
                  {record.price_type === "free" ? "免费" : `${record.amount} ${record.currency}`}
                </span>
              </div>
              <p className="text-[12px] text-white/35 mt-1">{fmtTime(record.purchased_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
