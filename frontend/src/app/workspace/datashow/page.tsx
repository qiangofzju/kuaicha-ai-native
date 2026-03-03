"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDatashowStore } from "@/stores/datashowStore";
import { Skeleton } from "@/components/ui/skeleton";
import { NLQueryBar } from "@/components/datashow/NLQueryBar";
import { DynamicChart } from "@/components/datashow/DynamicChart";
import { DashboardCards } from "@/components/datashow/DashboardCards";
import { RiskTrendChart } from "@/components/datashow/RiskTrendChart";
import { IndustryDonut } from "@/components/datashow/IndustryDonut";
import { AlertFeed } from "@/components/datashow/AlertFeed";
import { InsightCards } from "@/components/datashow/InsightCards";
import { RelationshipGraph } from "@/components/datashow/RelationshipGraph";
import { TrendAnalysis } from "@/components/datashow/TrendAnalysis";
import { RelationshipExplorer } from "@/components/datashow/RelationshipExplorer";
import { TrendExplorer } from "@/components/datashow/TrendExplorer";
import { theme } from "@/styles/theme";

function DashboardSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto">
      {/* NL Query bar skeleton */}
      <Skeleton className="h-12 rounded-2xl mb-6 bg-white/[0.04]" />

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px] rounded-2xl bg-white/[0.04]" />
        ))}
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Skeleton className="h-[280px] rounded-2xl bg-white/[0.04]" />
          <Skeleton className="h-[280px] rounded-2xl bg-white/[0.04]" />
        </div>
        <Skeleton className="h-[572px] rounded-2xl bg-white/[0.04]" />
      </div>

      {/* Insight cards skeleton */}
      <div className="mt-4">
        <Skeleton className="h-5 w-20 mb-3 bg-white/[0.04]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[80px] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "概览面板", emoji: "▦" },
  { id: "trend", label: "趋势分析", emoji: "▤" },
  { id: "relation", label: "关系图谱", emoji: "◎" },
  { id: "geo", label: "地域分布", emoji: "◉" },
  { id: "compare", label: "多维对比", emoji: "▧" },
];

function TabSync() {
  const searchParams = useSearchParams();
  const setActiveTab = useDatashowStore((s) => s.setActiveTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "trend", "relation", "geo", "compare"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  return null;
}

export default function DatashowPage() {
  const { overview, isLoading, error, loadOverview, nlChart, nlLoading, nlError, activeTab, setActiveTab } =
    useDatashowStore();
  const moduleAccent = theme.colors.modules.datashow;

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="h-full overflow-y-auto p-6 animate-fadeIn">
      <Suspense fallback={null}><TabSync /></Suspense>
      {/* Error state */}
      {error && (
        <div className="max-w-[1200px] mx-auto mb-4 p-4 rounded-2xl bg-risk-high/10 border border-risk-high/20">
          <p className="text-sm text-risk-high">{error}</p>
          <button
            onClick={loadOverview}
            className="mt-2 text-xs text-white/50 hover:text-white/70 underline transition-colors"
          >
            重新加载
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !overview && <DashboardSkeleton />}

      {/* Dashboard content */}
      {overview && (
        <div className="max-w-[1200px] mx-auto">
          <div
            className="relative overflow-hidden p-6 rounded-[20px] mb-6 border flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_56px_rgba(0,0,0,0.38)]"
            style={{
              background: `linear-gradient(135deg, ${moduleAccent}18, rgba(255,255,255,0.02))`,
              borderColor: `${moduleAccent}38`,
            }}
          >
            <div
              className="absolute -top-16 -right-14 h-40 w-40 rounded-full"
              style={{ background: `radial-gradient(circle, ${moduleAccent}22, transparent 72%)` }}
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-datashow">✦</span>
                <span className="text-[11.5px] text-datashow/90 font-medium tracking-[0.08em]">DATASHOW</span>
              </div>
              <h2 className="text-[24px] leading-tight font-semibold text-white mb-1.5">数据可视化工作台</h2>
              <p className="text-[13.5px] text-white/42">把复杂企业数据转化为结构化图谱与可执行洞察</p>
            </div>
            <button className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-[13px] text-white/58 hover:text-white/75 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span>＋</span>
              新建可视化
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.09] mb-6 overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.22)]">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 min-w-[130px] px-3 py-2.5 rounded-[10px] text-[13.5px] flex items-center justify-center gap-1.5 border transition-colors"
                  style={{
                    background: active ? `${moduleAccent}18` : "transparent",
                    borderColor: active ? `${moduleAccent}36` : "transparent",
                    color: active ? moduleAccent : "rgba(255,255,255,0.35)",
                  }}
                >
                  <span>{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <>
              {/* Natural language query bar */}
              <NLQueryBar />

              {/* NL-generated chart */}
              {nlLoading && (
                <div className="mb-6 p-5 rounded-2xl bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-datashow/40 border-t-datashow rounded-full animate-spin" />
                    <span className="text-sm text-white/40">AI 正在生成图表...</span>
                  </div>
                </div>
              )}
              {nlError && (
                <div className="mb-6 p-4 rounded-2xl bg-risk-high/10 border border-risk-high/20">
                  <p className="text-sm text-risk-high">{nlError}</p>
                </div>
              )}
              {nlChart && !nlLoading && <DynamicChart chart={nlChart} />}

              {/* 4 metric cards */}
              <DashboardCards cards={overview.cards} />

              {/* Two-column layout: charts (2/3) + alerts (1/3) */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Left: stacked charts */}
                <div className="xl:col-span-2 space-y-4">
                  <RiskTrendChart data={overview.risk_trend} />
                  <IndustryDonut data={overview.industry_distribution} />
                </div>

                {/* Right: alert feed */}
                <div>
                  <AlertFeed alerts={overview.alerts} />
                </div>
              </div>

              {/* Relationship graph + Trend analysis */}
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 mt-4">
                <RelationshipGraph />
                <TrendAnalysis />
              </div>

              {/* AI insight cards */}
              <InsightCards insights={overview.insights} />
            </>
          )}

          {activeTab === "relation" && (
            <RelationshipExplorer />
          )}

          {activeTab === "trend" && (
            <TrendExplorer />
          )}

          {/* Placeholder for unimplemented tabs */}
          {(activeTab === "geo" || activeTab === "compare") && (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-xl text-white/15">
                  {activeTab === "geo" ? "◉" : "▧"}
                </span>
              </div>
              <h3 className="text-[14px] text-white/30 mb-1">
                {activeTab === "geo" ? "地域分布" : "多维对比"}
              </h3>
              <p className="text-[12px] text-white/15">即将开放，敬请期待</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
