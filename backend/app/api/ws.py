"""WebSocket endpoints for real-time execution progress updates."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.executor import executor
from app.services.workspace.workspace_session import workspace_session_service
from app.utils.logger import logger

ws_router = APIRouter(tags=["websocket"])


def _wrap_progress(data: dict, msg_prefix: str) -> dict:
    """Wrap task status dict into frontend message format."""
    raw_progress = data.get("progress", 0)
    pct = round(raw_progress * 100) if raw_progress <= 1.0 else round(raw_progress)
    return {
        "type": f"{msg_prefix}_progress",
        "data": {
            "progress": pct,
            "stage": data.get("stage", ""),
            "message": data.get("message", ""),
            "stageIndex": pct // 25 if pct < 100 else 3,
            "totalStages": 4,
        },
    }


async def _task_progress_ws(websocket: WebSocket, task_id: str, msg_prefix: str):
    """Generic websocket worker for agent/skill task streaming."""
    await websocket.accept()
    logger.info("WebSocket connected (%s): task_id=%s", msg_prefix, task_id)
    is_disconnected = False
    progress_type = f"{msg_prefix}_progress"
    stream_type = f"{msg_prefix}_stream"
    trace_type = f"{msg_prefix}_trace"
    complete_type = f"{msg_prefix}_complete"
    error_type = f"{msg_prefix}_error"
    heartbeat_type = f"{msg_prefix}_heartbeat"
    start_type = f"{msg_prefix}_run_start"
    end_type = f"{msg_prefix}_run_end"

    async def safe_send_json(payload: dict) -> bool:
        nonlocal is_disconnected
        if is_disconnected:
            return False
        try:
            await websocket.send_json(payload)
            return True
        except WebSocketDisconnect:
            is_disconnected = True
            logger.info("WebSocket disconnected while sending: task_id=%s", task_id)
            return False
        except Exception as exc:
            is_disconnected = True
            logger.info(
                "WebSocket send failed (likely disconnected): task_id=%s, err=%s",
                task_id,
                exc,
            )
            return False

    async def safe_close() -> None:
        nonlocal is_disconnected
        if is_disconnected:
            return
        try:
            await websocket.close()
        except Exception:
            pass
        finally:
            is_disconnected = True

    task = executor.get_task(task_id)
    if task is None:
        await safe_send_json({"type": error_type, "data": {"message": "Task not found"}})
        await safe_close()
        return

    async def on_update(data: dict):
        if is_disconnected:
            return

        extra = data.get("_extra")
        status = data.get("status", "")

        if status == "completed":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "completed"}})
            if await safe_send_json({"type": complete_type, "data": {"task_id": task_id, "status": "completed"}}):
                await safe_close()
            return
        if status == "cancelled":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "cancelled"}})
            if await safe_send_json({"type": complete_type, "data": {"task_id": task_id, "status": "cancelled"}}):
                await safe_close()
            return
        if status == "failed":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "failed"}})
            if await safe_send_json(
                {"type": error_type, "data": {"message": data.get("message", "Task failed")}}
            ):
                await safe_close()
            return

        if extra and extra.get("type") == "stream":
            await safe_send_json({"type": stream_type, "data": {"content": extra.get("content", "")}})
            return

        if extra and extra.get("type") == "trace":
            event = extra.get("event", {})
            if isinstance(event, dict):
                await safe_send_json({"type": trace_type, "data": event})
            return

        if status in {"pending", "running"}:
            await safe_send_json({"type": start_type, "data": {"task_id": task_id, "status": status}})
        await safe_send_json(_wrap_progress(data, msg_prefix=msg_prefix))

    executor.subscribe(task_id, on_update)

    try:
        current_task = executor.get_task(task_id)
        if current_task is None:
            await safe_send_json({"type": error_type, "data": {"message": "Task not found"}})
            await safe_close()
            return

        status_dict = current_task.to_status_dict()
        if current_task.status.value in {"pending", "running"}:
            if not await safe_send_json({"type": start_type, "data": {"task_id": task_id, "status": current_task.status.value}}):
                return
        if not await safe_send_json(_wrap_progress(status_dict, msg_prefix=msg_prefix)):
            return

        for event in executor.get_trace_events(task_id):
            if not isinstance(event, dict):
                continue
            if not await safe_send_json({"type": trace_type, "data": event}):
                return

        if current_task.status.value == "completed":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "completed"}})
            if await safe_send_json({"type": complete_type, "data": {"task_id": task_id, "status": "completed"}}):
                await safe_close()
            return
        if current_task.status.value == "cancelled":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "cancelled"}})
            if await safe_send_json({"type": complete_type, "data": {"task_id": task_id, "status": "cancelled"}}):
                await safe_close()
            return
        if current_task.status.value == "failed":
            await safe_send_json({"type": end_type, "data": {"task_id": task_id, "status": "failed"}})
            if await safe_send_json(
                {"type": error_type, "data": {"message": status_dict.get("message", "Task failed")}}
            ):
                await safe_close()
            return

        async def heartbeat_loop() -> None:
            while not is_disconnected:
                await asyncio.sleep(4.0)
                payload = {
                    "type": heartbeat_type,
                    "data": {
                        "task_id": task_id,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                }
                ok = await safe_send_json(payload)
                if not ok:
                    break

        heartbeat_task = asyncio.create_task(heartbeat_loop())
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                try:
                    await websocket.send_text("pong")
                except Exception:
                    is_disconnected = True
                    break
    except WebSocketDisconnect:
        is_disconnected = True
        logger.info("WebSocket disconnected: task_id=%s", task_id)
    finally:
        try:
            if "heartbeat_task" in locals():
                heartbeat_task.cancel()
        except Exception:
            pass
        executor.unsubscribe(task_id, on_update)


@ws_router.websocket("/ws/agent/{task_id}")
async def agent_progress_ws(websocket: WebSocket, task_id: str):
    await _task_progress_ws(websocket=websocket, task_id=task_id, msg_prefix="agent")


@ws_router.websocket("/ws/skills/{task_id}")
async def skill_progress_ws(websocket: WebSocket, task_id: str):
    await _task_progress_ws(websocket=websocket, task_id=task_id, msg_prefix="skill")


@ws_router.websocket("/ws/skills/runs/{run_id}")
async def skill_run_progress_ws(websocket: WebSocket, run_id: str):
    await _task_progress_ws(websocket=websocket, task_id=run_id, msg_prefix="skill")


@ws_router.websocket("/ws/workspace/sessions/{workspace_id}")
async def workspace_session_ws(websocket: WebSocket, workspace_id: str):
    await websocket.accept()
    subscription = workspace_session_service.subscribe(workspace_id)
    if subscription is None:
        await websocket.send_json(
            {"type": "workspace.error", "data": {"message": "Workspace not found"}}
        )
        await websocket.close()
        return

    logger.info("Workspace WS connected: workspace_id=%s", workspace_id)
    try:
        for event in subscription.backlog:
            await websocket.send_json(event)

        while True:
            payload = await subscription.queue.get()
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        logger.info("Workspace WS disconnected: workspace_id=%s", workspace_id)
    except Exception as exc:
        logger.info("Workspace WS send failed: workspace_id=%s err=%s", workspace_id, exc)
    finally:
        workspace_session_service.unsubscribe(workspace_id, subscription)
