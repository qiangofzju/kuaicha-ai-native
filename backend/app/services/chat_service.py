"""Chat service – manages sessions and message streaming."""

import asyncio
import json
import textwrap
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from app.config import settings
from app.utils.logger import logger
from app.utils.mock_data import (
    get_mock_chat_response,
    get_mock_sessions,
    get_mock_streaming_chunks,
)


class ChatService:
    """In-memory chat service for session and message management."""

    def __init__(self):
        # session_id -> session dict
        self._sessions: dict[str, dict] = {}
        # session_id -> list of message dicts
        self._messages: dict[str, list[dict]] = {}

        # Pre-populate with mock sessions
        for s in get_mock_sessions():
            self._sessions[s["id"]] = s
            self._messages[s["id"]] = []

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------

    def create_session(self, title: Optional[str] = None) -> dict:
        """Create a new chat session."""
        session_id = f"s{uuid.uuid4().hex[:8]}"
        session = {
            "id": session_id,
            "title": title or "新对话",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0,
        }
        self._sessions[session_id] = session
        self._messages[session_id] = []
        logger.info("Created session: %s", session_id)
        return session

    def list_sessions(self) -> list[dict]:
        """Return all sessions sorted by creation time (newest first)."""
        sessions = list(self._sessions.values())
        sessions.sort(key=lambda s: s["created_at"], reverse=True)
        return sessions

    def get_session(self, session_id: str) -> Optional[dict]:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    def update_session(self, session_id: str, title: str) -> Optional[dict]:
        """Rename a session. Returns the updated session or None."""
        session = self._sessions.get(session_id)
        if session is None:
            return None
        session["title"] = title
        logger.info("Renamed session %s to '%s'", session_id, title)
        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and its messages. Returns True if found."""
        if session_id not in self._sessions:
            return False
        del self._sessions[session_id]
        self._messages.pop(session_id, None)
        logger.info("Deleted session: %s", session_id)
        return True

    # ------------------------------------------------------------------
    # Messages
    # ------------------------------------------------------------------

    def add_message(self, session_id: str, role: str, content: str, **kwargs) -> dict:
        """Add a message to a session and return the message dict."""
        msg = {
            "id": f"m{uuid.uuid4().hex[:8]}",
            "role": role,
            "content": content,
            "details": kwargs.get("details"),
            "actions": kwargs.get("actions"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._messages.setdefault(session_id, []).append(msg)

        # Update session message count
        if session_id in self._sessions:
            self._sessions[session_id]["message_count"] = len(
                self._messages[session_id]
            )

        return msg

    def get_messages(self, session_id: str) -> list[dict]:
        """Return all messages for a session."""
        return self._messages.get(session_id, [])

    # ------------------------------------------------------------------
    # Streaming response generator
    # ------------------------------------------------------------------

    async def send_message_stream(
        self, session_id: str, content: str
    ) -> AsyncGenerator[str, None]:
        """Process user message and yield SSE-formatted events.

        Yields JSON-encoded event strings suitable for ``EventSourceResponse``.
        """
        # Record the user message
        self.add_message(session_id, "user", content)

        # Update session title if it is still the default
        session = self._sessions.get(session_id)
        if session and session["title"] == "新对话":
            # Use the first user message as title (truncated)
            session["title"] = content[:20] + ("..." if len(content) > 20 else "")

        if settings.USE_MOCK_DATA:
            async for event in self._stream_mock(session_id, content):
                yield event
        else:
            async for event in self._stream_live(session_id, content):
                yield event

    async def _stream_mock(
        self, session_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        """Generate mock SSE events with realistic delays."""
        chunks = get_mock_streaming_chunks(query)
        full_content = ""

        for chunk in chunks:
            chunk_type = chunk["type"]

            if chunk_type == "token":
                token_text = chunk["data"]
                full_content += token_text
                yield json.dumps({"type": "token", "data": token_text}, ensure_ascii=False)
                await asyncio.sleep(0.15)

            elif chunk_type == "details":
                yield json.dumps({"type": "details", "data": chunk["data"]}, ensure_ascii=False)
                await asyncio.sleep(0.1)

            elif chunk_type == "actions":
                yield json.dumps({"type": "actions", "data": chunk["data"]}, ensure_ascii=False)
                await asyncio.sleep(0.1)

            elif chunk_type == "done":
                # Persist the assistant message
                response_data = get_mock_chat_response(query)
                self.add_message(
                    session_id,
                    "assistant",
                    full_content.strip(),
                    details=response_data.get("details"),
                    actions=response_data.get("actions"),
                )
                yield json.dumps({"type": "done", "data": None}, ensure_ascii=False)

    def _build_context_prompt(self, session_id: str, query: str) -> str:
        """Build a prompt that includes recent conversation history."""
        messages = self._messages.get(session_id, [])
        # Take last 10 messages (excluding the just-added user message)
        history = messages[:-1][-10:] if len(messages) > 1 else []

        if not history:
            return query

        context_parts = ["以下是之前的对话记录：\n"]
        for msg in history:
            role_label = "用户" if msg["role"] == "user" else "助手"
            content = msg["content"][:500]  # Truncate long messages
            context_parts.append(f"{role_label}: {content}")

        context_parts.append(f"\n当前用户提问: {query}")
        context_parts.append("\n请基于对话上下文回答当前问题。")
        return "\n".join(context_parts)

    async def _stream_live(
        self, session_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        """Generate SSE events from a live LLM driver."""
        from app.agents.driver import get_driver

        driver = get_driver()
        system = "你是快查 AI 的智能助手，专注于企业风险查询和分析。请用中文回答。"
        full_content = ""

        # Build prompt with conversation history for multi-turn context
        context_prompt = self._build_context_prompt(session_id, query)

        async for token in driver.call_streaming(context_prompt, system=system):
            if not token:
                continue

            full_content += token

            # Split long chunks so frontend can render smoother token-by-token updates.
            for piece in self._chunk_for_sse(token):
                if piece:
                    yield json.dumps({"type": "token", "data": piece}, ensure_ascii=False)

        # Persist the assistant message
        self.add_message(session_id, "assistant", full_content.strip())
        yield json.dumps({"type": "done", "data": None}, ensure_ascii=False)

    def _chunk_for_sse(self, text: str, chunk_size: int = 24) -> list[str]:
        """Split text into short chunks for smoother front-end streaming."""
        if len(text) <= chunk_size:
            return [text]

        # Keep line breaks visible and avoid slicing multi-byte chars manually.
        chunks: list[str] = []
        for line in text.splitlines(keepends=True):
            if len(line) <= chunk_size:
                chunks.append(line)
                continue
            chunks.extend(textwrap.wrap(line, width=chunk_size, replace_whitespace=False, drop_whitespace=False))
        return chunks if chunks else [text]


# Module-level singleton
chat_service = ChatService()
