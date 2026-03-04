"""Skills service facade built on top of the existing agent engine."""

from __future__ import annotations

import csv
import io
import re
import uuid
from typing import Optional

from app.agents.executor import executor
from app.services.agent_service import agent_service
from app.utils.mock_skills import (
    get_mock_my_skills,
    get_mock_purchase_records,
    get_mock_skill_list,
    get_mock_skill_store,
)


class SkillComingSoonError(Exception):
    """Raised when a skill exists but is not executable yet."""


class SkillService:
    """Marketplace + execution facade for skills."""

    def __init__(self):
        # skill_id -> agent_id (one-to-one mapping for MVP)
        self._skill_to_agent = {
            "batch": "batch",
            "risk": "risk",
            "sentiment": "sentiment",
            "bid": "bid",
            "tech": "tech",
            "graph": "graph",
            "trend": "trend",
            "map": "map",
            "job": "job",
        }
        self._agent_to_skill = {v: k for k, v in self._skill_to_agent.items()}
        self._executable_skills = {"batch"}

    def list_skills(self) -> list[dict]:
        return get_mock_skill_list()

    def get_store(self) -> dict:
        return get_mock_skill_store()

    def get_my_skills(self) -> list[dict]:
        return get_mock_my_skills()

    def get_purchase_records(self) -> list[dict]:
        return get_mock_purchase_records()

    def create_skill(self, payload: dict) -> dict:
        del payload
        return {
            "status": "submitted",
            "message": "技能创建申请已提交，进入审核队列",
            "review_id": f"skill-review-{uuid.uuid4().hex[:8]}",
        }

    def get_skill_config(self, skill_id: str) -> Optional[dict]:
        if skill_id not in self._skill_to_agent:
            return None
        agent_id = self._skill_to_agent[skill_id]
        config = agent_service.get_agent_config(agent_id)
        if config is None:
            return None
        normalized = dict(config)
        normalized["skill_id"] = skill_id
        normalized.pop("agent_id", None)
        return normalized

    async def execute_skill(self, skill_id: str, target: str, params: dict) -> Optional[str]:
        if skill_id not in self._skill_to_agent:
            return None
        if skill_id not in self._executable_skills:
            raise SkillComingSoonError(f"Skill `{skill_id}` is not executable in MVP")
        agent_id = self._skill_to_agent[skill_id]
        return await agent_service.execute_agent(agent_id=agent_id, target=target, params=params)

    async def cancel_task(self, task_id: str) -> bool:
        return await agent_service.cancel_task(task_id)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        task = executor.get_task(task_id)
        if task is None:
            return None
        skill_id = self._agent_to_skill.get(task.agent_id, task.agent_id)
        status = task.to_status_dict()
        status["skill_id"] = skill_id
        status.pop("agent_id", None)
        return status

    def get_task_result(self, task_id: str) -> Optional[dict]:
        result = agent_service.get_task_result(task_id)
        if result is None:
            return None
        skill_type = self._agent_to_skill.get(str(result.get("agent_type", "")), str(result.get("agent_type", "")))
        normalized = dict(result)
        normalized["skill_type"] = skill_type
        normalized.pop("agent_type", None)
        return normalized

    @staticmethod
    def parse_company_list(filename: str, content: bytes) -> list[str]:
        """Parse company names from xlsx/csv/txt bytes."""
        companies: list[str] = []
        if filename.endswith((".xlsx", ".xls")):
            import openpyxl

            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            for row in ws.iter_rows(values_only=True):  # type: ignore[union-attr]
                for cell in row:
                    val = str(cell).strip() if cell is not None else ""
                    if val and val not in ("None", "企业名称", "公司名称", "name"):
                        companies.append(val)
        elif filename.endswith(".csv"):
            text = content.decode("utf-8-sig", errors="replace")
            reader = csv.reader(io.StringIO(text))
            for row in reader:
                if not row:
                    continue
                val = row[0].strip()
                if val and val not in ("企业名称", "公司名称", "name"):
                    companies.append(val)
        else:
            text = content.decode("utf-8-sig", errors="replace")
            raw = [
                line.strip()
                for line in re.split(r"[\n\r]+", text)
                if line.strip()
            ]
            companies.extend([v for v in raw if v not in ("企业名称", "公司名称", "name")])

        deduped: list[str] = []
        seen: set[str] = set()
        for name in companies:
            if name in seen:
                continue
            seen.add(name)
            deduped.append(name)
            if len(deduped) >= 500:
                break
        return deduped


skill_service = SkillService()
