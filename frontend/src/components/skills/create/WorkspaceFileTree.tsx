"use client";

import type { WorkspaceTreeNode } from "@/types/workspace";

interface WorkspaceFileTreeProps {
  nodes: WorkspaceTreeNode[];
  activePath: string;
  onOpenFile: (path: string) => void;
}

function TreeNode({
  node,
  activePath,
  onOpenFile,
  depth,
}: {
  node: WorkspaceTreeNode;
  activePath: string;
  onOpenFile: (path: string) => void;
  depth: number;
}) {
  const paddingLeft = 10 + depth * 12;
  const isActive = activePath === node.path;
  const isDir = node.node_type === "dir";

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!isDir) onOpenFile(node.path);
        }}
        className={`w-full text-left px-2 py-1 rounded-md text-[12px] transition-colors ${
          isActive ? "bg-white/[0.12] text-white" : "text-white/72 hover:bg-white/[0.05]"
        } ${isDir ? "cursor-default" : ""}`}
        style={{ paddingLeft }}
      >
        <span className="font-mono">{isDir ? `📁 ${node.name}` : `📄 ${node.name}`}</span>
      </button>
      {isDir && node.children?.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              onOpenFile={onOpenFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceFileTree({ nodes, activePath, onOpenFile }: WorkspaceFileTreeProps) {
  return (
    <div className="h-full overflow-y-auto px-2 py-2">
      {nodes.length === 0 && (
        <p className="text-[12px] text-white/38 px-2 py-2">目录为空</p>
      )}
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          activePath={activePath}
          onOpenFile={onOpenFile}
          depth={0}
        />
      ))}
    </div>
  );
}

