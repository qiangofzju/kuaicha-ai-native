"""Unit tests for batch LLM waiting trace emission."""

import asyncio
import unittest

from app.agents.base import AgentProgress
from app.agents.workflows.batch_processing import BatchProcessingAgent


class BatchWaitTraceTest(unittest.TestCase):
    def test_emit_llm_waiting_trace_periodically(self):
        async def _run():
            agent = BatchProcessingAgent()
            trace_state = {"token": "ut", "seq": 0}
            stop_event = asyncio.Event()
            events: list[dict] = []

            async def on_progress(progress: AgentProgress):
                data = progress.data if isinstance(progress.data, dict) else {}
                if data.get("type") == "trace":
                    event = data.get("event", {})
                    if isinstance(event, dict):
                        events.append(event)

            task = asyncio.create_task(
                agent._emit_llm_waiting_trace(  # type: ignore[attr-defined]
                    on_progress=on_progress,
                    trace_state=trace_state,
                    stage="需求解析",
                    stage_index=0,
                    stop_event=stop_event,
                )
            )
            await asyncio.sleep(2.1)
            stop_event.set()
            await asyncio.wait_for(task, timeout=1.0)

            self.assertGreaterEqual(len(events), 2)
            self.assertTrue(all(evt.get("title") == "SQL 方案生成中" for evt in events))

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
