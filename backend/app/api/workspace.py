"""Workspace APIs for skill builder sandbox."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.workspace import (
    WorkspaceCreatorResultResponse,
    WorkspaceFileResponse,
    WorkspaceFileUpdateRequest,
    WorkspaceFileUpdateResponse,
    WorkspaceRunSessionCreateResponse,
    WorkspaceSessionCreateRequest,
    WorkspaceSessionCreateResponse,
    WorkspaceSessionStatusResponse,
    WorkspaceTreeResponse,
)
from app.services.workspace.workspace_session import workspace_session_service


workspace_router = APIRouter(prefix="/workspace", tags=["workspace"])


@workspace_router.post("/sessions", response_model=WorkspaceSessionCreateResponse)
async def create_workspace_session(req: WorkspaceSessionCreateRequest):
    record = workspace_session_service.create_session(
        purpose=req.purpose,
        seed_prompt=req.seed_prompt,
        skill_id=req.skill_id,
        reuse_existing=req.reuse_existing,
    )
    return {
        "workspace_id": record.workspace_id,
        "session_id": record.session_id,
        "status": record.status,
        "display_root": record.display_root,
        "real_vfs_root": record.real_vfs_root,
        "skill_id": record.bound_skill_id,
    }


@workspace_router.get("/sessions/{workspace_id}", response_model=WorkspaceSessionStatusResponse)
async def get_workspace_session(workspace_id: str):
    record = workspace_session_service.get(workspace_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {
        "workspace_id": record.workspace_id,
        "session_id": record.session_id,
        "status": record.status,
        "display_root": record.display_root,
        "real_vfs_root": record.real_vfs_root,
        "created_at": record.created_at,
        "skill_id": record.bound_skill_id,
    }


@workspace_router.post(
    "/sessions/{workspace_id}/run-session",
    response_model=WorkspaceRunSessionCreateResponse,
)
async def create_workspace_run_session(workspace_id: str):
    payload = workspace_session_service.create_run_session(workspace_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return payload


@workspace_router.get("/sessions/{workspace_id}/tree", response_model=WorkspaceTreeResponse)
async def get_workspace_tree(
    workspace_id: str,
    path: str = Query(default="", description="Display path under current workspace"),
):
    try:
        return workspace_session_service.list_tree(workspace_id=workspace_id, display_path=path)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@workspace_router.get("/sessions/{workspace_id}/file", response_model=WorkspaceFileResponse)
async def get_workspace_file(
    workspace_id: str,
    path: str = Query(...),
    max_bytes: int = Query(default=1_500_000, ge=10_000, le=5_000_000),
):
    try:
        return workspace_session_service.read_file(
            workspace_id=workspace_id,
            display_path=path,
            max_bytes=max_bytes,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@workspace_router.put("/sessions/{workspace_id}/file", response_model=WorkspaceFileUpdateResponse)
async def update_workspace_file(workspace_id: str, req: WorkspaceFileUpdateRequest):
    try:
        return workspace_session_service.write_file(
            workspace_id=workspace_id,
            display_path=req.path,
            content=req.content,
            if_match_etag=req.if_match_etag,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@workspace_router.get(
    "/sessions/{workspace_id}/creator-result",
    response_model=WorkspaceCreatorResultResponse,
)
async def get_workspace_creator_result(
    workspace_id: str,
    run_id: str = Query(default="", description="Optional run id"),
):
    payload = workspace_session_service.get_creator_result(workspace_id=workspace_id, run_id=run_id)
    if payload is None:
        return {"found": False, "result": None}
    return {"found": True, "result": payload}
