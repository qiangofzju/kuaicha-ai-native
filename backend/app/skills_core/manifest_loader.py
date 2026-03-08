"""Skill package registry backed by ``SKILL.md`` files."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from app.skills_core.manifest_schema import SkillManifest

logger = logging.getLogger(__name__)


def parse_skill_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    stripped = text.lstrip()
    if not stripped.startswith("---\n") and not stripped.startswith("---\r\n"):
        raise ValueError("Missing YAML frontmatter")

    lines = stripped.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("Invalid frontmatter delimiter")

    end_index = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end_index = index
            break
    if end_index is None:
        raise ValueError("Unterminated YAML frontmatter")

    frontmatter_raw = "\n".join(lines[1:end_index])
    body = "\n".join(lines[end_index + 1 :]).lstrip("\n")
    payload = yaml.safe_load(frontmatter_raw) or {}
    if not isinstance(payload, dict):
        raise ValueError("Frontmatter must be a YAML object")
    return payload, body


def load_skill_manifest(skill_md_path: Path) -> SkillManifest:
    payload, _ = parse_skill_frontmatter(skill_md_path.read_text(encoding="utf-8"))
    app_block = payload.get("app")
    if not isinstance(app_block, dict):
        raise ValueError("Frontmatter is missing required app block")

    manifest_payload = dict(app_block)
    manifest_payload.setdefault("name", str(payload.get("name", "")).strip())
    manifest_payload.setdefault("description", str(payload.get("description", "")).strip())
    if not manifest_payload.get("display_name"):
        manifest_payload["display_name"] = manifest_payload.get("name", "")

    return SkillManifest.model_validate(manifest_payload)


class ManifestRegistry:
    """Loads and caches parsed skill packages from multiple scan paths."""

    def __init__(self) -> None:
        root = Path(__file__).resolve().parent.parent
        self._scan_paths: list[Path] = [root / "skills_assets"]
        self._manifests: dict[str, SkillManifest] = {}
        self._manifest_paths: dict[str, Path] = {}
        self._try_add_workspace_path()
        self.reload()

    def _try_add_workspace_path(self) -> None:
        try:
            from app.services.workspace.config import workspace_config

            user_generated_root = workspace_config.user_generated_root
            if user_generated_root not in self._scan_paths:
                self._scan_paths.append(user_generated_root)
        except Exception:
            pass

    def add_scan_path(self, path: Path) -> None:
        resolved = path.resolve()
        if resolved not in self._scan_paths:
            self._scan_paths.append(resolved)

    def reload(self) -> None:
        manifests: dict[str, SkillManifest] = {}
        manifest_paths: dict[str, Path] = {}

        for scan_root in self._scan_paths:
            if not scan_root.exists():
                continue

            for skill_md_path in sorted(scan_root.rglob("SKILL.md")):
                if not skill_md_path.is_file():
                    continue

                try:
                    manifest = load_skill_manifest(skill_md_path)
                    manifests[manifest.id] = manifest
                    manifest_paths[manifest.id] = skill_md_path
                except Exception as exc:
                    logger.warning("Failed to load skill package %s: %s", skill_md_path, exc)

        self._manifests = manifests
        self._manifest_paths = manifest_paths

    def list_manifests(self) -> list[SkillManifest]:
        return list(self._manifests.values())

    def list_manifest_items(self) -> list[tuple[SkillManifest, Path]]:
        items: list[tuple[SkillManifest, Path]] = []
        for skill_id, manifest in self._manifests.items():
            path = self._manifest_paths.get(skill_id)
            if path is None:
                continue
            items.append((manifest, path))
        return items

    def get_manifest(self, skill_id: str) -> SkillManifest | None:
        return self._manifests.get(skill_id)

    def get_manifest_dict(self, skill_id: str) -> dict[str, Any] | None:
        manifest = self.get_manifest(skill_id)
        if manifest is None:
            return None
        return manifest.model_dump()

    def get_manifest_path(self, skill_id: str) -> Path | None:
        return self._manifest_paths.get(skill_id)


manifest_registry = ManifestRegistry()
