"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

interface SkillBuilderWorkbenchProps {
  left: ReactNode;
  right: ReactNode;
}

const MIN_LEFT = 35;
const MAX_LEFT = 45;

export function SkillBuilderWorkbench({ left, right }: SkillBuilderWorkbenchProps) {
  const [leftPct, setLeftPct] = useState(40);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: MouseEvent) => {
      const width = window.innerWidth || 1;
      const next = Math.max(MIN_LEFT, Math.min(MAX_LEFT, (event.clientX / width) * 100));
      setLeftPct(next);
    };
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const style = useMemo(
    () => ({
      gridTemplateColumns: `${leftPct}% 8px minmax(0,1fr)`,
    }),
    [leftPct],
  );

  return (
    <div className="grid gap-0 h-[calc(100vh-188px)] min-h-[720px]" style={style}>
      <div className="min-w-0 min-h-0">{left}</div>

      <button
        type="button"
        onMouseDown={() => setDragging(true)}
        className="group h-full cursor-col-resize relative"
        aria-label="调整左右分栏"
      >
        <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/[0.08] group-hover:bg-skills/65 transition-colors" />
      </button>

      <div className="min-w-0 min-h-0">{right}</div>
    </div>
  );
}
