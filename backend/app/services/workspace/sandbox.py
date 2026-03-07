"""Sandboxed file operations with virtual path support."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.services.workspace.config import workspace_config
from app.services.workspace.virtual_fs import virtual_fs


@dataclass
class WorkspaceActionResult:
    """Structured result returned by each workspace action."""

    action: str
    path: str  # virtual path (vfs://...)
    ok: bool
    detail: str
    extra: dict[str, Any] = field(default_factory=dict)


class WorkspaceSandbox:
    """Sandboxed filesystem operations — returns virtual paths, enforces quotas."""

    def __init__(self) -> None:
        self._cfg = workspace_config
        self._vfs = virtual_fs

    @property
    def user_generated_root(self) -> Path:
        return self._cfg.user_generated_root

    # ------------------------------------------------------------------
    # Path resolution with security checks
    # ------------------------------------------------------------------

    def _resolve(self, rel_path: str, namespace: str = "user-generated") -> Path:
        """Resolve a relative path within a namespace, with traversal protection."""
        clean = (rel_path or "").strip().replace("\\", "/")
        if not clean or clean.startswith("/"):
            raise ValueError("Path must be a non-empty relative path")

        if namespace == "user-generated":
            base = self._cfg.user_generated_root
        elif namespace == "temp":
            base = self._cfg.temp_root
        else:
            raise ValueError(f"Unknown namespace: {namespace}")

        candidate = (base / clean).resolve()
        if base not in candidate.parents and candidate != base:
            raise ValueError("Path traversal is not allowed")
        return candidate

    # ------------------------------------------------------------------
    # File operations
    # ------------------------------------------------------------------

    def mkdir_p(self, rel_path: str, namespace: str = "user-generated") -> WorkspaceActionResult:
        target = self._resolve(rel_path, namespace)
        target.mkdir(parents=True, exist_ok=True)
        return WorkspaceActionResult(
            action="mkdir_p",
            path=self._vfs.to_virtual(target),
            ok=True,
            detail="directory ready",
            extra={"exists": True},
        )

    def write_text_file(
        self, rel_path: str, content: str, namespace: str = "user-generated"
    ) -> WorkspaceActionResult:
        target = self._resolve(rel_path, namespace)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        # Remove execute permission for safety
        target.chmod(0o644)
        return WorkspaceActionResult(
            action="write_text_file",
            path=self._vfs.to_virtual(target),
            ok=True,
            detail="file written",
            extra={"bytes": len(content.encode("utf-8"))},
        )

    def read_text_file(
        self, rel_path: str, max_chars: int = 4000, namespace: str = "user-generated"
    ) -> WorkspaceActionResult:
        target = self._resolve(rel_path, namespace)
        if not target.exists() or not target.is_file():
            return WorkspaceActionResult(
                action="read_text_file",
                path=self._vfs.to_virtual(target) if self._vfs.validate_containment(target) else rel_path,
                ok=False,
                detail="file not found",
                extra={"content": ""},
            )

        raw = target.read_text(encoding="utf-8")
        clipped = raw if len(raw) <= max_chars else raw[: max_chars - 1] + "\u2026"
        return WorkspaceActionResult(
            action="read_text_file",
            path=self._vfs.to_virtual(target),
            ok=True,
            detail="file loaded",
            extra={"content": clipped, "truncated": len(raw) > max_chars},
        )

    def list_tree(
        self,
        rel_path: str = "",
        max_depth: int = 4,
        max_entries: int = 200,
        namespace: str = "user-generated",
    ) -> WorkspaceActionResult:
        target = self._resolve(rel_path, namespace) if rel_path else self._cfg.user_generated_root
        if not target.exists():
            return WorkspaceActionResult(
                action="list_tree",
                path=self._vfs.to_virtual(target) if self._vfs.validate_containment(target) else rel_path,
                ok=False,
                detail="path not found",
                extra={"tree": ""},
            )

        lines: list[str] = []
        entries = 0

        def walk(current: Path, prefix: str, depth: int) -> None:
            nonlocal entries
            if depth > max_depth or entries >= max_entries:
                return

            children = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            for idx, child in enumerate(children):
                if entries >= max_entries:
                    break
                connector = "\u2514\u2500\u2500 " if idx == len(children) - 1 else "\u251c\u2500\u2500 "
                lines.append(f"{prefix}{connector}{child.name}{'/' if child.is_dir() else ''}")
                entries += 1
                if child.is_dir():
                    extension = "    " if idx == len(children) - 1 else "\u2502   "
                    walk(child, prefix + extension, depth + 1)

        lines.append(f"{target.name}/")
        walk(target, "", 1)

        return WorkspaceActionResult(
            action="list_tree",
            path=self._vfs.to_virtual(target),
            ok=True,
            detail="tree generated",
            extra={"tree": "\n".join(lines), "entry_count": entries},
        )

    def delete(self, rel_path: str, namespace: str = "user-generated") -> WorkspaceActionResult:
        """Delete a file or directory within the namespace."""
        target = self._resolve(rel_path, namespace)
        if not target.exists():
            return WorkspaceActionResult(
                action="delete",
                path=self._vfs.to_virtual(target) if self._vfs.validate_containment(target) else rel_path,
                ok=True,
                detail="already absent",
            )

        import shutil

        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

        return WorkspaceActionResult(
            action="delete",
            path=self._vfs.to_virtual(target),
            ok=True,
            detail="deleted",
        )

    def get_size(self, rel_path: str, namespace: str = "user-generated") -> int:
        """Return total size in bytes of a directory or file."""
        target = self._resolve(rel_path, namespace)
        if not target.exists():
            return 0
        if target.is_file():
            return target.stat().st_size
        return sum(f.stat().st_size for f in target.rglob("*") if f.is_file())


workspace_sandbox = WorkspaceSandbox()
