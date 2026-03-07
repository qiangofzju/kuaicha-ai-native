"""Generated skill runtime should execute script chain inside workspace."""

import asyncio
import shutil
import unittest

from app.agents.registry import register_all_agents
from app.services.skill_service import skill_service
from app.services.workspace.workspace_session import workspace_session_service


async def _wait_completed(run_id: str, timeout_sec: float = 25.0) -> None:
    steps = int(timeout_sec / 0.05)
    for _ in range(steps):
        status = skill_service.get_run_status(run_id)
        if status and status.get("status") in {"completed", "failed", "cancelled"}:
            break
        await asyncio.sleep(0.05)


class GeneratedSkillRuntimeSandboxExecTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_all_agents()

    def test_generated_skill_runtime_writes_output_file(self):
        async def _run():
            create_run = await skill_service.create_run(
                skill_id="skill-creator",
                input_payload={"query": "创建runtime-sandbox技能用于运行测试"},
                context={"source": "test"},
            )
            create_run_id = str(create_run["run_id"])
            await _wait_completed(create_run_id)
            create_result = skill_service.get_run_result(create_run_id)
            self.assertIsNotNone(create_result)
            assert create_result is not None

            created_skill_id = str(create_result.get("created_skill_id", ""))
            self.assertTrue(created_skill_id)

            session = workspace_session_service.create_session(purpose="skill_create", seed_prompt="")
            for _ in range(80):
                record = workspace_session_service.get(session.workspace_id)
                if record and record.status == "ready":
                    break
                await asyncio.sleep(0.05)

            run = await skill_service.create_run(
                skill_id=created_skill_id,
                input_payload={"query": "帮我输出结构化建议"},
                context={
                    "source": "test",
                    "workspace_id": session.workspace_id,
                    "session_id": session.session_id,
                },
            )
            run_id = str(run["run_id"])
            await _wait_completed(run_id)

            result = skill_service.get_run_result(run_id)
            self.assertIsNotNone(result)
            assert result is not None
            self.assertGreaterEqual(int(result.get("total_count", 0)), 1)

            record = workspace_session_service.get(session.workspace_id)
            self.assertIsNotNone(record)
            assert record is not None
            self.assertTrue((record.real_root / "outputs" / "latest.json").exists())

            shutil.rmtree(record.real_root, ignore_errors=True)
            skill_service.refresh_catalog()

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
