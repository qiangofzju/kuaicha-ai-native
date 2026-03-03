"use client";

import React from "react";

interface TableRendererProps {
  columns: { key: string; title: string }[];
  rows: Record<string, unknown>[];
}

export function TableRenderer({ columns, rows }: TableRendererProps) {
  if (!columns.length || !rows.length) {
    return (
      <div className="flex items-center justify-center h-[120px] text-white/25 text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-white/[0.03]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 text-left text-white/50 font-medium whitespace-nowrap"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-white/60 whitespace-nowrap">
                  {String(row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
