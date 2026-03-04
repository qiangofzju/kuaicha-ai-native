"""Integration-style tests for /ws/skills websocket stream."""

import asyncio
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.executor import executor
from app.api.ws import ws_router


class _SkillWsDummyAgent(BaseAgent):
    agent_id = "batch"
    name = "SkillWS"
    description = "SkillWS"
    color = "#000000"
    tags = []

    async def execute(self, agent_input: AgentInput, on_progress=None) -> AgentResult:
        del agent_input
        if on_progress:
            await on_progress(
                AgentProgress(
                    stage="需求解析",
                    progress=10,
                    message="trace",
                    data={
                        "type": "trace",
                        "event": {
                            "event_id": "skill-evt-1",
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


class SkillWsTest(unittest.TestCase):
    def test_skill_ws_uses_skill_message_types(self):
        async def _run():
            task_id = await executor.execute(_SkillWsDummyAgent(), AgentInput(target="x", params={}))
            task = executor.get_task(task_id)
            self.assertIsNotNone(task)
            await asyncio.wait_for(task.asyncio_task, timeout=2.0)  # type: ignore[arg-type]
            return task_id

        task_id = asyncio.run(_run())

        app = FastAPI()
        app.include_router(ws_router)
        messages: list[dict] = []
        with TestClient(app) as client:
            with client.websocket_connect(f"/ws/skills/{task_id}") as ws:
                while True:
                    try:
                        messages.append(ws.receive_json())
                    except Exception:
                        break

        self.assertGreaterEqual(len(messages), 3)
        self.assertEqual(messages[0].get("type"), "skill_progress")
        self.assertTrue(any(msg.get("type") == "skill_trace" for msg in messages))
        self.assertEqual(messages[-1].get("type"), "skill_complete")


if __name__ == "__main__":
    unittest.main()
