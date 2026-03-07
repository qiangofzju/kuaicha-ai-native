"""Unit tests for skills service facade."""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from app.services.skill_service import SkillComingSoonError, skill_service


class SkillServiceTest(unittest.TestCase):
    def test_list_and_store_payloads(self):
        skills = skill_service.list_skills()
        self.assertTrue(any(item["id"] == "batch" for item in skills))

        store = skill_service.get_store()
        self.assertIn("sections", store)
        self.assertGreaterEqual(len(store["sections"]), 2)

    def test_non_batch_skill_is_coming_soon(self):
        async def _run():
            with self.assertRaises(SkillComingSoonError):
                await skill_service.execute_skill("risk", target="x", params={})

        asyncio.run(_run())

    def test_batch_skill_proxies_to_agent_service(self):
        async def _run():
            with patch(
                "app.services.skill_service.agent_service.execute_agent",
                new_callable=AsyncMock,
            ) as mock_exec:
                mock_exec.return_value = "task-123"
                task_id = await skill_service.execute_skill("batch", target="demo", params={"k": 1})
                self.assertEqual(task_id, "task-123")
                mock_exec.assert_awaited_once()
                _, kwargs = mock_exec.await_args
                self.assertEqual(kwargs["agent_id"], "batch")

        asyncio.run(_run())

    def test_user_generated_manifest_is_normalized_to_builder_source(self):
        manifest = skill_service.get_manifest("skill-06d107")
        self.assertIsNotNone(manifest)
        assert manifest is not None
        self.assertEqual(manifest.get("source"), "builder")
        self.assertEqual(manifest.get("source_raw"), "user_generated")


if __name__ == "__main__":
    unittest.main()
