"""WebSocket endpoint for real-time agent progress updates."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.executor import executor
from app.utils.logger import logger

ws_router = APIRouter(tags=["websocket"])


def _wrap_progress(data: dict) -> dict:
    """Wrap a flat status dict into the message format the frontend expects.

    Converts backend progress (0.0–1.0) to frontend percentage (0–100)
    and derives a stageIndex for the 4-stage progress indicator.
    """
    raw_progress = data.get("progress", 0)
    # Backend uses 0.0–1.0 internally; frontend expects 0–100
    pct = round(raw_progress * 100) if raw_progress <= 1.0 else round(raw_progress)

    return {
        "type": "agent_progress",
        "data": {
            "progress": pct,
            "stage": data.get("stage", ""),
            "message": data.get("message", ""),
            "stageIndex": pct // 25 if pct < 100 else 3,
            "totalStages": 4,
        },
    }


@ws_router.websocket("/ws/agent/{task_id}")
async def agent_progress_ws(websocket: WebSocket, task_id: str):
    """WebSocket endpoint that pushes agent progress updates to the client.

    Message protocol (sent to client):
      - ``{"type": "agent_progress", "data": {progress, stage, message}}``
      - ``{"type": "agent_stream",   "data": {content}}``  (streaming text)
      - ``{"type": "agent_trace",    "data": {...}}``      (structured trace event)
      - ``{"type": "agent_complete", "data": {task_id}}``
      - ``{"type": "agent_error",    "data": {message}}``
    """
    await websocket.accept()
    logger.info("WebSocket connected: task_id=%s", task_id)
    is_disconnected = False

    async def safe_send_json(payload: dict) -> bool:
        """Send JSON payload safely; return False when client disconnected."""
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
        """Close socket safely; ignore disconnect races."""
        nonlocal is_disconnected
        if is_disconnected:
            return
        try:
            await websocket.close()
        except Exception:
            pass
        finally:
            is_disconnected = True

    # Check if task exists
    task = executor.get_task(task_id)
    if task is None:
        await safe_send_json({"type": "agent_error", "data": {"message": "Task not found"}})
        await safe_close()
        return

    # Register a callback that pushes updates to this WebSocket
    async def on_update(data: dict):
        if is_disconnected:
            return

        extra = data.get("_extra")
        status = data.get("status", "")

        if status == "completed":
            if await safe_send_json({"type": "agent_complete", "data": {"task_id": task_id}}):
                await safe_close()
        elif status == "failed":
            if await safe_send_json({"type": "agent_error", "data": {"message": data.get("message", "Task failed")}}):
                await safe_close()
        elif extra and extra.get("type") == "stream":
            # Streaming text chunk – send as separate message type
            await safe_send_json({
                "type": "agent_stream",
                "data": {"content": extra.get("content", "")},
            })
        elif extra and extra.get("type") == "trace":
            event = extra.get("event", {})
            if isinstance(event, dict):
                await safe_send_json({
                    "type": "agent_trace",
                    "data": event,
                })
        else:
            await safe_send_json(_wrap_progress(data))

    executor.subscribe(task_id, on_update)

    try:
        # Initial sync for the current snapshot and historical trace events.
        # This avoids missing early trace chunks if the task started before
        # the WebSocket subscription was established.
        current_task = executor.get_task(task_id)
        if current_task is None:
            await safe_send_json({"type": "agent_error", "data": {"message": "Task not found"}})
            await safe_close()
            return

        status_dict = current_task.to_status_dict()
        if not await safe_send_json(_wrap_progress(status_dict)):
            return

        for event in executor.get_trace_events(task_id):
            if not isinstance(event, dict):
                continue
            if not await safe_send_json({"type": "agent_trace", "data": event}):
                return

        if current_task.status.value == "completed":
            if await safe_send_json({"type": "agent_complete", "data": {"task_id": task_id}}):
                await safe_close()
            return
        if current_task.status.value == "failed":
            if await safe_send_json(
                {
                    "type": "agent_error",
                    "data": {"message": status_dict.get("message", "Task failed")},
                }
            ):
                await safe_close()
            return

        # Keep the connection alive – listen for client messages (e.g. ping)
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
        executor.unsubscribe(task_id, on_update)
