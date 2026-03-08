"""Workspace creator-result archive fallback tests."""

import asyncio
import shutil
import unittest

from app.agents.registry import register_all_agents
from app.services.skill_service import skill_service
from app.services.workspace.workspace_session import workspace_session_service


async def _wait_done(run_id: str, timeout_sec: float = 25.0) -> None:
    steps = int(timeout_sec / 0.05)
    for _ in range(steps):
        status = skill_service.get_run_status(run_id)
        if status and status.get("status") in {"completed", "failed", "cancelled"}:
            break
        await asyncio.sleep(0.05)


class CreatorResultArchiveFallbackTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_all_agents()

    def test_workspace_archives_creator_result(self):
        async def _run():
            session = workspace_session_service.create_session(purpose="skill_create", seed_prompt="")
            for _ in range(80):
                record = workspace_session_service.get(session.workspace_id)
                if record and record.status == "ready":
                    break
                await asyncio.sleep(0.05)

            run = await skill_service.create_run(
                skill_id="skill-creator",
                input_payload={"query": "创建archive-fallback技能"},
                context={
                    "source": "test",
                    "workspace_id": session.workspace_id,
                    "session_id": session.session_id,
                },
            )
            run_id = str(run["run_id"])
            await _wait_done(run_id)

            payload = workspace_session_service.get_creator_result(session.workspace_id, run_id)
            self.assertIsNotNone(payload)
            assert payload is not None
            self.assertTrue(payload.get("created_skill_id"))

            record = workspace_session_service.get(session.workspace_id)
            if record is not None:
                shutil.rmtree(record.real_root, ignore_errors=True)
            skill_service.refresh_catalog()

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
