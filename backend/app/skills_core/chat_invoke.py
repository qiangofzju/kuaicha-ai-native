"""Chat mention parser and prefill builder for skill invoke."""

from __future__ import annotations

import re
from typing import Any

from app.skills_core.manifest_loader import manifest_registry
from app.skills_core.manifest_schema import SkillManifest


MENTION_PATTERN = re.compile(r"@([^\s@]+)")


def _normalize(text: str) -> str:
    normalized = text.strip().lower()
    return normalized.strip("`'\".,!?;:，。！？；：（）()[]{}")


def _infer_batch_scenario(text: str) -> str:
    query = text.lower()
    derived_keywords = ["衍生", "同比", "环比", "增长率", "cagr", "指标", "评分", "比率"]
    export_keywords = ["导出", "字段", "excel", "名单", "导入", "上传"]

    if any(token in query for token in derived_keywords):
        return "derived"
    if any(token in query for token in export_keywords):
        return "export"
    return "filter"


class SkillMentionParser:
    """Resolve mentions like @batch / @批量数据处理 to manifests."""

    def __init__(self):
        self._mention_index: dict[str, str] = {}
        self.reload()

    def reload(self) -> None:
        index: dict[str, str] = {}
        for manifest in manifest_registry.list_manifests():
            if manifest.status != "ready":
                continue
            if not manifest.entrypoints.chat_invoke:
                continue
            raw = manifest.model_dump()
            if bool(raw.get("internal")):
                continue
            index[_normalize(manifest.id)] = manifest.id
            index[_normalize(manifest.name)] = manifest.id
            index[_normalize(manifest.display_name)] = manifest.id
            for mention_id in manifest.triggers.mention_ids:
                index[_normalize(mention_id)] = manifest.id
            for alias in manifest.triggers.mention_aliases:
                index[_normalize(alias)] = manifest.id
        self._mention_index = index

    def parse_first(self, message: str) -> SkillManifest | None:
        for raw in MENTION_PATTERN.findall(message):
            skill_id = self._mention_index.get(_normalize(raw))
            if not skill_id:
                continue
            return manifest_registry.get_manifest(skill_id)
        return None

    def build_skill_card_payload(self, message: str) -> dict[str, Any] | None:
        manifest = self.parse_first(message)
        if manifest is None:
            return None

        stripped = message
        for raw in MENTION_PATTERN.findall(message):
            mention_text = f"@{raw}"
            if self._mention_index.get(_normalize(raw)) == manifest.id:
                stripped = stripped.replace(mention_text, " ")
        stripped = re.sub(r"\s+", " ", stripped).strip()

        prefill: dict[str, Any] = {}
        required_fields = manifest.input_schema.required or []

        if manifest.id == "batch":
            prefill = {
                "query": stripped or "",
                "scenario": _infer_batch_scenario(stripped),
            }

        return {
            "skill_id": manifest.id,
            "display_name": manifest.display_name,
            "description": manifest.description,
            "prefill": prefill,
            "required_fields": required_fields,
            "ui": manifest.ui.model_dump(),
        }


skill_mention_parser = SkillMentionParser()
