"""Workspace event hub for WebSocket streaming."""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from typing import Any


@dataclass
class WorkspaceSubscription:
    """Queue subscription with backlog replay payload."""

    queue: asyncio.Queue[dict[str, Any]]
    backlog: list[dict[str, Any]]


class WorkspaceEventHub:
    """In-memory fan-out event hub for workspace sessions."""

    def __init__(self, backlog_size: int = 300) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[dict[str, Any]]]] = {}
        self._backlogs: dict[str, deque[dict[str, Any]]] = {}
        self._backlog_size = backlog_size

    def publish(self, workspace_id: str, event: dict[str, Any]) -> None:
        """Publish one event to all workspace subscribers."""
        backlog = self._backlogs.setdefault(workspace_id, deque(maxlen=self._backlog_size))
        backlog.append(event)

        for queue in self._subscribers.get(workspace_id, []):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Drop oldest item to keep stream moving.
                try:
                    queue.get_nowait()
                except Exception:
                    pass
                try:
                    queue.put_nowait(event)
                except Exception:
                    pass

    def subscribe(self, workspace_id: str) -> WorkspaceSubscription:
        """Subscribe to workspace event stream."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=400)
        self._subscribers.setdefault(workspace_id, []).append(queue)
        backlog = list(self._backlogs.get(workspace_id, []))
        return WorkspaceSubscription(queue=queue, backlog=backlog)

    def unsubscribe(self, workspace_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Unsubscribe from workspace event stream."""
        listeners = self._subscribers.get(workspace_id, [])
        if queue in listeners:
            listeners.remove(queue)
        if not listeners and workspace_id in self._subscribers:
            self._subscribers.pop(workspace_id, None)


workspace_event_hub = WorkspaceEventHub()

