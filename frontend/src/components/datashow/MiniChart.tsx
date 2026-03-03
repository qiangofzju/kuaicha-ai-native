"use client";

import React, { useMemo } from "react";

interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
}

/**
 * SVG sparkline with gradient fill.
 * Renders a smooth polyline from an array of data points.
 */
export function MiniChart({ data, color, height = 32 }: MiniChartProps) {
  const width = 120;
  const padding = 2;

  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length < 2) {
      return { linePath: "", areaPath: "" };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y =
        padding + (1 - (value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    // Build polyline path
    const lineSegments = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    // Build area path (line + close at bottom)
    const areaSegments =
      lineSegments +
      ` L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

    return { linePath: lineSegments, areaPath: areaSegments };
  }, [data, height]);

  // Unique gradient id per instance
  const gradientId = useMemo(
    () => `mini-gradient-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  if (!data || data.length < 2) return null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
