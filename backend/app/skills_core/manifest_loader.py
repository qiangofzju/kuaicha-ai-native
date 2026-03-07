"""Manifest loader for skills assets."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.skills_core.manifest_schema import SkillManifest

logger = logging.getLogger(__name__)


class ManifestRegistry:
    """Loads and caches manifests from multiple scan paths."""

    def __init__(self) -> None:
        root = Path(__file__).resolve().parent.parent
        self._scan_paths: list[Path] = [root / "skills_assets"]
        self._manifests: dict[str, SkillManifest] = {}
        self._manifest_paths: dict[str, Path] = {}
        self._try_add_workspace_path()
        self.reload()

    def _try_add_workspace_path(self) -> None:
        """Add the workspace user-generated path if the workspace module is available."""
        try:
            from app.services.workspace.config import workspace_config
            ug = workspace_config.user_generated_root
            if ug not in self._scan_paths:
                self._scan_paths.append(ug)
        except Exception:
            pass

    def add_scan_path(self, path: Path) -> None:
        """Register an additional directory to scan for manifests."""
        resolved = path.resolve()
        if resolved not in self._scan_paths:
            self._scan_paths.append(resolved)

    def reload(self) -> None:
        manifests: dict[str, SkillManifest] = {}
        manifest_paths: dict[str, Path] = {}

        for scan_root in self._scan_paths:
            if not scan_root.exists():
                continue

            for manifest_path in sorted(scan_root.rglob("manifest.json")):
                if not manifest_path.is_file():
                    continue

                try:
                    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
                    manifest = SkillManifest.model_validate(raw)
                    manifests[manifest.id] = manifest
                    manifest_paths[manifest.id] = manifest_path
                except Exception as exc:
                    logger.warning("Failed to load manifest %s: %s", manifest_path, exc)

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
