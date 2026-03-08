"""Workspace read/write and tree listing tests."""

import asyncio
import unittest

from app.services.workspace.workspace_session import workspace_session_service


class WorkspaceFileOpsTest(unittest.TestCase):
    def test_tree_read_write_roundtrip(self):
        async def _run():
            session = workspace_session_service.create_session(purpose="skill_create", seed_prompt="")
            for _ in range(80):
                current = workspace_session_service.get(session.workspace_id)
                if current and current.status == "ready":
                    break
                await asyncio.sleep(0.05)

            target = f"{session.display_root}/demo.txt"
            saved = workspace_session_service.write_file(session.workspace_id, target, "hello workspace")
            self.assertTrue(saved.get("ok"))

            loaded = workspace_session_service.read_file(session.workspace_id, target)
            self.assertEqual(loaded.get("content"), "hello workspace")

            tree = workspace_session_service.list_tree(session.workspace_id)
            self.assertTrue(any(node.get("name") == "demo.txt" for node in tree.get("nodes", [])))

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
