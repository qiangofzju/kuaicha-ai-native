"""Skills service facade with manifest-driven runtime."""

from __future__ import annotations

import csv
import io
import re
import uuid
from typing import Any, Optional

from fastapi import HTTPException

from app.agents.executor import executor
from app.schemas.agent import TaskStatus
from app.services.agent_service import agent_service
from app.skills_core.manifest_loader import manifest_registry
from app.skills_core.runtime import skills_runtime
from app.utils.mock_skills import (
    get_mock_my_skills,
    get_mock_purchase_records,
    get_mock_skill_list,
    get_mock_skill_store,
)


class SkillComingSoonError(Exception):
    """Raised when a skill exists but is not executable yet."""


class SkillService:
    """Marketplace + runtime facade for skills."""

    def __init__(self):
        self._agent_to_skill: dict[str, str] = {}
        self._refresh_mappings()

    def _refresh_mappings(self) -> None:
        mapping: dict[str, str] = {}
        for manifest in manifest_registry.list_manifests():
            agent_id = manifest.execution.agent_id
            if agent_id:
                mapping[agent_id] = manifest.id
        self._agent_to_skill = mapping

    def _merge_market_item_with_manifest(self, item: dict[str, Any]) -> dict[str, Any]:
        manifest = manifest_registry.get_manifest(str(item.get("id", "")))
        if manifest is None:
            return item

        merged = dict(item)
        merged["name"] = manifest.display_name
        merged["description"] = manifest.description
        merged["author"] = manifest.author
        merged["status"] = manifest.status
        merged["market_status"] = "ready" if manifest.status == "ready" else "coming"
        merged["tags"] = manifest.tags or merged.get("tags", [])
        return merged

    def _status_from_record(self, task: dict[str, Any], skill_id: str) -> dict[str, Any]:
        return {
            "run_id": task.get("task_id", ""),
            "task_id": task.get("task_id", ""),
            "skill_id": skill_id,
            "status": task.get("status", "pending"),
            "progress": task.get("progress", 0),
            "stage": task.get("stage", ""),
            "message": task.get("message", ""),
            "created_at": task.get("created_at", ""),
        }

    def _result_from_agent_result(self, result: dict[str, Any], skill_id: str) -> dict[str, Any]:
        normalized = dict(result)
        normalized["run_id"] = str(result.get("task_id", ""))
        normalized["skill_type"] = skill_id
        normalized["skill_id"] = skill_id
        normalized.pop("agent_type", None)
        return normalized

    def list_skills(self) -> list[dict]:
        return [self._merge_market_item_with_manifest(item) for item in get_mock_skill_list()]

    def get_store(self) -> dict:
        store = get_mock_skill_store()
        sections = []
        for section in store.get("sections", []):
            items = [self._merge_market_item_with_manifest(item) for item in section.get("items", [])]
            sections.append({**section, "items": items})
        return {"sections": sections}

    def get_my_skills(self) -> list[dict]:
        return [self._merge_market_item_with_manifest(item) for item in get_mock_my_skills()]

    def get_purchase_records(self) -> list[dict]:
        return get_mock_purchase_records()

    def create_skill(self, payload: dict) -> dict:
        del payload
        return {
            "status": "submitted",
            "message": "技能创建申请已提交，进入审核队列",
            "review_id": f"skill-review-{uuid.uuid4().hex[:8]}",
        }

    def get_catalog(self) -> list[dict[str, Any]]:
        catalog: list[dict[str, Any]] = []
        for manifest in manifest_registry.list_manifests():
            catalog.append(
                {
                    "id": manifest.id,
                    "version": manifest.version,
                    "name": manifest.name,
                    "display_name": manifest.display_name,
                    "description": manifest.description,
                    "category": manifest.category,
                    "status": manifest.status,
                    "author": manifest.author,
                    "tags": manifest.tags,
                    "entrypoints": manifest.entrypoints.model_dump(),
                }
            )
        return catalog

    def get_manifest(self, skill_id: str) -> Optional[dict[str, Any]]:
        return manifest_registry.get_manifest_dict(skill_id)

    def get_skill_config(self, skill_id: str) -> Optional[dict]:
        """Compatibility schema endpoint; prefer workflow schema if available."""
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            return None

        agent_id = manifest.execution.agent_id
        if agent_id:
            config = agent_service.get_agent_config(agent_id)
            if config is not None:
                normalized = dict(config)
                normalized["skill_id"] = skill_id
                normalized.pop("agent_id", None)
                return normalized

        fields: list[dict[str, Any]] = []
        required = set(manifest.input_schema.required or [])
        for name, prop in (manifest.input_schema.properties or {}).items():
            ptype = str(prop.get("type", "string"))
            entry: dict[str, Any] = {
                "name": name,
                "label": str(prop.get("title") or name),
                "required": name in required,
                "placeholder": str(prop.get("description") or ""),
            }
            if "enum" in prop:
                entry["type"] = "select"
                entry["options"] = [
                    {"label": str(v), "value": str(v)} for v in prop.get("enum", [])
                ]
                entry["default"] = str(prop.get("default", prop.get("enum", [""])[0]))
            elif ptype == "array":
                entry["type"] = "multiselect"
                entry["default"] = []
            else:
                entry["type"] = "text"
                entry["default"] = str(prop.get("default", ""))
            fields.append(entry)

        return {"skill_id": skill_id, "fields": fields}

    async def create_run(
        self,
        skill_id: str,
        input_payload: dict[str, Any],
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        try:
            run_id = await skills_runtime.invoke_async(skill_id=skill_id, input_payload=input_payload, context=context)
        except HTTPException:
            raise

        return {
            "run_id": run_id,
            "task_id": run_id,
            "skill_id": skill_id,
            "status": TaskStatus.PENDING,
        }

    async def execute_skill(self, skill_id: str, target: str, params: dict) -> Optional[str]:
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            return None
        if manifest.status != "ready":
            raise SkillComingSoonError(f"Skill `{skill_id}` is not executable")

        payload = dict(params)
        payload.setdefault("query", target)
        payload.setdefault("target", target)

        run = await self.create_run(skill_id=skill_id, input_payload=payload, context={"source": "standalone"})
        return str(run["run_id"])

    async def cancel_run(self, run_id: str) -> bool:
        return await agent_service.cancel_task(run_id)

    async def cancel_task(self, task_id: str) -> bool:
        return await self.cancel_run(task_id)

    def get_run_status(self, run_id: str) -> Optional[dict[str, Any]]:
        task = executor.get_task(run_id)
        if task is None:
            return None
        status = task.to_status_dict()
        skill_id = self._agent_to_skill.get(task.agent_id, task.agent_id)
        return self._status_from_record(status, skill_id=skill_id)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        return self.get_run_status(task_id)

    def get_run_result(self, run_id: str) -> Optional[dict[str, Any]]:
        result = agent_service.get_task_result(run_id)
        if result is None:
            return None
        skill_id = self._agent_to_skill.get(str(result.get("agent_type", "")), str(result.get("agent_type", "")))
        return self._result_from_agent_result(result, skill_id=skill_id)

    def get_task_result(self, task_id: str) -> Optional[dict]:
        return self.get_run_result(task_id)

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
