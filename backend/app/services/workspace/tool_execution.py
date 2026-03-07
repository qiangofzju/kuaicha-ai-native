"""Unified real tool execution in workspace sandbox."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.services.workspace.workspace_session import workspace_session_service


@dataclass
class ToolExecutionResult:
    """Structured execution payload for builder/runtime traces."""

    tool_call_id: str
    tool: str
    workspace_id: str
    sandbox_id: str
    cmd: str
    started_at_ms: int
    finished_at_ms: int
    duration_ms: int
    status: str
    exit_code: int
    stdout_lines: list[str] = field(default_factory=list)
    stderr_lines: list[str] = field(default_factory=list)
    artifacts: list[dict[str, str]] = field(default_factory=list)


class ToolExecutionService:
    """Execute whitelisted tools and emit verifiable metadata."""

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)

    @staticmethod
    def _new_tool_call_id(prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:10]}"

    async def run_bash(
        self,
        *,
        workspace_id: str,
        run_id: str,
        command: list[str],
        cwd_display: str,
        input_text: str = "",
        timeout_sec: int = 60,
        on_stdout: Any | None = None,
        on_stderr: Any | None = None,
        tool_call_id: str = "",
    ) -> ToolExecutionResult:
        call_id = tool_call_id or self._new_tool_call_id("bash")
        started = self._now_ms()
        result = await workspace_session_service.run_whitelisted_command(
            workspace_id=workspace_id,
            command=command,
            tool_id=call_id,
            run_id=run_id,
            cwd_display=cwd_display,
            input_text=input_text,
            timeout_sec=timeout_sec,
            on_stdout=on_stdout,
            on_stderr=on_stderr,
        )
        finished = self._now_ms()
        return ToolExecutionResult(
            tool_call_id=call_id,
            tool=command[0] if command else "bash",
            workspace_id=workspace_id,
            sandbox_id=workspace_id,
            cmd=" ".join(command),
            started_at_ms=started,
            finished_at_ms=finished,
            duration_ms=max(0, finished - started),
            status="success" if result.ok else "failed",
            exit_code=result.exit_code,
            stdout_lines=list(result.stdout_lines),
            stderr_lines=list(result.stderr_lines),
        )

    def write_text_file(
        self,
        *,
        workspace_id: str,
        display_path: str,
        content: str,
        tool_call_id: str = "",
    ) -> ToolExecutionResult:
        call_id = tool_call_id or self._new_tool_call_id("write")
        started = self._now_ms()
        resp = workspace_session_service.write_file(
            workspace_id=workspace_id,
            display_path=display_path,
            content=content,
        )
        finished = self._now_ms()
        artifact = {"op": "updated", "path": str(resp.get("path", display_path))}
        return ToolExecutionResult(
            tool_call_id=call_id,
            tool="write_text_file",
            workspace_id=workspace_id,
            sandbox_id=workspace_id,
            cmd=f"write {display_path}",
            started_at_ms=started,
            finished_at_ms=finished,
            duration_ms=max(0, finished - started),
            status="success" if bool(resp.get("ok")) else "failed",
            exit_code=0 if bool(resp.get("ok")) else 1,
            stdout_lines=[f"file written: {resp.get('path', display_path)}", f"bytes: {resp.get('bytes', 0)}"],
            stderr_lines=[],
            artifacts=[artifact],
        )


tool_execution_service = ToolExecutionService()
