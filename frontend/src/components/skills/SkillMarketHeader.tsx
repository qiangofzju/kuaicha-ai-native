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
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => onTabChange("store")}
          className="text-[34px] sm:text-[42px] font-semibold transition-colors"
          style={{ color: activeTab === "store" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)" }}
        >
          技能商店
        </button>
        <button
          type="button"
          onClick={() => onTabChange("mine")}
          className="text-[34px] sm:text-[42px] font-semibold transition-colors"
          style={{ color: activeTab === "mine" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)" }}
        >
          我的技能
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-[300px] max-w-[62vw] px-4 py-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.035] flex items-center gap-2">
          <span className="text-white/35">⌕</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索更多技能"
            className="w-full bg-transparent border-none outline-none text-[14px] text-white/85 placeholder:text-white/32"
          />
        </div>
        <button
          type="button"
          onClick={onOpenPurchaseRecords}
          className="px-4 py-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.035] text-[18px] text-white/85 hover:bg-white/[0.06] transition-colors"
        >
          购买记录
        </button>
        <button
          type="button"
          onClick={onOpenCreate}
          className="px-4 py-2.5 rounded-2xl border border-skills/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(245,158,11,0.12))] text-[18px] text-skills hover:bg-skills/30 transition-colors inline-flex items-center gap-2"
        >
          <span className="text-[20px] leading-none">＋</span>
          创建技能
        </button>
      </div>
    </div>
  );
}
