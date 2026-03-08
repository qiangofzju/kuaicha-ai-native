"use client";

import type { SkillProgress, SkillResultData, SkillTraceEvent, SkillTaskStatus } from "@/types/skill";

interface RunItem {
  runId: string;
  query: string;
  status: SkillTaskStatus;
  result: SkillResultData | null;
  error: string | null;
  traceEvents: SkillTraceEvent[];
}

interface SkillPlaygroundPaneProps {
  query: string;
  activeRunId: string | null;
  runs: RunItem[];
  submitting: boolean;
  status: SkillTaskStatus;
  progress: SkillProgress | null;
  traceEvents: SkillTraceEvent[];
  result: SkillResultData | null;
  error: string | null;
  onQueryChange: (value: string) => void;
  onRun: () => void;
  onCancel: () => void;
}

export function SkillPlaygroundPane({
  query,
  activeRunId,
  runs,
  submitting,
  status,
  progress,
  traceEvents,
  result,
  error,
  onQueryChange,
  onRun,
  onCancel,
}: SkillPlaygroundPaneProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-3 border-b border-white/[0.08]">
        <p className="text-[12px] text-white/75">运行技能（多轮会话）</p>
        <p className="text-[11px] text-white/42 mt-1">同一沙盒内可连续多轮运行，每轮保留独立 run_id 与轨迹。</p>
      </div>

      <div className="p-3">
        <div className="rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2.5 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="输入技能调用内容，例如：帮我算个命"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-white/82 placeholder:text-white/35"
          />
          {status === "running" && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1 rounded-md border border-red-400/40 text-[11px] text-red-300/90"
            >
              停止
            </button>
          )}
          <button
            type="button"
            onClick={onRun}
            disabled={!query.trim() || submitting || status === "running"}
            className="px-2.5 py-1 rounded-md border border-skills/45 bg-skills/15 text-[11px] text-skills disabled:opacity-40"
          >
            {submitting || status === "running" ? "运行中..." : "运行"}
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <p className="text-[11px] text-white/55">
          状态：{status} {progress ? `· ${Math.round(progress.progress)}%` : ""}
          {activeRunId ? ` · run_id=${activeRunId.slice(0, 10)}` : ""}
        </p>
        {error && <p className="text-[11px] text-red-300/90 mt-1">{error}</p>}
      </div>

      <div className="flex-1 grid grid-rows-[minmax(150px,1fr)_minmax(110px,1fr)] gap-2 p-3 pt-0 min-h-0">
        <div className="rounded-xl border border-white/[0.08] bg-black/35 overflow-y-auto p-2.5">
          <p className="text-[11px] text-white/55 mb-2">当前运行轨迹</p>
          <div className="space-y-1.5">
            {traceEvents.length === 0 && <p className="text-[11px] text-white/38">暂无轨迹</p>}
            {traceEvents.map((event) => (
              <div key={event.event_id} className="rounded-md border border-white/[0.08] px-2 py-1.5 bg-black/35">
                <p className="text-[11px] text-white/78">{event.title}</p>
                <p className="text-[10px] text-white/52 mt-0.5 break-all">{event.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/35 overflow-auto p-2.5">
          <p className="text-[11px] text-white/55 mb-2">当前运行结果</p>
          {!result && <p className="text-[11px] text-white/38">等待结果...</p>}
          {result && (
            <div className="space-y-2">
              <p className="text-[12px] text-white/78">{result.summary}</p>
              <pre className="text-[11px] text-white/62 whitespace-pre-wrap">
                {JSON.stringify(result.preview_rows || [], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.08] p-3 max-h-[210px] overflow-y-auto">
        <p className="text-[11px] text-white/55 mb-2">多轮历史</p>
        <div className="space-y-1.5">
          {runs.length === 0 && <p className="text-[11px] text-white/38">暂无历史运行</p>}
          {[...runs].reverse().map((run) => (
            <div key={run.runId} className="rounded-md border border-white/[0.08] bg-black/25 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-white/76 truncate">{run.query}</p>
                <span className="text-[10px] text-white/45">{run.status}</span>
              </div>
              <p className="text-[10px] text-white/45 mt-0.5">run_id: {run.runId}</p>
              {run.error && <p className="text-[10px] text-red-300/90 mt-0.5">{run.error}</p>}
              {run.result?.summary && <p className="text-[10px] text-white/62 mt-0.5">{run.result.summary}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
