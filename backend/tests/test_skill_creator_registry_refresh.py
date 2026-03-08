"""Tests dynamic marketplace visibility after skill creation."""

import asyncio
import shutil
import unittest
from pathlib import Path

from app.agents.registry import register_all_agents
from app.services.skill_service import skill_service
from app.services.workspace.virtual_fs import virtual_fs


async def _run_creator_once(query: str) -> tuple[str, Path]:
    run = await skill_service.create_run(
        skill_id="skill-creator",
        input_payload={"query": query},
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
        raise AssertionError("result not found")

    skill_id = str(result.get("created_skill_id", ""))
    root_raw = str(result.get("artifact_root", ""))
    root = virtual_fs.to_real(root_raw) if root_raw.startswith("vfs://") else Path(root_raw)
    if not skill_id:
        raise AssertionError("created skill id empty")
    return skill_id, root


class SkillCreatorRegistryRefreshTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_all_agents()

    def test_created_skill_visible_in_list_store_and_mine(self):
        async def _run():
            skill_id, root = await _run_creator_once("创建registry-refresh技能，用于验证动态上架")

            listed_ids = {item.get("id") for item in skill_service.list_skills()}
            self.assertIn(skill_id, listed_ids)

            store = skill_service.get_store()
            store_ids = {
                item.get("id")
                for section in store.get("sections", [])
                for item in section.get("items", [])
            }
            self.assertIn(skill_id, store_ids)

            my_ids = {item.get("id") for item in skill_service.get_my_skills()}
            self.assertIn(skill_id, my_ids)

            shutil.rmtree(root, ignore_errors=True)
            skill_service.refresh_catalog()

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
