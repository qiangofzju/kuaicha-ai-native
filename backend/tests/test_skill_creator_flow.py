"""Integration test for skill creator flow."""

import asyncio
import shutil
import unittest
from pathlib import Path

from app.agents.registry import register_all_agents
from app.services.skill_service import skill_service
from app.services.workspace.virtual_fs import virtual_fs


async def _wait_for_run_done(run_id: str, timeout_sec: float = 20.0) -> dict:
    max_steps = int(timeout_sec / 0.05)
    for _ in range(max_steps):
        status = skill_service.get_run_status(run_id)
        if status and status.get("status") in {"completed", "failed", "cancelled"}:
            break
        await asyncio.sleep(0.05)

    status = skill_service.get_run_status(run_id)
    if not status:
        raise AssertionError("run status not found")
    if status.get("status") != "completed":
        raise AssertionError(f"run not completed: {status}")

    for _ in range(60):
        result = skill_service.get_run_result(run_id)
        if result is not None:
            return result
        await asyncio.sleep(0.05)

    raise AssertionError("run result not ready")


class SkillCreatorFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_all_agents()

    def test_skill_creator_generates_files(self):
        async def _run():
            query = "创建flow-unittest技能，用于验证自动生成文件和目录结构"
            run = await skill_service.create_run(
                skill_id="skill-creator",
                input_payload={"query": query},
                context={"source": "test"},
            )
            run_id = str(run["run_id"])
            result = await _wait_for_run_done(run_id)

            created_skill_id = str(result.get("created_skill_id", ""))
            artifact_root_raw = str(result.get("artifact_root", ""))
            artifact_root = (
                virtual_fs.to_real(artifact_root_raw)
                if artifact_root_raw.startswith("vfs://")
                else Path(artifact_root_raw)
            )

            self.assertTrue(created_skill_id)
            self.assertTrue(artifact_root.exists())
            self.assertTrue((artifact_root / "manifest.json").exists())
            self.assertTrue((artifact_root / "SKILL.md").exists())
            self.assertTrue((artifact_root / "scripts" / "validate_input.py").exists())
            self.assertTrue((artifact_root / "references" / "usage.md").exists())

            shutil.rmtree(artifact_root, ignore_errors=True)
            skill_service.refresh_catalog()

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
