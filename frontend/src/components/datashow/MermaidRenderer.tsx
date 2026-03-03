"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidRendererProps {
  code: string;
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          darkMode: true,
          themeVariables: {
            primaryColor: "rgba(6,182,212,0.15)",
            primaryBorderColor: "rgba(255,255,255,0.15)",
            primaryTextColor: "rgba(255,255,255,0.8)",
            lineColor: "rgba(255,255,255,0.2)",
            secondaryColor: "rgba(167,139,250,0.1)",
            tertiaryColor: "rgba(210,174,103,0.12)",
            background: "transparent",
            mainBkg: "rgba(255,255,255,0.04)",
            nodeBorder: "rgba(255,255,255,0.12)",
            fontFamily: "var(--font-geist-sans), 'Noto Sans SC', sans-serif",
            fontSize: "13px",
          },
          flowchart: { curve: "basis", padding: 12 },
          mindmap: { padding: 16 },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Mermaid render failed:", err);
          setError("图表渲染失败");
        }
      }
    }

    if (code.trim()) {
      render();
    }

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[200px] text-white/25 text-sm">
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="w-4 h-4 border-2 border-datashow/40 border-t-datashow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto mermaid-container"
      style={{ maxHeight: 420 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
