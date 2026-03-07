"""Workspace init event stream test."""

import asyncio
import unittest

from app.services.workspace.workspace_session import workspace_session_service


class WorkspaceSessionInitStreamTest(unittest.TestCase):
    def test_init_emits_logs_and_ready_state(self):
        async def _run():
            session = workspace_session_service.create_session(purpose="skill_create", seed_prompt="demo")
            sub = workspace_session_service.subscribe(session.workspace_id)
            self.assertIsNotNone(sub)
            assert sub is not None

            seen_init = False
            seen_ready = False
            for _ in range(120):
                event = await asyncio.wait_for(sub.queue.get(), timeout=2.0)
                if event.get("type") == "sandbox.init.delta":
                    seen_init = True
                if event.get("type") == "sandbox.state" and event.get("data", {}).get("status") == "ready":
                    seen_ready = True
                    break

            self.assertTrue(seen_init)
            self.assertTrue(seen_ready)
            workspace_session_service.unsubscribe(session.workspace_id, sub)

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
