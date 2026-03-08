"use client";

import type { WorkspaceTerminalLineEvent, WorkspaceTreeNode } from "@/types/workspace";
import type { SkillProgress, SkillResultData, SkillTaskStatus, SkillTraceEvent } from "@/types/skill";
import { WorkspaceFileTree } from "./WorkspaceFileTree";
import { WorkspaceEditor } from "./WorkspaceEditor";
import { WorkspaceTerminal } from "./WorkspaceTerminal";
import { SkillPlaygroundPane } from "./SkillPlaygroundPane";

type SandboxTab = "files" | "terminal" | "playground";

interface SandboxPaneProps {
  workspaceStatus: "initializing" | "ready" | "failed";
  displayRoot: string;
  logs: Array<{ line: string; ts?: string }>;
  tree: WorkspaceTreeNode[];
  terminalLines: WorkspaceTerminalLineEvent[];
  activeTab: SandboxTab;
  onTabChange: (tab: SandboxTab) => void;
  openFilePath: string;
  openFileContent: string;
  openFileContentType: string;
  openFileSizeBytes: number;
  openFileTruncated: boolean;
  openFileBinary: boolean;
  openFileReadonly: boolean;
  openFileDirty: boolean;
  openFileStale: boolean;
  openFileLoading: boolean;
  openFileSaving: boolean;
  openFileError: string | null;
  onOpenFile: (path: string) => void;
  onOpenFileContentChange: (value: string) => void;
  onSaveFile: () => void;
  onReloadFile: () => void;

  playgroundEnabled: boolean;
  playgroundQuery: string;
  playgroundActiveRunId: string | null;
  playgroundRuns: Array<{
    runId: string;
    query: string;
    status: SkillTaskStatus;
    result: SkillResultData | null;
    error: string | null;
    traceEvents: SkillTraceEvent[];
  }>;
  playgroundSubmitting: boolean;
  playgroundStatus: SkillTaskStatus;
  playgroundProgress: SkillProgress | null;
  playgroundTraceEvents: SkillTraceEvent[];
  playgroundResult: SkillResultData | null;
  playgroundError: string | null;
  onPlaygroundQueryChange: (value: string) => void;
  onPlaygroundRun: () => void;
  onPlaygroundCancel: () => void;
}

export function SandboxPane({
  workspaceStatus,
  displayRoot,
  logs,
  tree,
  terminalLines,
  activeTab,
  onTabChange,
  openFilePath,
  openFileContent,
  openFileContentType,
  openFileSizeBytes,
  openFileTruncated,
  openFileBinary,
  openFileReadonly,
  openFileDirty,
  openFileStale,
  openFileLoading,
  openFileSaving,
  openFileError,
  onOpenFile,
  onOpenFileContentChange,
  onSaveFile,
  onReloadFile,
  playgroundEnabled,
  playgroundQuery,
  playgroundActiveRunId,
  playgroundRuns,
  playgroundSubmitting,
  playgroundStatus,
  playgroundProgress,
  playgroundTraceEvents,
  playgroundResult,
  playgroundError,
  onPlaygroundQueryChange,
  onPlaygroundRun,
  onPlaygroundCancel,
}: SandboxPaneProps) {
  const statusLabel = workspaceStatus === "ready" ? "ready" : workspaceStatus === "failed" ? "failed" : "initializing";

  return (
    <section
      className="h-full min-h-[720px] rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-inset), var(--shadow-mid)",
      }}
    >
      {workspaceStatus !== "ready" && (
        <div className="flex-1 p-5">
          <div className="h-full rounded-xl border border-white/[0.08] bg-black/45 p-4 overflow-y-auto font-mono text-[12px] space-y-2">
            {logs.length === 0 && <p className="text-white/35">等待初始化日志...</p>}
            {logs.map((entry, idx) => (
              <p key={`${idx}-${entry.ts || ""}`} className="text-white/72">
                [{entry.ts ? new Date(entry.ts).toLocaleTimeString("zh-CN", { hour12: false }) : "--:--:--"}] {entry.line}
              </p>
            ))}
          </div>
        </div>
      )}

      {workspaceStatus === "ready" && (
        <>
          <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
            {(["files", "terminal", "playground"] as SandboxTab[]).map((tab) => {
              const disabled = tab === "playground" && !playgroundEnabled;
              return (
                <button
                  key={tab}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTabChange(tab)}
                  className="px-3 py-1.5 rounded-md text-[11px] border disabled:opacity-35"
                  style={{
                    borderColor: activeTab === tab ? "rgba(245,158,11,0.38)" : "rgba(255,255,255,0.12)",
                    background: activeTab === tab ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.02)",
                    color: activeTab === tab ? "#F59E0B" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {tab === "files" ? "文件" : tab === "terminal" ? "终端" : "运行技能"}
                </button>
              );
            })}
            </div>
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-white/40">
              <span className="truncate max-w-[260px]">{displayRoot || "/workspace/projects"}</span>
              <span
                className="shrink-0 rounded-md border px-2 py-1"
                style={{
                  borderColor: workspaceStatus === "ready" ? "rgba(16,185,129,0.35)" : workspaceStatus === "failed" ? "rgba(239,68,68,0.35)" : "rgba(74,158,255,0.35)",
                  color: workspaceStatus === "ready" ? "#34D399" : workspaceStatus === "failed" ? "#F87171" : "#60A5FA",
                  background: workspaceStatus === "ready" ? "rgba(16,185,129,0.12)" : workspaceStatus === "failed" ? "rgba(239,68,68,0.12)" : "rgba(74,158,255,0.12)",
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "files" && (
              <div className="h-full grid grid-cols-[260px_minmax(0,1fr)] min-h-0">
                <div className="border-r border-white/[0.08] min-h-0">
                  <WorkspaceFileTree nodes={tree} activePath={openFilePath} onOpenFile={onOpenFile} />
                </div>
                <div className="min-h-0">
                  <WorkspaceEditor
                    path={openFilePath}
                    content={openFileContent}
                    contentType={openFileContentType}
                    sizeBytes={openFileSizeBytes}
                    truncated={openFileTruncated}
                    isBinary={openFileBinary}
                    readonly={openFileReadonly}
                    dirty={openFileDirty}
                    stale={openFileStale}
                    loading={openFileLoading}
                    saving={openFileSaving}
                    error={openFileError}
                    onChange={onOpenFileContentChange}
                    onSave={onSaveFile}
                    onReload={onReloadFile}
                  />
                </div>
              </div>
            )}

            {activeTab === "terminal" && <WorkspaceTerminal lines={terminalLines} />}

            {activeTab === "playground" && (
              <SkillPlaygroundPane
                query={playgroundQuery}
                activeRunId={playgroundActiveRunId}
                runs={playgroundRuns}
                submitting={playgroundSubmitting}
                status={playgroundStatus}
                progress={playgroundProgress}
                traceEvents={playgroundTraceEvents}
                result={playgroundResult}
                error={playgroundError}
                onQueryChange={onPlaygroundQueryChange}
                onRun={onPlaygroundRun}
                onCancel={onPlaygroundCancel}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
