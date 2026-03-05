"""Manifest loader for skills assets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.skills_core.manifest_schema import SkillManifest


class ManifestRegistry:
    """Loads and caches manifests under backend/app/skills_assets."""

    def __init__(self):
        root = Path(__file__).resolve().parent.parent
        self._assets_root = root / "skills_assets"
        self._manifests: dict[str, SkillManifest] = {}
        self._manifest_paths: dict[str, Path] = {}
        self.reload()

    def reload(self) -> None:
        manifests: dict[str, SkillManifest] = {}
        manifest_paths: dict[str, Path] = {}

        if not self._assets_root.exists():
            self._manifests = manifests
            self._manifest_paths = manifest_paths
            return

        for child in sorted(self._assets_root.iterdir()):
            if not child.is_dir():
                continue
            manifest_path = child / "manifest.json"
            if not manifest_path.exists():
                continue

            raw = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest = SkillManifest.model_validate(raw)
            manifests[manifest.id] = manifest
            manifest_paths[manifest.id] = manifest_path

        self._manifests = manifests
        self._manifest_paths = manifest_paths

    def list_manifests(self) -> list[SkillManifest]:
        return list(self._manifests.values())

    def get_manifest(self, skill_id: str) -> SkillManifest | None:
        return self._manifests.get(skill_id)

    def get_manifest_dict(self, skill_id: str) -> dict[str, Any] | None:
        manifest = self.get_manifest(skill_id)
        if manifest is None:
            return None
        return manifest.model_dump()


manifest_registry = ManifestRegistry()
