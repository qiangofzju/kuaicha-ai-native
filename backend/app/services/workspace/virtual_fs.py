"""Virtual path mapping layer — frontend never sees real filesystem paths."""

from __future__ import annotations

from pathlib import Path

from app.services.workspace.config import workspace_config

SKILLS_PREFIX = "vfs://skills/"
TEMP_PREFIX = "vfs://temp/"


class VirtualPath:
    """Bidirectional mapping between real paths and ``vfs://`` virtual paths."""

    def __init__(self) -> None:
        self._cfg = workspace_config

    def to_virtual(self, real_path: Path | str) -> str:
        """Convert a real filesystem path to a virtual path for the frontend."""
        resolved = Path(real_path).resolve()

        try:
            rel = resolved.relative_to(self._cfg.skills_root)
            return f"{SKILLS_PREFIX}{rel}"
        except ValueError:
            pass

        try:
            rel = resolved.relative_to(self._cfg.temp_root)
            return f"{TEMP_PREFIX}{rel}"
        except ValueError:
            pass

        raise ValueError(f"Path {resolved} is outside managed workspace")

    def to_real(self, vpath: str) -> Path:
        """Convert a virtual path back to a real filesystem path."""
        if vpath.startswith(SKILLS_PREFIX):
            rel = vpath[len(SKILLS_PREFIX):]
            return (self._cfg.skills_root / rel).resolve()

        if vpath.startswith(TEMP_PREFIX):
            rel = vpath[len(TEMP_PREFIX):]
            return (self._cfg.temp_root / rel).resolve()

        raise ValueError(f"Unknown virtual path prefix: {vpath}")

    def validate_containment(self, real_path: Path | str) -> bool:
        """Check that *real_path* is inside the workspace boundary."""
        resolved = Path(real_path).resolve()
        return (
            self._is_under(resolved, self._cfg.skills_root)
            or self._is_under(resolved, self._cfg.temp_root)
        )

    @staticmethod
    def _is_under(child: Path, parent: Path) -> bool:
        try:
            child.relative_to(parent)
            return True
        except ValueError:
            return False


virtual_fs = VirtualPath()
