"""Workspace API schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class WorkspaceSessionCreateRequest(BaseModel):
    purpose: str = "skill_create"
    seed_prompt: str = ""
    skill_id: str = ""
    reuse_existing: bool = True


class WorkspaceSessionCreateResponse(BaseModel):
    workspace_id: str
    session_id: str
    status: str
    display_root: str
    real_vfs_root: str
    skill_id: str = ""


class WorkspaceSessionStatusResponse(BaseModel):
    workspace_id: str
    session_id: str
    status: str
    display_root: str
    real_vfs_root: str
    created_at: str
    skill_id: str = ""


class WorkspaceRunSessionCreateResponse(BaseModel):
    workspace_id: str
    run_session_id: str
    skill_id: str = ""


class WorkspaceTreeNode(BaseModel):
    name: str
    path: str
    node_type: str
    children: list["WorkspaceTreeNode"] = Field(default_factory=list)


class WorkspaceTreeResponse(BaseModel):
    workspace_id: str
    root: str
    nodes: list[WorkspaceTreeNode]


class WorkspaceFileResponse(BaseModel):
    path: str
    content: str
    readonly: bool = False
    content_type: str = "text/plain"
    size_bytes: int = 0
    etag: str = ""
    truncated: bool = False
    is_binary: bool = False


class WorkspaceFileUpdateRequest(BaseModel):
    path: str
    content: str
    if_match_etag: str = ""


class WorkspaceFileUpdateResponse(BaseModel):
    ok: bool
    path: str
    bytes: int
    etag: str = ""


class WorkspaceCreatorResultResponse(BaseModel):
    found: bool
    result: dict[str, Any] | None = None


WorkspaceTreeNode.model_rebuild()
