"""Integration-style test for WebSocket trace replay."""

import asyncio
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.executor import executor
from app.api.ws import ws_router


class _ReplayAgent(BaseAgent):
    agent_id = "ws-replay-agent"
    name = "WS Replay"
    description = "WS Replay"
    color = "#000000"
    tags = []

    async def execute(self, agent_input: AgentInput, on_progress=None) -> AgentResult:
        del agent_input
        if on_progress:
            for idx in range(2):
                await on_progress(
                    AgentProgress(
                        stage="需求解析",
                        progress=10 + idx,
                        message="trace",
                        data={
                            "type": "trace",
                            "event": {
                                "event_id": f"replay-{idx + 1}",
                                "ts": "2026-03-01T00:00:00.000Z",
                                "stage": "需求解析",
                                "stage_index": 0,
                                "kind": "info",
                                "title": "测试事件",
                                "detail": "脱敏文本",
                                "metrics": {},
                                "status": "running",
                            },
                        },
                    )
                )
        return AgentResult(summary="ok", report={}, metadata={})

    def get_config_schema(self) -> dict:
        return {"agent_id": self.agent_id, "fields": []}


class WsTraceReplayTest(unittest.TestCase):
    def test_completed_task_replays_trace_events(self):
        async def _run():
            task_id = await executor.execute(_ReplayAgent(), AgentInput(target="x", params={}))
            task = executor.get_task(task_id)
            self.assertIsNotNone(task)
            await asyncio.wait_for(task.asyncio_task, timeout=2.0)  # type: ignore[arg-type]
            return task_id

        task_id = asyncio.run(_run())

        app = FastAPI()
        app.include_router(ws_router)

        messages: list[dict] = []
        with TestClient(app) as client:
            with client.websocket_connect(f"/ws/agent/{task_id}") as ws:
                while True:
                    try:
                        messages.append(ws.receive_json())
                    except Exception:
                        break

        self.assertGreaterEqual(len(messages), 4)
        self.assertEqual(messages[0].get("type"), "agent_progress")
        trace_messages = [msg for msg in messages if msg.get("type") == "agent_trace"]
        self.assertEqual(len(trace_messages), 2)
        self.assertEqual(trace_messages[0]["data"]["event_id"], "replay-1")
        self.assertEqual(trace_messages[1]["data"]["event_id"], "replay-2")
        self.assertEqual(messages[-1].get("type"), "agent_complete")


if __name__ == "__main__":
    unittest.main()
