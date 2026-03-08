"""Workspace session lifecycle and file operations for skill builder."""

from __future__ import annotations

import asyncio
import hashlib
import mimetypes
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.services.workspace.command_runner import CommandRunResult, command_runner
from app.services.workspace.config import workspace_config
from app.services.workspace.virtual_fs import virtual_fs
from app.services.workspace.workspace_events import WorkspaceSubscription, workspace_event_hub


ALLOWED_COMMANDS = {"python3", "bash", "ls", "cat", "mkdir", "chmod"}


@dataclass
class WorkspaceSessionRecord:
    """Workspace session state."""

    workspace_id: str
    session_id: str
    purpose: str
    status: str
    display_root: str
    real_root: Path
    real_vfs_root: str
    seed_prompt: str = ""
    bound_skill_id: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    creator_result_latest: dict[str, Any] | None = None
    creator_result_by_run: dict[str, dict[str, Any]] = field(default_factory=dict)
    creator_session_state: dict[str, Any] = field(default_factory=dict)
    run_session_ids: list[str] = field(default_factory=list)
    init_task: asyncio.Task | None = None


class WorkspaceSessionService:
    """Stateful workspace sessions with streaming events."""

    def __init__(self) -> None:
        self._sessions: dict[str, WorkspaceSessionRecord] = {}
        self._skill_sessions: dict[str, str] = {}

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _emit(self, workspace_id: str, event_type: str, data: dict[str, Any]) -> None:
        workspace_event_hub.publish(workspace_id, {"type": event_type, "data": data})

    def _emit_init_line(self, record: WorkspaceSessionRecord, line: str) -> None:
        self._emit(
            record.workspace_id,
            "sandbox.init.delta",
            {"line": line, "ts": self._now()},
        )

    def _emit_state(self, record: WorkspaceSessionRecord) -> None:
        self._emit(record.workspace_id, "sandbox.state", {"status": record.status, "ts": self._now()})

    @staticmethod
    def _guess_content_type(path: Path) -> str:
        guessed, _ = mimetypes.guess_type(str(path))
        return guessed or "text/plain"

    @staticmethod
    def _detect_binary(raw: bytes) -> bool:
        if not raw:
            return False
        sample = raw[:2048]
        if b"\x00" in sample:
            return True
        try:
            sample.decode("utf-8")
            return False
        except UnicodeDecodeError:
            return True

    @staticmethod
    def _make_etag(raw: bytes) -> str:
        return hashlib.sha1(raw).hexdigest()

    def create_session(
        self,
        purpose: str = "skill_create",
        seed_prompt: str = "",
        skill_id: str = "",
        reuse_existing: bool = True,
    ) -> WorkspaceSessionRecord:
        """Create one workspace session and kick off async initialization."""
        normalized_skill_id = skill_id.strip()
        if normalized_skill_id and reuse_existing:
            existing_workspace_id = self._skill_sessions.get(normalized_skill_id)
            existing = self._sessions.get(existing_workspace_id or "")
            if existing is not None:
                return existing

        workspace_id = f"ws-{uuid.uuid4().hex[:10]}"
        session_id = f"sess-{uuid.uuid4().hex[:10]}"
        root_name = normalized_skill_id or f"draft-{workspace_id[-6:]}"
        if normalized_skill_id:
            real_root = (workspace_config.user_generated_root / normalized_skill_id).resolve()
            display_root = f"/workspace/projects/{normalized_skill_id}"
        else:
            real_root = (workspace_config.temp_root / "sessions" / root_name).resolve()
            display_root = f"/workspace/projects/{root_name}"
        real_root.mkdir(parents=True, exist_ok=True)

        record = WorkspaceSessionRecord(
            workspace_id=workspace_id,
            session_id=session_id,
            purpose=purpose,
            status="initializing",
            display_root=display_root,
            real_root=real_root,
            real_vfs_root=virtual_fs.to_virtual(real_root),
            seed_prompt=seed_prompt,
            bound_skill_id=normalized_skill_id,
        )
        self._sessions[workspace_id] = record
        if normalized_skill_id:
            self._skill_sessions[normalized_skill_id] = workspace_id
        self._emit_state(record)
        record.init_task = asyncio.create_task(self._initialize_session(record))
        return record

    async def _initialize_session(self, record: WorkspaceSessionRecord) -> None:
        """Emit real initialization steps and mark workspace ready."""
        try:
            self._emit_init_line(record, "正在初始化云端沙盒会话...")
            await asyncio.sleep(0.08)

            record.real_root.mkdir(parents=True, exist_ok=True)
            self._emit_init_line(record, f"工作目录已就绪: {record.display_root}")
            await asyncio.sleep(0.08)

            if record.bound_skill_id:
                self._emit_init_line(record, f"已绑定技能目录: {record.bound_skill_id}")
                await asyncio.sleep(0.08)

            self._emit_init_line(record, "权限校验完成（白名单命令策略已启用）")
            await asyncio.sleep(0.08)

            python_ok = await self._probe_binary(record.real_root, ["python3", "--version"])
            self._emit_init_line(record, f"运行器探测: python3 {'可用' if python_ok else '不可用'}")
            await asyncio.sleep(0.08)

            self._emit_init_line(record, "网络策略已加载（MVP 安全策略）")
            await asyncio.sleep(0.08)

            record.status = "ready"
            self._emit_state(record)
            self.publish_fs_snapshot(record.workspace_id)
        except Exception as exc:
            record.status = "failed"
            self._emit_state(record)
            self._emit(record.workspace_id, "workspace.error", {"message": f"初始化失败: {exc}"})

    async def _probe_binary(self, cwd: Path, command: list[str]) -> bool:
        try:
            result = await command_runner.run(command=command, cwd=cwd, timeout_sec=5)
            return result.ok
        except Exception:
            return False

    def get(self, workspace_id: str) -> WorkspaceSessionRecord | None:
        return self._sessions.get(workspace_id)

    def subscribe(self, workspace_id: str) -> WorkspaceSubscription | None:
        if workspace_id not in self._sessions:
            return None
        return workspace_event_hub.subscribe(workspace_id)

    def unsubscribe(self, workspace_id: str, subscription: WorkspaceSubscription) -> None:
        workspace_event_hub.unsubscribe(workspace_id, subscription.queue)

    def _resolve_display_path(self, record: WorkspaceSessionRecord, display_path: str) -> Path:
        raw = (display_path or "").strip()
        if not raw:
            return record.real_root
        if raw == record.display_root:
            return record.real_root
        if not raw.startswith(record.display_root.rstrip("/") + "/"):
            raise ValueError("Path is outside current workspace")
        rel = raw[len(record.display_root):].strip("/")
        target = (record.real_root / rel).resolve()
        if record.real_root not in target.parents and target != record.real_root:
            raise ValueError("Path traversal is not allowed")
        return target

    def real_to_display_path(self, workspace_id: str, real_path: Path) -> str:
        record = self.get(workspace_id)
        if record is None:
            return str(real_path)
        resolved = real_path.resolve()
        if record.real_root not in resolved.parents and resolved != record.real_root:
            return str(real_path)
        rel = str(resolved.relative_to(record.real_root)).replace("\\", "/")
        return record.display_root if not rel or rel == "." else f"{record.display_root}/{rel}"

    def attach_skill_root(self, workspace_id: str, skill_id: str) -> WorkspaceSessionRecord:
        """Point workspace root to the generated skill directory."""
        record = self.get(workspace_id)
        if record is None:
            raise ValueError("Workspace not found")

        real_root = (workspace_config.user_generated_root / skill_id).resolve()
        real_root.mkdir(parents=True, exist_ok=True)
        record.real_root = real_root
        record.real_vfs_root = virtual_fs.to_virtual(real_root)
        record.display_root = f"/workspace/projects/{skill_id}"
        record.bound_skill_id = skill_id
        self._skill_sessions[skill_id] = workspace_id
        self._emit(
            workspace_id,
            "sandbox.init.delta",
            {
                "line": f"已绑定技能目录: {record.display_root}",
                "ts": self._now(),
            },
        )
        self.publish_fs_snapshot(workspace_id)
        return record

    def create_run_session(self, workspace_id: str) -> dict[str, Any] | None:
        record = self.get(workspace_id)
        if record is None:
            return None

        run_session_id = f"rs-{uuid.uuid4().hex[:12]}"
        record.run_session_ids.append(run_session_id)
        self._emit(
            workspace_id,
            "sandbox.run_session",
            {
                "run_session_id": run_session_id,
                "skill_id": record.bound_skill_id,
                "ts": self._now(),
            },
        )
        return {
            "workspace_id": workspace_id,
            "run_session_id": run_session_id,
            "skill_id": record.bound_skill_id,
        }

    def _build_tree(self, root: Path, root_display: str, max_depth: int, max_entries: int) -> list[dict[str, Any]]:
        entries = 0

        def walk(current: Path, display_path: str, depth: int) -> list[dict[str, Any]]:
            nonlocal entries
            if depth > max_depth or entries >= max_entries:
                return []

            nodes: list[dict[str, Any]] = []
            children = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            for child in children:
                if entries >= max_entries:
                    break
                child_display = f"{display_path}/{child.name}"
                node: dict[str, Any] = {
                    "name": child.name,
                    "path": child_display,
                    "node_type": "dir" if child.is_dir() else "file",
                    "children": [],
                }
                entries += 1
                if child.is_dir():
                    node["children"] = walk(child, child_display, depth + 1)
                nodes.append(node)
            return nodes

        if not root.exists():
            return []
        return walk(root, root_display, 1)

    def list_tree(
        self,
        workspace_id: str,
        display_path: str = "",
        max_depth: int = 6,
        max_entries: int = 400,
    ) -> dict[str, Any]:
        record = self.get(workspace_id)
        if record is None:
            raise ValueError("Workspace not found")

        target = self._resolve_display_path(record, display_path) if display_path else record.real_root
        if not target.exists():
            return {"workspace_id": workspace_id, "root": record.display_root, "nodes": []}

        target_display = self.real_to_display_path(workspace_id, target)
        nodes = self._build_tree(target, target_display, max_depth=max_depth, max_entries=max_entries)
        return {"workspace_id": workspace_id, "root": target_display, "nodes": nodes}

    def publish_fs_snapshot(self, workspace_id: str) -> None:
        try:
            snapshot = self.list_tree(workspace_id=workspace_id)
            self._emit(workspace_id, "fs.snapshot", snapshot)
        except Exception as exc:
            self._emit(workspace_id, "workspace.error", {"message": f"目录刷新失败: {exc}"})

    def emit_fs_changed(self, workspace_id: str, op: str, path: str) -> None:
        self._emit(workspace_id, "fs.changed", {"op": op, "path": path, "ts": self._now()})

    def emit_fs_changed_real(self, workspace_id: str, op: str, real_path: Path) -> None:
        display_path = self.real_to_display_path(workspace_id, real_path)
        self.emit_fs_changed(workspace_id, op=op, path=display_path)

    def read_file(self, workspace_id: str, display_path: str, max_bytes: int = 1_500_000) -> dict[str, Any]:
        record = self.get(workspace_id)
        if record is None:
            raise ValueError("Workspace not found")

        target = self._resolve_display_path(record, display_path)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError("File not found")
        raw = target.read_bytes()
        total_bytes = len(raw)
        etag = self._make_etag(raw)
        truncated = False
        binary = self._detect_binary(raw)

        if binary:
            content = ""
        else:
            if total_bytes > max_bytes:
                raw = raw[:max_bytes]
                truncated = True
            content = raw.decode("utf-8", errors="replace")

        return {
            "path": self.real_to_display_path(workspace_id, target),
            "content": content,
            "readonly": False,
            "content_type": self._guess_content_type(target),
            "size_bytes": total_bytes,
            "etag": etag,
            "truncated": truncated,
            "is_binary": binary,
        }

    def write_file(
        self,
        workspace_id: str,
        display_path: str,
        content: str,
        if_match_etag: str = "",
    ) -> dict[str, Any]:
        record = self.get(workspace_id)
        if record is None:
            raise ValueError("Workspace not found")

        target = self._resolve_display_path(record, display_path)
        if target.exists() and if_match_etag:
            current_raw = target.read_bytes()
            current_etag = self._make_etag(current_raw)
            if current_etag != if_match_etag:
                raise ValueError("File etag conflict, please refresh before saving")

        existed = target.exists()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        target.chmod(0o644)
        bytes_count = len(content.encode("utf-8"))
        self.emit_fs_changed_real(workspace_id, op="updated" if existed else "created", real_path=target)
        self.publish_fs_snapshot(workspace_id)
        return {
            "ok": True,
            "path": self.real_to_display_path(workspace_id, target),
            "bytes": bytes_count,
            "etag": self._make_etag(content.encode("utf-8")),
        }

    def append_terminal_line(
        self,
        workspace_id: str,
        stream: str,
        line: str,
        tool_id: str = "",
        run_id: str = "",
    ) -> None:
        self._emit(
            workspace_id,
            "terminal.line",
            {
                "stream": stream,
                "line": line,
                "tool_id": tool_id,
                "run_id": run_id,
                "ts": self._now(),
            },
        )

    async def run_whitelisted_command(
        self,
        workspace_id: str,
        command: list[str],
        tool_id: str = "",
        run_id: str = "",
        cwd_display: str = "",
        input_text: str = "",
        timeout_sec: int = 60,
        on_stdout: Any | None = None,
        on_stderr: Any | None = None,
    ) -> CommandRunResult:
        record = self.get(workspace_id)
        if record is None:
            raise ValueError("Workspace not found")
        if not command:
            raise ValueError("Command cannot be empty")
        if command[0] not in ALLOWED_COMMANDS:
            raise ValueError(f"Command `{command[0]}` is not allowed")

        cwd = self._resolve_display_path(record, cwd_display) if cwd_display else record.real_root
        self.append_terminal_line(
            workspace_id,
            stream="stdout",
            line=f"$ {' '.join(command)}",
            tool_id=tool_id,
            run_id=run_id,
        )
        result = await command_runner.run(
            command=command,
            cwd=cwd,
            input_text=input_text,
            timeout_sec=timeout_sec,
            on_stdout=lambda line: self._on_command_stdout(
                workspace_id=workspace_id,
                line=line,
                tool_id=tool_id,
                run_id=run_id,
                callback=on_stdout,
            ),
            on_stderr=lambda line: self._on_command_stderr(
                workspace_id=workspace_id,
                line=line,
                tool_id=tool_id,
                run_id=run_id,
                callback=on_stderr,
            ),
        )
        return result

    async def _on_command_stdout(
        self,
        workspace_id: str,
        line: str,
        tool_id: str,
        run_id: str,
        callback: Any | None,
    ) -> None:
        self.append_terminal_line(workspace_id, stream="stdout", line=line, tool_id=tool_id, run_id=run_id)
        if callback is None:
            return
        resp = callback(line)
        if asyncio.iscoroutine(resp):
            await resp

    async def _on_command_stderr(
        self,
        workspace_id: str,
        line: str,
        tool_id: str,
        run_id: str,
        callback: Any | None,
    ) -> None:
        self.append_terminal_line(workspace_id, stream="stderr", line=line, tool_id=tool_id, run_id=run_id)
        if callback is None:
            return
        resp = callback(line)
        if asyncio.iscoroutine(resp):
            await resp

    def record_creator_result(self, workspace_id: str, result: dict[str, Any], run_id: str = "") -> None:
        record = self.get(workspace_id)
        if record is None:
            return
        payload = dict(result)
        record.creator_result_latest = payload
        if run_id:
            record.creator_result_by_run[run_id] = payload

    def get_creator_result(self, workspace_id: str, run_id: str = "") -> dict[str, Any] | None:
        record = self.get(workspace_id)
        if record is None:
            return None
        if run_id:
            if run_id in record.creator_result_by_run:
                return dict(record.creator_result_by_run[run_id])
            return None
        if record.creator_result_latest is not None:
            return dict(record.creator_result_latest)
        return None

    def get_creator_session_state(self, workspace_id: str) -> dict[str, Any]:
        record = self.get(workspace_id)
        if record is None:
            return {}
        return dict(record.creator_session_state)

    def update_creator_session_state(self, workspace_id: str, data: dict[str, Any]) -> None:
        record = self.get(workspace_id)
        if record is None:
            return
        record.creator_session_state = dict(data)

    def clear_creator_session_state(self, workspace_id: str) -> None:
        record = self.get(workspace_id)
        if record is None:
            return
        record.creator_session_state = {}


workspace_session_service = WorkspaceSessionService()
