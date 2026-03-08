"""Workspace configuration: paths, quotas, limits."""

from __future__ import annotations

import os
from pathlib import Path


class WorkspaceConfig:
    """Configurable workspace paths and limits.

    Default root: ``<project_root>/data/workspaces/``
    Override via ``WORKSPACE_ROOT`` environment variable.
    """

    def __init__(self) -> None:
        env_root = os.getenv("WORKSPACE_ROOT", "").strip()
        if env_root:
            self.root = Path(env_root).resolve()
        else:
            # backend/app/services/workspace/config.py -> backend/
            backend_root = Path(__file__).resolve().parent.parent.parent.parent
            self.root = (backend_root / "data" / "workspaces").resolve()

        self.skills_root = self.root / "skills"
        self.temp_root = self.root / "temp"

        # Quotas
        self.max_skill_size: int = 10 * 1024 * 1024  # 10 MB per skill
        self.max_skills: int = 100

    @property
    def user_generated_root(self) -> Path:
        return self.skills_root / "user-generated"

    def ensure_dirs(self) -> None:
        """Create workspace directories if they do not exist."""
        self.skills_root.mkdir(parents=True, exist_ok=True)
        self.user_generated_root.mkdir(parents=True, exist_ok=True)
        self.temp_root.mkdir(parents=True, exist_ok=True)


workspace_config = WorkspaceConfig()
workspace_config.ensure_dirs()
