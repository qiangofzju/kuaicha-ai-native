"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillMarketHeader } from "@/components/skills/SkillMarketHeader";
import { SkillGrid } from "@/components/skills/SkillGrid";
import { SkillSection } from "@/components/skills/SkillSection";
import { PurchaseRecordsModal } from "@/components/skills/PurchaseRecordsModal";
import { DeleteSkillModal } from "@/components/skills/DeleteSkillModal";
import { useSkillStore } from "@/stores/skillStore";
import { theme } from "@/styles/theme";
import type { SkillDefinition, SkillStoreSection } from "@/types/skill";

type HintTone = "warning" | "success" | "danger";

export default function SkillsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"store" | "mine">("store");
  const [search, setSearch] = useState("");
  const [openPurchase, setOpenPurchase] = useState(false);
  const [hint, setHint] = useState<{ message: string; tone: HintTone } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillDefinition | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeSections = useSkillStore((s) => s.storeSections);
  const mySkills = useSkillStore((s) => s.mySkills);
  const purchaseRecords = useSkillStore((s) => s.purchaseRecords);
  const loadingStore = useSkillStore((s) => s.loadingStore);
  const loadingSkills = useSkillStore((s) => s.loadingSkills);
  const loadingPurchaseRecords = useSkillStore((s) => s.loadingPurchaseRecords);
  const deletingSkillId = useSkillStore((s) => s.deletingSkillId);
  const loadMarketplace = useSkillStore((s) => s.loadMarketplace);
  const loadPurchaseRecords = useSkillStore((s) => s.loadPurchaseRecords);
  const deleteSkill = useSkillStore((s) => s.deleteSkill);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    if (openPurchase) {
      loadPurchaseRecords();
    }
  }, [openPurchase, loadPurchaseRecords]);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

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

  const showHint = (message: string, tone: HintTone = "warning") => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint({ message, tone });
    hintTimerRef.current = setTimeout(() => setHint(null), 2400);
  };

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
      showHint(`${skill.name} 即将上线`);
      return;
    }
    router.push(`/workspace/skills/${skill.id}`);
  };

  const handleRequestDelete = (skill: SkillDefinition) => {
    const isUserCreated =
      skill.deletable === true ||
      skill.source === "builder" ||
      skill.source_raw === "user_generated" ||
      skill.author === "@SkillCreator" ||
      skill.tags.includes("用户创建");
    if (!isUserCreated) {
      showHint("官方技能不支持删除");
      return;
    }
    setDeleteTarget(skill);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const deletedName = deleteTarget.name;
      await deleteSkill(deleteTarget.id);
      setDeleteTarget(null);
      showHint(`${deletedName} 已删除`, "success");
    } catch (err) {
      showHint(err instanceof Error ? err.message : "删除技能失败", "danger");
    }
  };

  const hintStyle = useMemo(() => {
    if (!hint) return null;
    if (hint.tone === "success") {
      return {
        borderColor: "rgba(52,211,153,0.28)",
        background: "rgba(52,211,153,0.12)",
        color: "rgb(110,231,183)",
      };
    }
    if (hint.tone === "danger") {
      return {
        borderColor: "rgba(248,113,113,0.26)",
        background: "rgba(248,113,113,0.12)",
        color: "rgb(252,165,165)",
      };
    }
    return {
      borderColor: "rgba(245,158,11,0.34)",
      background: "rgba(245,158,11,0.12)",
      color: "rgb(245,158,11)",
    };
  }, [hint]);

  return (
    <div className="h-full overflow-y-auto p-6 animate-fadeIn">
      <div className="max-w-[1280px] mx-auto space-y-7">
        <SkillMarketHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          onOpenPurchaseRecords={() => setOpenPurchase(true)}
          onOpenCreate={() => router.push("/workspace/skills/create")}
        />

        {hint && hintStyle && (
          <div
            className="rounded-xl border px-4 py-2.5 text-[13px] animate-fadeIn"
            style={hintStyle}
          >
            {hint.message}
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
                onDeleteSkill={handleRequestDelete}
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
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h3 className="text-[20px] font-semibold tracking-[-0.01em] text-white/88">我的技能</h3>
              {filteredMine.length > 0 && (
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-white/36">
                  {filteredMine.length}
                </span>
              )}
              <span className="h-3.5 w-px bg-white/[0.08]" />
              <p className="text-[13px] text-white/34">已拥有技能可直接进入执行，持续复用历史配置与流程</p>
            </div>
            <SkillGrid skills={filteredMine} onOpenSkill={handleOpenSkill} onDeleteSkill={handleRequestDelete} />
          </div>
        )}
      </div>

      <PurchaseRecordsModal
        open={openPurchase}
        records={purchaseRecords}
        loading={loadingPurchaseRecords}
        onClose={() => setOpenPurchase(false)}
      />
      <DeleteSkillModal
        open={Boolean(deleteTarget)}
        skillName={deleteTarget?.name}
        loading={Boolean(deleteTarget && deletingSkillId === deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
