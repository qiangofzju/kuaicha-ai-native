"""Chat API routes – session management and message streaming."""

import asyncio
import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import (
    CreateSessionRequest,
    SendMessageRequest,
    SessionResponse,
    SkillInvocationRequest,
    UpdateSessionRequest,
)
from app.services.chat_service import chat_service

chat_router = APIRouter(prefix="/chat", tags=["chat"])


@chat_router.post("/sessions", response_model=SessionResponse)
async def create_session(req: CreateSessionRequest):
    """Create a new chat session."""
    session = chat_service.create_session(title=req.title)
    return session


@chat_router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    """List all chat sessions."""
    return chat_service.list_sessions()


@chat_router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, req: UpdateSessionRequest):
    """Rename a chat session."""
    session = chat_service.update_session(session_id, req.title)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@chat_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session and its messages."""
    deleted = chat_service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok", "session_id": session_id}


@chat_router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, req: SendMessageRequest):
    """Send a message and receive a streaming response via SSE.

    The response is an ``EventSourceResponse`` that emits JSON events:
    - ``{"type": "token", "data": "..."}`` – text fragment
    - ``{"type": "details", "data": [...]}`` – structured risk details
    - ``{"type": "actions", "data": [...]}`` – suggested actions
    - ``{"type": "done", "data": null}`` – stream complete
    """
    session = chat_service.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        try:
            async for event_data in chat_service.send_message_stream(
                session_id, req.content
            ):
                yield {"data": event_data}
        except asyncio.CancelledError:
            # Client disconnected or manually stopped streaming.
            raise

    return EventSourceResponse(
        event_generator(),
        ping=15,
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@chat_router.post("/sessions/{session_id}/skill-invocations")
async def invoke_skill(session_id: str, req: SkillInvocationRequest):
    """Invoke one skill from chat context and receive streaming run events."""
    session = chat_service.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        try:
            async for event_data in chat_service.invoke_skill_stream(
                session_id=session_id,
                skill_id=req.skill_id,
                input_payload=req.input,
                origin_message_id=req.origin_message_id,
            ):
                yield {"data": event_data}
        except HTTPException as exc:
            payload = {"type": "skill_error", "data": {"message": str(exc.detail)}}
            yield {"data": json.dumps(payload, ensure_ascii=False)}
            yield {"data": json.dumps({"type": "done", "data": None}, ensure_ascii=False)}
        except asyncio.CancelledError:
            raise

    return EventSourceResponse(
        event_generator(),
        ping=15,
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
