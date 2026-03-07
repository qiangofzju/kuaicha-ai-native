"""Skills service facade with manifest-driven runtime."""

from __future__ import annotations

import csv
import io
import re
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException

from app.agents.executor import executor
from app.schemas.agent import TaskStatus
from app.services.agent_service import agent_service
from app.skills_core.chat_invoke import skill_mention_parser
from app.skills_core.manifest_loader import manifest_registry
from app.skills_core.runtime import skills_runtime
from app.skills_core.manifest_schema import SkillManifest
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
        self._run_to_skill: dict[str, str] = {}
        self._refresh_mappings()

    def _refresh_mappings(self) -> None:
        mapping: dict[str, str] = {}
        for manifest in manifest_registry.list_manifests():
            agent_id = manifest.execution.agent_id
            if agent_id and agent_id not in mapping:
                mapping[agent_id] = manifest.id
        self._agent_to_skill = mapping

    def refresh_catalog(self) -> None:
        """Reload manifests and chat mention index after file changes."""
        manifest_registry.reload()
        skill_mention_parser.reload()
        self._refresh_mappings()

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

    @staticmethod
    def _manifest_extra(manifest: SkillManifest) -> dict[str, Any]:
        dumped = manifest.model_dump()
        known = {
            "id",
            "version",
            "name",
            "display_name",
            "description",
            "category",
            "status",
            "author",
            "tags",
            "entrypoints",
            "triggers",
            "execution",
            "input_schema",
            "output_schema",
            "permissions",
            "ui",
        }
        return {k: v for k, v in dumped.items() if k not in known}

    @staticmethod
    def _normalized_source(manifest: SkillManifest) -> tuple[str, str]:
        extra = SkillService._manifest_extra(manifest)
        raw_source = str(extra.get("source", "")).strip()
        if raw_source in {"user_generated", "builder"} or manifest.author == "@SkillCreator":
            return "builder", raw_source or "builder"
        return raw_source, raw_source

    def _manifest_payload(self, manifest: SkillManifest) -> dict[str, Any]:
        payload = manifest.model_dump()
        source, raw_source = self._normalized_source(manifest)
        if source:
            payload["source"] = source
        if raw_source:
            payload["source_raw"] = raw_source
        return payload

    def _is_internal_manifest(self, manifest: SkillManifest) -> bool:
        extra = self._manifest_extra(manifest)
        return bool(extra.get("internal"))

    def _build_dynamic_skill_item(self, manifest: SkillManifest, manifest_path: Path) -> dict[str, Any]:
        extra = self._manifest_extra(manifest)
        accent = manifest.ui.theme_accent if manifest.ui and manifest.ui.theme_accent else "#22C55E"
        source, raw_source = self._normalized_source(manifest)
        owner = "@SkillCreator" if source == "builder" else (manifest.author or "@技能团队")

        return {
            "id": manifest.id,
            "name": manifest.display_name,
            "description": manifest.description,
            "color": accent,
            "tags": manifest.tags or ["用户创建"],
            "icon": str(extra.get("icon") or "Sparkle"),
            "status": manifest.status,
            "author": owner,
            "price_type": "free",
            "owned": True,
            "cover": str(extra.get("cover") or manifest_path.parent.name),
            "market_status": "ready" if manifest.status == "ready" else "coming",
            "source": source,
            "source_raw": raw_source,
        }

    def _list_dynamic_skills(self) -> list[dict[str, Any]]:
        mock_ids = {item.get("id") for item in get_mock_skill_list()}
        dynamic: list[dict[str, Any]] = []

        for manifest, path in manifest_registry.list_manifest_items():
            if manifest.id in mock_ids:
                continue
            if self._is_internal_manifest(manifest):
                continue
            dynamic.append(self._build_dynamic_skill_item(manifest, path))

        dynamic.sort(key=lambda item: str(item.get("name", "")))
        return dynamic

    def _merge_unique_items(self, base: list[dict[str, Any]], extra: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged = list(base)
        exists = {str(item.get("id", "")) for item in merged}
        for item in extra:
            item_id = str(item.get("id", ""))
            if item_id and item_id not in exists:
                merged.append(item)
                exists.add(item_id)
        return merged

    def _resolve_skill_id(
        self,
        run_id: str,
        agent_id: str,
        result: dict[str, Any] | None = None,
    ) -> str:
        if run_id in self._run_to_skill:
            return self._run_to_skill[run_id]

        metadata = result.get("metadata", {}) if isinstance(result, dict) else {}
        if isinstance(metadata, dict) and metadata.get("skill_id"):
            return str(metadata["skill_id"])

        return self._agent_to_skill.get(agent_id, agent_id)

    def list_skills(self) -> list[dict]:
        base = [self._merge_market_item_with_manifest(item) for item in get_mock_skill_list()]
        return self._merge_unique_items(base, self._list_dynamic_skills())

    def get_store(self) -> dict:
        store = get_mock_skill_store()
        sections = []
        for section in store.get("sections", []):
            items = [self._merge_market_item_with_manifest(item) for item in section.get("items", [])]
            sections.append({**section, "items": items})

        dynamic = self._list_dynamic_skills()
        if dynamic:
            sections.append(
                {
                    "id": "user-generated",
                    "title": "我创建的技能",
                    "subtitle": "自动生成并可立即复用",
                    "style": "grid",
                    "items": dynamic,
                }
            )

        return {"sections": sections}

    def get_my_skills(self) -> list[dict]:
        base = [self._merge_market_item_with_manifest(item) for item in get_mock_my_skills()]
        return self._merge_unique_items(base, self._list_dynamic_skills())

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
            if self._is_internal_manifest(manifest):
                continue
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
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            return None
        if self._is_internal_manifest(manifest):
            return None
        return self._manifest_payload(manifest)

    def get_skill_config(self, skill_id: str) -> Optional[dict]:
        """Compatibility schema endpoint; prefer workflow schema if available."""
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            return None
        if self._is_internal_manifest(manifest):
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
        run_id = str(uuid.uuid4())
        try:
            task_id = await skills_runtime.invoke_async(
                skill_id=skill_id,
                input_payload=input_payload,
                context=context,
                run_id=run_id,
            )
        except HTTPException:
            raise

        final_run_id = str(task_id or run_id)
        self._run_to_skill[final_run_id] = skill_id

        return {
            "run_id": final_run_id,
            "task_id": final_run_id,
            "skill_id": skill_id,
            "status": TaskStatus.PENDING,
        }

    async def execute_skill(self, skill_id: str, target: str, params: dict) -> Optional[str]:
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            for item in get_mock_skill_list():
                if str(item.get("id")) == skill_id:
                    raise SkillComingSoonError(f"Skill `{skill_id}` is not executable")
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

        result_payload: dict[str, Any] | None = None
        if task.result is not None:
            result_payload = {
                "metadata": task.result.metadata,
            }

        skill_id = self._resolve_skill_id(
            run_id=run_id,
            agent_id=task.agent_id,
            result=result_payload,
        )
        return self._status_from_record(status, skill_id=skill_id)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        return self.get_run_status(task_id)

    def get_run_result(self, run_id: str) -> Optional[dict[str, Any]]:
        result = agent_service.get_task_result(run_id)
        if result is None:
            return None
        agent_id = str(result.get("agent_type", ""))
        skill_id = self._resolve_skill_id(run_id=run_id, agent_id=agent_id, result=result)
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
