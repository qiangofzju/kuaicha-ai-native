"""Agent executor – manages task lifecycle and progress broadcasting."""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.schemas.agent import TaskStatus
from app.utils.logger import logger


class _TaskRecord:
    """Internal record tracking the state of a running or completed task."""

    def __init__(self, task_id: str, agent_id: str):
        self.task_id = task_id
        self.agent_id = agent_id
        self.status: TaskStatus = TaskStatus.PENDING
        self.progress: float = 0.0
        self.stage: str = "初始化"
        self.message: str = "任务已创建"
        self.result: Optional[AgentResult] = None
        self.error: Optional[str] = None
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.asyncio_task: Optional[asyncio.Task] = None
        self.trace_events: list[dict[str, Any]] = []

    def to_status_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "status": self.status.value,
            "progress": self.progress,
            "stage": self.stage,
            "message": self.message,
            "created_at": self.created_at,
        }


class AgentExecutor:
    """Singleton-ish executor that runs agents and manages task state.

    Subscribers (e.g. WebSocket handlers) can register callbacks to
    receive real-time progress updates.
    """

    def __init__(self):
        self._tasks: dict[str, _TaskRecord] = {}
        self._subscribers: dict[str, list[Callable]] = {}
        self._trace_event_limit = 300

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute(
        self,
        agent: BaseAgent,
        agent_input: AgentInput,
        task_id: Optional[str] = None,
    ) -> str:
        """Launch agent execution in a background task.

        Returns the task_id immediately.
        """
        if task_id is None:
            task_id = str(uuid.uuid4())

        record = _TaskRecord(task_id=task_id, agent_id=agent.agent_id)
        self._tasks[task_id] = record

        record.asyncio_task = asyncio.create_task(self._run(agent, agent_input, record))
        return task_id

    async def _run(
        self,
        agent: BaseAgent,
        agent_input: AgentInput,
        record: _TaskRecord,
    ):
        """Internal coroutine that drives agent execution."""
        record.status = TaskStatus.RUNNING
        record.message = "任务开始执行"
        await self._notify(record.task_id, record.to_status_dict())

        async def on_progress(progress: AgentProgress):
            if (
                progress.data
                and isinstance(progress.data, dict)
                and progress.data.get("type") == "trace"
            ):
                event = progress.data.get("event")
                if isinstance(event, dict):
                    record.trace_events.append(event.copy())
                    if len(record.trace_events) > self._trace_event_limit:
                        record.trace_events = record.trace_events[-self._trace_event_limit :]

            # Stream chunks carry data but shouldn't overwrite record state
            is_stream = (
                progress.data
                and isinstance(progress.data, dict)
                and progress.data.get("type") == "stream"
            )
            if not is_stream:
                record.stage = progress.stage
                record.progress = progress.progress
                record.message = progress.message

            notification = record.to_status_dict()
            if progress.data is not None:
                notification["_extra"] = progress.data
            await self._notify(record.task_id, notification)

        try:
            result = await agent.execute(agent_input, on_progress=on_progress)
            record.status = TaskStatus.COMPLETED
            record.progress = 1.0
            record.stage = "完成"
            record.message = "任务执行完成"
            record.result = result
            await self._notify(record.task_id, record.to_status_dict())
            logger.info("Task %s completed", record.task_id)

        except asyncio.CancelledError:
            record.status = TaskStatus.CANCELLED
            record.message = "任务已取消"
            await self._notify(record.task_id, record.to_status_dict())
            logger.info("Task %s was cancelled", record.task_id)

        except Exception as exc:
            record.status = TaskStatus.FAILED
            record.message = f"任务执行失败: {exc}"
            record.error = str(exc)
            await self._notify(record.task_id, record.to_status_dict())
            logger.exception("Task %s failed", record.task_id)

    # ------------------------------------------------------------------
    # Task queries
    # ------------------------------------------------------------------

    def get_task(self, task_id: str) -> Optional[_TaskRecord]:
        return self._tasks.get(task_id)

    def get_trace_events(self, task_id: str) -> list[dict[str, Any]]:
        record = self._tasks.get(task_id)
        if record is None:
            return []
        return list(record.trace_events)

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task. Returns True if successfully cancelled."""
        record = self._tasks.get(task_id)
        if record is None:
            return False
        if record.status not in (TaskStatus.PENDING, TaskStatus.RUNNING):
            return False

        if record.asyncio_task and not record.asyncio_task.done():
            record.asyncio_task.cancel()

        record.status = TaskStatus.CANCELLED
        record.message = "任务已取消"
        await self._notify(task_id, record.to_status_dict())
        logger.info("Task %s cancelled", task_id)
        return True

    # ------------------------------------------------------------------
    # Subscriber management (WebSocket push)
    # ------------------------------------------------------------------

    def subscribe(self, task_id: str, callback: Callable):
        """Register a callback to receive progress updates for a task."""
        self._subscribers.setdefault(task_id, []).append(callback)

    def unsubscribe(self, task_id: str, callback: Callable):
        """Remove a previously registered callback."""
        listeners = self._subscribers.get(task_id, [])
        if callback in listeners:
            listeners.remove(callback)

    async def _notify(self, task_id: str, data: dict):
        """Broadcast a progress update to all subscribers of a task."""
        for callback in self._subscribers.get(task_id, []):
            try:
                await callback(data)
            except Exception:
                logger.exception("Error notifying subscriber for task %s", task_id)


# Module-level singleton
executor = AgentExecutor()
