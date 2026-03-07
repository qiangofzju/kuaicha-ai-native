export type WorkspaceStatus = "initializing" | "ready" | "failed";

export interface WorkspaceSession {
  workspace_id: string;
  session_id: string;
  status: WorkspaceStatus;
  display_root: string;
  real_vfs_root: string;
  skill_id?: string;
}

export interface WorkspaceRunSession {
  workspace_id: string;
  run_session_id: string;
  skill_id?: string;
}

export interface WorkspaceTreeNode {
  name: string;
  path: string;
  node_type: "file" | "dir";
  children: WorkspaceTreeNode[];
}

export interface WorkspaceTreeResponse {
  workspace_id: string;
  root: string;
  nodes: WorkspaceTreeNode[];
}

export interface WorkspaceFilePayload {
  path: string;
  content: string;
  readonly: boolean;
  content_type: string;
  size_bytes: number;
  etag: string;
  truncated: boolean;
  is_binary: boolean;
}

export interface WorkspaceFileUpdatePayload {
  ok: boolean;
  path: string;
  bytes: number;
  etag: string;
}

export interface WorkspaceCreatorResultPayload {
  found: boolean;
  result: Record<string, unknown> | null;
}

export interface WorkspaceTerminalLineEvent {
  stream: "stdout" | "stderr";
  line: string;
  tool_id?: string;
  run_id?: string;
  ts?: string;
}

export interface WorkspaceFsChangedEvent {
  op: "created" | "updated" | "deleted";
  path: string;
  ts?: string;
}
