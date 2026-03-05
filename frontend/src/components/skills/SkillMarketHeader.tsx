"use client";

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
    <div
      className="rounded-2xl border px-5 py-4 md:px-6 md:py-5"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-inset), var(--shadow-mid)",
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] tracking-[0.14em] text-skills/90">SKILL MARKET</span>
            <span className="h-px w-8 bg-skills/35" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange("store")}
              className="px-3 py-1.5 rounded-lg border text-[14px] transition-colors"
              style={{
                color: activeTab === "store" ? "var(--text-main)" : "var(--text-muted)",
                borderColor: activeTab === "store" ? "rgba(245,158,11,0.34)" : "var(--tag-border)",
                background: activeTab === "store" ? "rgba(245,158,11,0.14)" : "var(--tag-bg)",
              }}
            >
              技能商店
            </button>
            <button
              type="button"
              onClick={() => onTabChange("mine")}
              className="px-3 py-1.5 rounded-lg border text-[14px] transition-colors"
              style={{
                color: activeTab === "mine" ? "var(--text-main)" : "var(--text-muted)",
                borderColor: activeTab === "mine" ? "rgba(245,158,11,0.34)" : "var(--tag-border)",
                background: activeTab === "mine" ? "rgba(245,158,11,0.14)" : "var(--tag-bg)",
              }}
            >
              我的技能
            </button>
          </div>
          <p className="text-[13px] text-white/42 mt-3">
            复用 Agent 执行引擎，聚焦可复用能力的标准化交付
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="w-full lg:w-[280px] px-3.5 py-2 rounded-xl border border-white/[0.10] bg-white/[0.02] flex items-center gap-2">
            <span className="text-white/35 text-[13px]">⌕</span>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索技能"
              className="w-full bg-transparent border-none outline-none text-[13px] text-white/84 placeholder:text-white/30"
            />
          </div>
          <button
            type="button"
            onClick={onOpenPurchaseRecords}
            className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-white/[0.02] text-[13px] text-white/78 hover:bg-white/[0.05] transition-colors"
          >
            购买记录
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-3.5 py-2 rounded-xl border text-[13px] text-skills transition-colors inline-flex items-center gap-1.5"
            style={{
              borderColor: "rgba(245,158,11,0.38)",
              background: "rgba(245,158,11,0.14)",
            }}
          >
            <span className="text-[16px] leading-none">＋</span>
            创建技能
          </button>
        </div>
      </div>
    </div>
  );
}
