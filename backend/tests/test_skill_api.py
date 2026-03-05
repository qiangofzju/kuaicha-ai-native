"""API tests for skills router."""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.skill import skill_router


class SkillApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = FastAPI()
        app.include_router(skill_router, prefix="/api")
        cls.client = TestClient(app)

    def test_list_endpoint(self):
        resp = self.client.get("/api/skills/list")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertTrue(any(item.get("id") == "batch" for item in payload))

    def test_non_executable_skill_returns_409(self):
        resp = self.client.post(
            "/api/skills/risk/execute",
            json={"target": "demo", "params": {}},
        )
        self.assertEqual(resp.status_code, 409)


if __name__ == "__main__":
    unittest.main()
