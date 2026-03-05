"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillMarketHeader } from "@/components/skills/SkillMarketHeader";
import { SkillGrid } from "@/components/skills/SkillGrid";
import { SkillSection } from "@/components/skills/SkillSection";
import { CreateSkillModal } from "@/components/skills/CreateSkillModal";
import { PurchaseRecordsModal } from "@/components/skills/PurchaseRecordsModal";
import { skillService } from "@/services/skillService";
import { useSkillStore } from "@/stores/skillStore";
import { theme } from "@/styles/theme";
import type { SkillDefinition, SkillStoreSection } from "@/types/skill";

export default function SkillsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"store" | "mine">("store");
  const [search, setSearch] = useState("");
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const storeSections = useSkillStore((s) => s.storeSections);
  const mySkills = useSkillStore((s) => s.mySkills);
  const purchaseRecords = useSkillStore((s) => s.purchaseRecords);
  const loadingStore = useSkillStore((s) => s.loadingStore);
  const loadingSkills = useSkillStore((s) => s.loadingSkills);
  const loadingPurchaseRecords = useSkillStore((s) => s.loadingPurchaseRecords);
  const loadMarketplace = useSkillStore((s) => s.loadMarketplace);
  const loadPurchaseRecords = useSkillStore((s) => s.loadPurchaseRecords);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    if (openPurchase) {
      loadPurchaseRecords();
    }
  }, [openPurchase, loadPurchaseRecords]);

  const fallbackSections = useMemo<SkillStoreSection[]>(() => {
    const all = [...theme.skills] as unknown as SkillDefinition[];
    return [
      {
        id: "featured",
        title: "编辑推荐",
        subtitle: "精选技能，快速启动业务流程",
        style: "hero",
        items: all.slice(0, 2),
      },
      {
        id: "curated",
        title: "编辑精选",
        subtitle: "覆盖风控、趋势、图谱与数据交付等典型场景",
        style: "grid",
        items: all.slice(2),
      },
    ];
  }, []);

  const sections = storeSections.length > 0 ? storeSections : fallbackSections;

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => {
        const items = section.items.filter((item) => {
          const haystack = [
            item.name,
            item.description,
            item.author,
            ...item.tags,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [sections, search]);

  const filteredMine = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = mySkills.length > 0 ? mySkills : ([theme.skills[0]] as unknown as SkillDefinition[]);
    if (!q) return source;
    return source.filter((item) => {
      const haystack = [item.name, item.description, item.author, ...item.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [mySkills, search]);

  const handleOpenSkill = (skill: SkillDefinition) => {
    if (skill.market_status !== "ready") {
      setHint(`${skill.name} 即将上线`);
      setTimeout(() => setHint(null), 2200);
      return;
    }
    router.push(`/workspace/skills/${skill.id}`);
  };

  return (
    <div className="h-full overflow-y-auto p-6 animate-fadeIn">
      <div className="max-w-[1280px] mx-auto space-y-7">
        <SkillMarketHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          onOpenPurchaseRecords={() => setOpenPurchase(true)}
          onOpenCreate={() => setOpenCreate(true)}
        />

        {hint && (
          <div
            className="rounded-xl border px-4 py-2.5 text-[13px] animate-fadeIn"
            style={{
              borderColor: "rgba(245,158,11,0.34)",
              background: "rgba(245,158,11,0.12)",
              color: "rgb(245,158,11)",
            }}
          >
            {hint}
          </div>
        )}

        {(loadingStore || loadingSkills) && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-8 text-center text-white/45">
            正在加载技能广场...
          </div>
        )}

        {!loadingStore && !loadingSkills && activeTab === "store" && (
          <div className="space-y-10">
            {filteredSections.map((section, idx) => (
              <SkillSection
                key={section.id}
                section={section}
                onOpenSkill={handleOpenSkill}
                showMore={idx > 0}
              />
            ))}
            {filteredSections.length === 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-8 text-center text-white/40">
                没有匹配的技能
              </div>
            )}
          </div>
        )}

        {!loadingStore && !loadingSkills && activeTab === "mine" && (
          <div className="space-y-3">
            <h3 className="text-[22px] font-semibold text-white/92">我的技能</h3>
            <p className="text-[13px] text-white/40">已拥有技能可直接进入执行，持续复用历史配置与流程。</p>
            <SkillGrid skills={filteredMine} onOpenSkill={handleOpenSkill} />
          </div>
        )}
      </div>

      <PurchaseRecordsModal
        open={openPurchase}
        records={purchaseRecords}
        loading={loadingPurchaseRecords}
        onClose={() => setOpenPurchase(false)}
      />

      <CreateSkillModal
        open={openCreate}
        submitting={createSubmitting}
        onClose={() => setOpenCreate(false)}
        onSubmit={async (payload) => {
          setCreateSubmitting(true);
          try {
            const resp = await skillService.createSkill(payload);
            setHint(resp.message || "提交成功");
            setOpenCreate(false);
            setTimeout(() => setHint(null), 2600);
          } finally {
            setCreateSubmitting(false);
          }
        }}
      />
    </div>
  );
}
