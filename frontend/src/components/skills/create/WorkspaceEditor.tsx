"use client";

import { useMemo, useState } from "react";

interface WorkspaceEditorProps {
  path: string;
  content: string;
  contentType: string;
  sizeBytes: number;
  truncated: boolean;
  isBinary: boolean;
  readonly: boolean;
  dirty: boolean;
  stale: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onChange: (content: string) => void;
  onSave: () => void;
  onReload: () => void;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function renderSimpleMarkdown(input: string) {
  const lines = input.split("\n");
  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed text-white/80">
      {lines.map((line, idx) => {
        if (line.startsWith("### ")) return <h3 key={idx} className="text-[13px] text-white font-semibold">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={idx} className="text-[14px] text-white font-semibold">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={idx} className="text-[15px] text-white font-semibold">{line.slice(2)}</h1>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p key={idx} className="pl-4">• {line.slice(2)}</p>;
        if (!line.trim()) return <div key={idx} className="h-2" />;
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

export function WorkspaceEditor({
  path,
  content,
  contentType,
  sizeBytes,
  truncated,
  isBinary,
  readonly,
  dirty,
  stale,
  loading,
  saving,
  error,
  onChange,
  onSave,
  onReload,
}: WorkspaceEditorProps) {
  const ext = useMemo(() => {
    const name = path.split("/").pop() || "";
    const idx = name.lastIndexOf(".");
    return idx > -1 ? name.slice(idx + 1).toLowerCase() : "";
  }, [path]);
  const isMarkdown = ext === "md" || contentType.includes("markdown");
  const isJson = ext === "json" || contentType.includes("json");
  const canPreview = isMarkdown || isJson || ext === "py" || ext === "txt";
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  const previewContent = useMemo(() => {
    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(content || "{}"), null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [content, isJson]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-white/78 font-mono truncate">{path || "未打开文件"}</p>
          <p className="text-[10px] text-white/45 mt-0.5">
            {contentType || "text/plain"} · {formatBytes(sizeBytes)}
            {truncated ? " · 已截断" : ""}
            {stale ? " · 文件已更新" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canPreview && (
            <>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className="px-2 py-1 rounded-md text-[10px] border"
                style={{ borderColor: viewMode === "preview" ? "rgba(74,158,255,0.45)" : "rgba(255,255,255,0.14)", color: viewMode === "preview" ? "#60A5FA" : "rgba(255,255,255,0.68)" }}
              >
                预览
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className="px-2 py-1 rounded-md text-[10px] border"
                style={{ borderColor: viewMode === "code" ? "rgba(74,158,255,0.45)" : "rgba(255,255,255,0.14)", color: viewMode === "code" ? "#60A5FA" : "rgba(255,255,255,0.68)" }}
              >
                源码
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onReload}
            disabled={loading || saving || !path}
            className="px-2.5 py-1 rounded-md border border-white/[0.16] text-[11px] text-white/72 disabled:opacity-40"
          >
            刷新
          </button>
          <button
            type="button"
            disabled={readonly || !dirty || saving || loading || isBinary}
            onClick={onSave}
            className="px-2.5 py-1 rounded-md border border-skills/45 bg-skills/15 text-[11px] text-skills disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {error && <p className="px-3 py-2 text-[11px] text-red-300/90">{error}</p>}

      <div className="flex-1 p-3 min-h-0">
        {loading && (
          <div className="w-full h-full rounded-xl border border-white/[0.1] bg-black/25 p-3 text-[12px] text-white/42">
            文件加载中...
          </div>
        )}
        {!loading && isBinary && (
          <div className="w-full h-full rounded-xl border border-white/[0.1] bg-black/25 p-3 text-[12px] text-white/55">
            当前文件为二进制，暂不支持预览。请在终端或外部工具中查看。
          </div>
        )}
        {!loading && !isBinary && viewMode === "preview" && canPreview && (
          <div className="w-full h-full overflow-auto rounded-xl border border-white/[0.1] bg-black/25 p-3">
            {isMarkdown ? (
              renderSimpleMarkdown(previewContent)
            ) : (
              <pre className="text-[12px] text-white/80 whitespace-pre-wrap font-mono">{previewContent || "(empty)"}</pre>
            )}
          </div>
        )}
        {!loading && !isBinary && (!canPreview || viewMode === "code") && (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readonly}
            placeholder="请选择文件"
            className="w-full h-full rounded-xl border border-white/[0.1] bg-black/25 p-3 text-[12px] text-white/82 font-mono outline-none resize-none"
          />
        )}
      </div>
    </div>
  );
}

