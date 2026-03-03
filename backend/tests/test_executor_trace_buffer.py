"""Unit tests for executor trace buffering behavior."""

import asyncio
import unittest

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.executor import AgentExecutor


class _TraceDummyAgent(BaseAgent):
    agent_id = "dummy-trace"
    name = "Dummy"
    description = "Dummy"
    color = "#000000"
    tags = []

    def __init__(self, event_count: int = 1):
        self.event_count = event_count

    async def execute(self, agent_input: AgentInput, on_progress=None) -> AgentResult:
        del agent_input
        if on_progress:
            for idx in range(self.event_count):
                event = {
                    "event_id": f"evt-{idx + 1}",
                    "ts": "2026-03-01T00:00:00.000Z",
                    "stage": "需求解析",
                    "stage_index": 0,
                    "kind": "info",
                    "title": "测试事件",
                    "detail": "测试",
                    "metrics": {},
                    "status": "running",
                }
                await on_progress(
                    AgentProgress(
                        stage="需求解析",
                        progress=10,
                        message="trace",
                        data={"type": "trace", "event": event},
                    )
                )
        return AgentResult(summary="ok", report={}, metadata={})

    def get_config_schema(self) -> dict:
        return {"agent_id": self.agent_id, "fields": []}


class ExecutorTraceBufferTest(unittest.TestCase):
    def test_trace_events_are_buffered(self):
        async def _run():
            executor = AgentExecutor()
            task_id = await executor.execute(_TraceDummyAgent(event_count=2), AgentInput(target="x", params={}))
            task = executor.get_task(task_id)
            self.assertIsNotNone(task)
            await asyncio.wait_for(task.asyncio_task, timeout=2.0)  # type: ignore[arg-type]
            events = executor.get_trace_events(task_id)
            self.assertEqual(len(events), 2)
            self.assertEqual(events[0].get("event_id"), "evt-1")
            self.assertEqual(events[1].get("event_id"), "evt-2")

        asyncio.run(_run())

    def test_trace_events_respect_ring_buffer_limit(self):
        async def _run():
            executor = AgentExecutor()
            task_id = await executor.execute(
                _TraceDummyAgent(event_count=350),
                AgentInput(target="x", params={}),
            )
            task = executor.get_task(task_id)
            self.assertIsNotNone(task)
            await asyncio.wait_for(task.asyncio_task, timeout=3.0)  # type: ignore[arg-type]
            events = executor.get_trace_events(task_id)
            self.assertEqual(len(events), 300)
            self.assertEqual(events[0].get("event_id"), "evt-51")
            self.assertEqual(events[-1].get("event_id"), "evt-350")

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
