"""Backward-compatible wrapper — delegates to workspace.sandbox."""

from __future__ import annotations

from app.services.workspace.sandbox import WorkspaceActionResult, workspace_sandbox


class SkillCreatorWorkspace:
    """Thin wrapper delegating all operations to WorkspaceSandbox."""

    @property
    def user_generated_root(self):
        return workspace_sandbox.user_generated_root

    def mkdir_p(self, rel_path: str) -> WorkspaceActionResult:
        return workspace_sandbox.mkdir_p(rel_path)

    def write_text_file(self, rel_path: str, content: str) -> WorkspaceActionResult:
        return workspace_sandbox.write_text_file(rel_path, content)

    def read_text_file(self, rel_path: str, max_chars: int = 4000) -> WorkspaceActionResult:
        return workspace_sandbox.read_text_file(rel_path, max_chars)

    def list_tree(self, rel_path: str = "", max_depth: int = 4, max_entries: int = 200) -> WorkspaceActionResult:
        return workspace_sandbox.list_tree(rel_path, max_depth, max_entries)


skill_creator_workspace = SkillCreatorWorkspace()
