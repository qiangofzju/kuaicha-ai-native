"""Tests mention parser and runtime execution for generated skills."""

import asyncio
import shutil
import unittest
from pathlib import Path

from app.agents.registry import register_all_agents
from app.services.skill_service import skill_service
from app.skills_core.chat_invoke import skill_mention_parser
from app.services.workspace.virtual_fs import virtual_fs


async def _create_skill() -> tuple[str, Path]:
    run = await skill_service.create_run(
        skill_id="skill-creator",
        input_payload={"query": "创建mention-refresh技能，用于验证@调用与执行"},
        context={"source": "test"},
    )
    run_id = str(run["run_id"])

    for _ in range(400):
        status = skill_service.get_run_status(run_id)
        if status and status.get("status") == "completed":
            break
        await asyncio.sleep(0.05)

    result = skill_service.get_run_result(run_id)
    if result is None:
        raise AssertionError("creator result not found")

    skill_id = str(result.get("created_skill_id", ""))
    root_raw = str(result.get("artifact_root", ""))
    root = virtual_fs.to_real(root_raw) if root_raw.startswith("vfs://") else Path(root_raw)
    return skill_id, root


class SkillCreatorMentionReloadTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_all_agents()

    def test_created_skill_can_be_mentioned_and_executed(self):
        async def _run():
            skill_id, root = await _create_skill()

            payload = skill_mention_parser.build_skill_card_payload(f"@{skill_id} 帮我输出结构化结果")
            self.assertIsNotNone(payload)
            assert payload is not None
            self.assertEqual(payload.get("skill_id"), skill_id)

            run = await skill_service.create_run(
                skill_id=skill_id,
                input_payload={"query": "帮我总结关键字段"},
                context={"source": "test"},
            )
            run_id = str(run["run_id"])

            for _ in range(400):
                status = skill_service.get_run_status(run_id)
                if status and status.get("status") == "completed":
                    break
                await asyncio.sleep(0.05)

            result = skill_service.get_run_result(run_id)
            self.assertIsNotNone(result)
            assert result is not None
            self.assertIn("轻量执行", str(result.get("summary", "")))

            shutil.rmtree(root, ignore_errors=True)
            skill_service.refresh_catalog()

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
