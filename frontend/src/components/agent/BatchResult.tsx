"use client";

import { useState, useMemo } from "react";
import type {
  AgentDefinition,
  AgentResultData,
  BatchColumn,
  BatchSchemaRouting,
  BatchStats,
} from "@/types/agent";
import { Icons } from "@/components/shared/Icons";
import { agentService } from "@/services/agentService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BatchResultProps {
  agent: AgentDefinition;
  result: AgentResultData;
  onBack: () => void;
  onReset: () => void;
  exportResultFn?: (taskId: string, format: "pdf" | "excel") => Promise<{ fallback?: string | null; filename: string }>;
}

type SortDir = "asc" | "desc" | null;
type ActiveTab = "data" | "stats" | "sql";

const BADGE_LABELS: Record<string, string> = {
  listed: "上市",
  unlisted: "未上市",
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  L2: "L2",
  L3: "L3",
  L4: "L4",
  L5: "L5",
};

const BADGE_COLORS: Record<string, string> = {
  listed: "#10B981",
  unlisted: "#6B7280",
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  L2: "#6B7280",
  L3: "#38BDF8",
  L4: "#22C55E",
  L5: "#F59E0B",
};

const QUERY_TYPE_LABELS: Record<string, string> = {
  filter: "筛选并导出企业名单",
  export: "指定字段结构化导出",
  derived: "衍生加工字段导出",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string | null; sortDir: SortDir }) {
  if (sortKey !== col) {
    return <span className="text-white/20 ml-1 text-[10px]">⇅</span>;
  }
  return (
    <span className="ml-1 text-[10px]" style={{ color: "currentColor" }}>
      {sortDir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function BadgeCell({ value, rawValue }: { value: string; rawValue: string }) {
  const color = BADGE_COLORS[rawValue] || "#6B7280";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {value}
    </span>
  );
}

function DataTable({
  columns,
  rows,
  agentColor,
}: {
  columns: BatchColumn[];
  rows: Record<string, unknown>[];
  agentColor: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [displayCount, setDisplayCount] = useState(20);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string | null;
      const bv = b[sortKey] as number | string | null;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv), "zh")
        : String(bv).localeCompare(String(av), "zh");
    });
  }, [rows, sortKey, sortDir]);

  const displayed = sorted.slice(0, displayCount);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (!columns.length) {
    return (
      <div className="text-center py-12 text-white/35 text-[13px]">暂无数据</div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr style={{ background: `${agentColor}12` }}>
              <th
                className="px-2 py-2 text-left text-[10px] text-white/40 font-medium border-b border-white/[0.06] w-8"
                style={{ minWidth: 32 }}
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-left font-medium border-b border-white/[0.06] cursor-pointer select-none whitespace-nowrap hover:bg-white/[0.03] transition-colors"
                  style={{ color: agentColor, minWidth: col.type === "text" ? 120 : 90 }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {col.unit && (
                      <span className="text-white/30 font-normal text-[9px] ml-0.5">
                        ({col.unit})
                      </span>
                    )}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-white/[0.03] transition-colors"
                style={{ background: idx % 2 === 0 ? "transparent" : "var(--table-row-alt)" }}
              >
                <td className="px-2 py-2 text-white/20 text-[10px] border-b border-white/[0.04]">
                  {idx + 1}
                </td>
                {columns.map((col) => {
                  const rawVal = row[col.key];
                  const isEmpty = rawVal === null || rawVal === undefined || rawVal === "";

                  if (col.type === "badge" && typeof rawVal === "string") {
                    return (
                      <td key={col.key} className="px-3 py-2 border-b border-white/[0.04]">
                        <BadgeCell value={BADGE_LABELS[rawVal] || rawVal} rawValue={rawVal} />
                      </td>
                    );
                  }

                  if (col.type === "number") {
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2 border-b border-white/[0.04] text-right tabular-nums"
                        style={{ color: isEmpty ? "var(--text-weak)" : "var(--text-main)" }}
                      >
                        {isEmpty ? "—" : typeof rawVal === "number" ? rawVal.toLocaleString() : String(rawVal)}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2 border-b border-white/[0.04] max-w-[220px]"
                      style={{ color: isEmpty ? "var(--text-weak)" : "var(--text-sub)" }}
                    >
                      <span className="block truncate" title={isEmpty ? undefined : String(rawVal)}>
                        {isEmpty ? "—" : String(rawVal)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > displayCount && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setDisplayCount((c) => c + 20)}
            className="px-4 py-1.5 rounded-lg text-[12px] border border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/[0.14] transition-colors"
          >
            加载更多（已显示 {displayCount} / {rows.length} 条）
          </button>
        </div>
      )}
    </div>
  );
}

function StatsPanel({
  stats,
  totalCount,
  agentColor,
  columns,
}: {
  stats: BatchStats;
  totalCount: number;
  agentColor: string;
  columns: BatchColumn[];
}) {
  const numericCols = columns.filter((c) => c.type === "number");
  const primaryKey = numericCols[0]?.key;
  const primaryLabel = numericCols[0]?.label || "数值";
  const unit = numericCols[0]?.unit || "";

  const fmtVal = (v: number | undefined) => {
    if (v === undefined || v === null) return "—";
    return Math.abs(v) >= 10000
      ? `${(v / 10000).toFixed(1)} 亿`
      : v.toLocaleString();
  };

  const cards = [
    {
      label: "匹配企业数",
      value: `${totalCount}`,
      unit: "家",
      color: agentColor,
    },
    {
      label: `${primaryLabel} 均值`,
      value: fmtVal(primaryKey ? stats[`avg_${primaryKey}`] : undefined),
      unit,
      color: "#A78BFA",
    },
    {
      label: `${primaryLabel} 最高`,
      value: fmtVal(primaryKey ? stats[`max_${primaryKey}`] : undefined),
      unit,
      color: "#34D399",
    },
    {
      label: `${primaryLabel} 中位数`,
      value: fmtVal(primaryKey ? stats[`median_${primaryKey}`] : undefined),
      unit,
      color: "#F59E0B",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.08] p-4"
            style={{ background: `${card.color}08` }}
          >
            <p className="text-[11px] text-white/40 mb-1">{card.label}</p>
            <p className="text-[22px] leading-none font-semibold" style={{ color: card.color }}>
              {card.value}
              <span className="text-[12px] font-normal text-white/40 ml-1">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {numericCols.length > 1 && (
        <div className="rounded-xl border border-white/[0.06] p-4 space-y-2">
          <p className="text-[11px] text-white/40 mb-2">各数值字段统计</p>
          {numericCols.slice(0, 4).map((col) => {
            const avg = stats[`avg_${col.key}`];
            const mx = stats[`max_${col.key}`];
            const mn = stats[`min_${col.key}`];
            if (avg === undefined) return null;
            const range = mx !== undefined && mn !== undefined ? mx - mn : 0;
            const pct = range > 0 && avg !== undefined ? ((avg - (mn || 0)) / range) * 100 : 50;
            return (
              <div key={col.key} className="flex items-center gap-3">
                <span className="text-[11px] text-white/50 w-28 truncate shrink-0">{col.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, background: agentColor }}
                  />
                </div>
                <span className="text-[11px] text-white/60 tabular-nums w-20 text-right">
                  均值 {avg.toLocaleString()}
                  {col.unit ? ` ${col.unit}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SqlDetail({
  sql,
  description,
  routing,
}: {
  sql: string;
  description?: string;
  routing?: BatchSchemaRouting;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      {description && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[10px] font-medium text-white/40 mt-0.5 shrink-0">查询说明</span>
          <p className="text-[12px] text-white/60 leading-relaxed">{description}</p>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 px-2 py-1 rounded text-[10px] border border-white/[0.1] text-white/40 hover:text-white/60 hover:border-white/[0.18] transition-colors z-10"
        >
          {copied ? "已复制" : "复制"}
        </button>
        <pre className="rounded-xl p-4 pr-16 text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap" style={{ background: "var(--code-block-bg)", border: "1px solid var(--card-border)", color: "#67e8f9" }}>
          {sql}
        </pre>
      </div>
      <div className="text-[11px] text-white/25 leading-relaxed">
        以上 SQL 查询由 AI 根据您的自然语言需求自动生成，在本地企业数据库中执行。
      </div>

      {routing && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-white/40">Schema 分层召回轨迹</p>
            <span className="text-[10px] text-white/30">{routing.strategy_version}</span>
          </div>

          {routing.selected_categories?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-white/35">召回类目</p>
              <div className="flex flex-wrap gap-1.5">
                {routing.selected_categories.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-0.5 rounded-md text-[10px] border border-white/[0.12] text-white/60"
                  >
                    {item.name} ({item.score.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {routing.selected_tables?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-white/35">召回表</p>
              <div className="space-y-1.5">
                {routing.selected_tables.slice(0, 8).map((table) => (
                  <div
                    key={table.name}
                    className="text-[11px] text-white/55 border border-white/[0.06] rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-white/75">{table.name}</span>
                    <span className="text-white/35"> · score {table.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BatchResult component
// ---------------------------------------------------------------------------

export function BatchResult({ agent, result, onBack, onReset, exportResultFn }: BatchResultProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("data");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadHint, setDownloadHint] = useState<string | null>(null);
  const agentColor = agent.color || "#06B6D4";

  const columns = (result.columns || []) as BatchColumn[];
  const rows = (result.preview_rows || []) as Record<string, unknown>[];
  const totalCount = result.total_count || rows.length;
  const stats = (result.stats || { count: totalCount }) as BatchStats;
  const sql = result.generated_sql || "";
  const sqlDesc = result.sql_description || result.sql_description;
  const queryType = result.query_type || "filter";
  const dq = result.data_quality;
  const routing = result.schema_routing;

  async function handleExcelDownload() {
    setDownloading(true);
    setDownloadError(null);
    setDownloadHint(null);
    try {
      const exporter = exportResultFn || agentService.exportResult;
      const exportResp = await exporter(result.task_id, "excel");
      if (exportResp?.fallback === "csv") {
        setDownloadHint("Excel 组件不可用，已自动降级下载 CSV");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Task not found")) {
        setDownloadError("任务结果已失效，请重新执行后下载");
      } else if (msg) {
        setDownloadError(`下载失败：${msg}`);
      } else {
        setDownloadError("Excel 下载失败，请重试");
      }
    } finally {
      setDownloading(false);
    }
  }

  function handleCsvExport() {
    if (!columns.length || !rows.length) return;
    const header = columns.map((c) => c.label).join(",");
    const body = rows
      .map((row) =>
        columns
          .map((col) => {
            const v = row[col.key];
            const str = v === null || v === undefined ? "" : String(v);
            return str.includes(",") ? `"${str}"` : str;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_preview_${result.task_id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "data", label: `数据预览` },
    { key: "stats", label: "统计洞察" },
    { key: "sql", label: "SQL 详情" },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Summary card */}
      <div
        className="p-5 rounded-2xl border"
        style={{
          background: `linear-gradient(135deg, ${agentColor}10, var(--upload-area-bg))`,
          borderColor: `${agentColor}25`,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                style={{ background: `${agentColor}18`, color: agentColor, border: `1px solid ${agentColor}30` }}
              >
                {QUERY_TYPE_LABELS[queryType] || queryType}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium tabular-nums"
                style={{ background: `${agentColor}10`, color: agentColor }}
              >
                <Icons.Database size={10} />
                {totalCount} 条记录
              </span>
            </div>
            <p className="text-[13px] text-white/70 leading-relaxed">{result.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {result.metadata?.duration !== undefined && (
              <span className="text-[11px] text-white/35">耗时 {result.metadata.duration}s</span>
            )}
            {dq && (
              <span className="text-[11px] text-white/35">
                匹配率 {Math.round((dq.matched / Math.max(dq.total_requested, 1)) * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "var(--tab-bar-bg)", border: `1px solid var(--tab-bar-border)` }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 rounded-[10px] text-[12px] font-medium transition-all"
            style={
              activeTab === tab.key
                ? {
                    background: `${agentColor}16`,
                    color: agentColor,
                    border: `1px solid ${agentColor}28`,
                  }
                : { color: "var(--tab-inactive-text)", border: "1px solid transparent" }
            }
          >
            {tab.label}
            {tab.key === "data" && totalCount > 0 && (
              <span
                className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${agentColor}20`, color: agentColor }}
              >
                {totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        {activeTab === "data" && (
          <DataTable columns={columns} rows={rows} agentColor={agentColor} />
        )}
        {activeTab === "stats" && (
          <StatsPanel
            stats={stats}
            totalCount={totalCount}
            agentColor={agentColor}
            columns={columns}
          />
        )}
        {activeTab === "sql" && (
          <SqlDetail sql={sql} description={sqlDesc} routing={routing} />
        )}
      </div>

      {/* Data quality notice */}
      {dq && dq.missing_fields_filled > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/10 bg-amber-500/5">
          <span className="text-amber-400/70 text-[11px]">
            已自动补全 {dq.missing_fields_filled} 个缺失字段，建议人工复核
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Primary: Excel download */}
        <button
          onClick={handleExcelDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-all disabled:opacity-60"
          style={{
            background: downloading
              ? `${agentColor}40`
              : `linear-gradient(135deg, ${agentColor}, ${agentColor}cc)`,
            color: "#fff",
            boxShadow: downloading ? "none" : `0 0 24px ${agentColor}35`,
          }}
        >
          {downloading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: "#fff4", borderTopColor: "#fff" }}
              />
              正在准备…
            </>
          ) : (
            <>
              <Icons.Download size={16} />
              下载 Excel（{totalCount} 行）
            </>
          )}
        </button>

        {/* CSV preview export (client-side) */}
        <button
          onClick={handleCsvExport}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[12px] border border-white/[0.08] text-white/55 hover:text-white/75 hover:border-white/[0.14] transition-colors disabled:opacity-40"
        >
          <Icons.Export size={14} />
          导出 CSV 预览
        </button>
      </div>

      {downloadError && (
        <p className="text-[12px] text-red-400/70">{downloadError}</p>
      )}
      {downloadHint && (
        <p className="text-[12px] text-amber-300/70">{downloadHint}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-[12px] border border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/[0.14] transition-colors"
        >
          返回列表
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-xl text-[12px] border transition-colors"
          style={{
            borderColor: `${agentColor}35`,
            background: `${agentColor}10`,
            color: agentColor,
          }}
        >
          重新执行
        </button>
      </div>
    </div>
  );
}
