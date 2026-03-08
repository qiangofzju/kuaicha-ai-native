"use client";

import { Icons } from "@/components/shared/Icons";

interface SkillMarketHeaderProps {
  activeTab: "store" | "mine";
  onTabChange: (tab: "store" | "mine") => void;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenPurchaseRecords: () => void;
  onOpenCreate: () => void;
}

export function SkillMarketHeader({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onOpenPurchaseRecords,
  onOpenCreate,
}: SkillMarketHeaderProps) {
  return (
    <section
      className="relative overflow-hidden rounded-[30px] border px-6 py-6 md:px-8 md:py-7"
      style={{
        background: "var(--bg-root)",
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "var(--card-inset), 0 18px 52px rgba(0,0,0,0.34)",
      }}
    >
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-skills">
                <Icons.Sparkle size={13} />
              </span>
              <span className="text-[11px] font-medium tracking-[0.12em] text-skills/90">SKILL MARKET</span>
            </div>
            <h2 className="text-[24px] font-semibold leading-tight text-white md:text-[28px]">技能广场</h2>
            <p className="mt-3 text-[13.5px] text-white/46 md:text-[14px]">
              把可复用业务能力沉淀为标准技能，统一交付与调用
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="flex w-full items-center gap-2 rounded-[18px] border border-white/[0.10] bg-white/[0.02] px-4 py-3 lg:w-[420px]">
              <Icons.Search className="text-white/32" size={15} />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索技能"
                className="w-full bg-transparent text-[13px] text-white/84 outline-none placeholder:text-white/24"
              />
            </div>
            <button
              type="button"
              onClick={onOpenPurchaseRecords}
              className="rounded-[18px] border border-white/[0.16] bg-white/[0.02] px-5 py-3 text-[13px] text-white/78 transition-colors hover:bg-white/[0.05]"
            >
              购买记录
            </button>
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-2 rounded-[20px] border px-5 py-3 text-[13px] text-skills transition-colors"
              style={{
                borderColor: "rgba(245,158,11,0.40)",
                background: "rgba(245,158,11,0.12)",
              }}
            >
              <Icons.Plus size={14} />
              创建技能
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange("store")}
              className="rounded-[16px] border px-4 py-2.5 text-[14px] transition-colors"
              style={{
                color: activeTab === "store" ? "var(--text-main)" : "var(--text-muted)",
                borderColor: activeTab === "store" ? "rgba(245,158,11,0.34)" : "rgba(255,255,255,0.10)",
                background: activeTab === "store" ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.02)",
              }}
            >
              技能商店
            </button>
            <button
              type="button"
              onClick={() => onTabChange("mine")}
              className="rounded-[16px] border px-4 py-2.5 text-[14px] transition-colors"
              style={{
                color: activeTab === "mine" ? "var(--text-main)" : "var(--text-muted)",
                borderColor: activeTab === "mine" ? "rgba(245,158,11,0.34)" : "rgba(255,255,255,0.10)",
                background: activeTab === "mine" ? "rgba(245,158,11,0.14)" : "rgba(255,255,255,0.02)",
              }}
            >
              我的技能
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
