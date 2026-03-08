"""Generic runtime agent for user-generated skills."""

from __future__ import annotations

import asyncio
import json
import shlex
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.services.workspace.command_runner import command_runner
from app.services.workspace.tool_execution import tool_execution_service
from app.services.workspace.workspace_session import workspace_session_service
from app.skills_core.manifest_loader import manifest_registry


class GeneratedSkillRuntimeAgent(BaseAgent):
    """Executes user-generated skills with a sandbox command chain."""

    agent_id = "generated-skill-runtime"
    name = "通用技能运行器"
    description = "运行用户创建的轻量技能并返回结构化结果"
    color = "#22C55E"
    tags = ["技能", "运行时", "轻量执行"]
    icon = "Sparkle"
    status = "ready"

    def get_config_schema(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "fields": [
                {
                    "name": "query",
                    "label": "输入内容",
                    "type": "text",
                    "required": True,
                    "placeholder": "请输入技能调用内容",
                    "default": "",
                }
            ],
        }

    async def _trace(
        self,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
        stage: str,
        stage_index: int,
        kind: str,
        title: str,
        detail: str,
        status: str = "running",
        progress: float = 0.0,
        metrics: dict[str, Any] | None = None,
    ) -> None:
        if on_progress is None:
            return

        trace_state["seq"] = int(trace_state.get("seq", 0)) + 1
        event = {
            "event_id": f"{trace_state['token']}-{trace_state['seq']:04d}",
            "ts": datetime.now(timezone.utc).isoformat(),
            "stage": stage,
            "stage_index": stage_index,
            "kind": kind,
            "title": title,
            "detail": detail,
            "metrics": metrics or {},
            "status": status,
        }
        await on_progress(
            AgentProgress(
                stage=stage,
                progress=progress,
                message=title,
                data={"type": "trace", "event": event},
            )
        )

    async def _progress(
        self,
        on_progress: Optional[Any],
        stage: str,
        progress: float,
        message: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        if on_progress is None:
            return
        await on_progress(
            AgentProgress(
                stage=stage,
                progress=progress,
                message=message,
                data=extra,
            )
        )

    async def _stream_text(
        self,
        on_progress: Optional[Any],
        content: str,
        *,
        stage: str = "执行中",
        message: str = "正在生成输出",
    ) -> None:
        if on_progress is None or not content:
            return
        await on_progress(
            AgentProgress(
                stage=stage,
                progress=0.0,
                message=message,
                data={"type": "stream", "content": content},
            )
        )

    async def _run_command(
        self,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
        stage: str,
        stage_index: int,
        tool_id: str,
        command: list[str],
        cwd: Path,
        input_text: str,
        progress: float,
        workspace_id: str,
        run_id: str,
        cwd_display: str,
        timeout_sec: int,
    ):
        cmd_text = " ".join(command)
        tool_call_id = f"{tool_id}-{uuid.uuid4().hex[:8]}"
        started_ms = int(time.time() * 1000)
        await self._trace(
            on_progress,
            trace_state,
            stage=stage,
            stage_index=stage_index,
            kind="tool_start",
            title=f"调用工具 {command[0]}",
            detail=cmd_text,
            progress=progress,
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "workspace_id": workspace_id or "",
                "sandbox_id": workspace_id or "",
                "cmd": cmd_text,
                "started_at_ms": started_ms,
            },
        )

        if workspace_id:
            async def _on_stdout(line: str) -> None:
                await self._stream_text(
                    on_progress,
                    f"{line}\n",
                    stage=stage,
                    message=f"{command[0]} 输出中",
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage=stage,
                    stage_index=stage_index,
                    kind="tool_stdout",
                    title=f"{command[0]} stdout",
                    detail=line,
                    progress=min(0.95, progress + 0.02),
                    metrics={
                        "tool_id": tool_id,
                        "tool_call_id": tool_call_id,
                        "workspace_id": workspace_id,
                        "sandbox_id": workspace_id,
                    },
                )

            async def _on_stderr(line: str) -> None:
                await self._stream_text(
                    on_progress,
                    f"[stderr] {line}\n",
                    stage=stage,
                    message=f"{command[0]} 输出中",
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage=stage,
                    stage_index=stage_index,
                    kind="tool_stderr",
                    title=f"{command[0]} stderr",
                    detail=line,
                    status="warning",
                    progress=min(0.95, progress + 0.02),
                    metrics={
                        "tool_id": tool_id,
                        "tool_call_id": tool_call_id,
                        "workspace_id": workspace_id,
                        "sandbox_id": workspace_id,
                    },
                )

            tool_result = await tool_execution_service.run_bash(
                workspace_id=workspace_id,
                run_id=run_id,
                command=command,
                cwd_display=cwd_display,
                input_text=input_text,
                timeout_sec=timeout_sec,
                on_stdout=_on_stdout,
                on_stderr=_on_stderr,
                tool_call_id=tool_call_id,
            )
            stdout_lines = tool_result.stdout_lines
            stderr_lines = tool_result.stderr_lines
            exit_code = tool_result.exit_code
            duration_ms = tool_result.duration_ms
        else:
            result = await command_runner.run(
                command=command,
                cwd=cwd,
                input_text=input_text,
                timeout_sec=timeout_sec,
            )
            stdout_lines = result.stdout_lines
            stderr_lines = result.stderr_lines
            exit_code = result.exit_code
            duration_ms = result.duration_ms

            for line in stdout_lines:
                await self._stream_text(
                    on_progress,
                    f"{line}\n",
                    stage=stage,
                    message=f"{command[0]} 输出中",
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage=stage,
                    stage_index=stage_index,
                    kind="tool_stdout",
                    title=f"{command[0]} stdout",
                    detail=line,
                    progress=min(0.95, progress + 0.02),
                    metrics={"tool_id": tool_id, "tool_call_id": tool_call_id},
                )
            for line in stderr_lines:
                await self._stream_text(
                    on_progress,
                    f"[stderr] {line}\n",
                    stage=stage,
                    message=f"{command[0]} 输出中",
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage=stage,
                    stage_index=stage_index,
                    kind="tool_stderr",
                    title=f"{command[0]} stderr",
                    detail=line,
                    status="warning",
                    progress=min(0.95, progress + 0.02),
                    metrics={"tool_id": tool_id, "tool_call_id": tool_call_id},
                )

        await self._trace(
            on_progress,
            trace_state,
            stage=stage,
            stage_index=stage_index,
            kind="tool_end",
            title=f"工具结束 {command[0]}",
            detail=f"exit_code={exit_code}",
            status="done" if exit_code == 0 else "error",
            progress=min(0.97, progress + 0.03),
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "workspace_id": workspace_id or "",
                "sandbox_id": workspace_id or "",
                "cmd": cmd_text,
                "exit_code": exit_code,
                "duration_ms": duration_ms,
                "started_at_ms": started_ms,
                "finished_at_ms": int(time.time() * 1000),
                "artifacts": [],
            },
        )

        if exit_code != 0:
            raise RuntimeError(f"Command failed: {cmd_text} (exit={exit_code})")

    def _resolve_entrypoint(self, manifest: Any, skill_root: Path) -> list[str] | None:
        raw_entrypoint = str(getattr(manifest, "entrypoint", "") or "").strip()
        if raw_entrypoint:
            return shlex.split(raw_entrypoint)
        if (skill_root / "scripts" / "run.py").exists():
            return ["python3", "scripts/run.py"]
        return None

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        start = time.time()
        params = agent_input.params or {}
        context = params.get("_skill_context", {}) if isinstance(params, dict) else {}
        context = context if isinstance(context, dict) else {}

        skill_id = str(params.get("_skill_id") or context.get("skill_id") or "")
        workspace_id = str(context.get("workspace_id") or "").strip()
        run_id = str(context.get("run_id") or "").strip()

        manifest = manifest_registry.get_manifest(skill_id) if skill_id else None
        manifest_path = manifest_registry.get_manifest_path(skill_id) if skill_id else None
        skill_name = manifest.display_name if manifest else (skill_id or "自定义技能")

        query = agent_input.target or str(params.get("query", "")).strip()
        if not query:
            query = "请根据输入给出结构化建议"

        if manifest_path is None:
            raise RuntimeError("技能定义不存在，无法执行")

        skill_root = manifest_path.parent
        display_root = ""
        if workspace_id:
            record = workspace_session_service.attach_skill_root(workspace_id, skill_id)
            display_root = record.display_root

        trace_state = {"token": uuid.uuid4().hex[:10], "seq": 0}
        payload_text = json.dumps({"query": query, "input": {"text": query}}, ensure_ascii=False)
        has_validate_script = (skill_root / "scripts" / "validate_input.py").exists()
        has_format_script = (skill_root / "scripts" / "format_output.py").exists()
        entrypoint_command = self._resolve_entrypoint(manifest, skill_root)
        command_timeout_sec = max(30, int(context.get("timeout_sec") or 240))

        await self._progress(on_progress, "需求解析", 0.12, "正在读取技能定义")
        await self._stream_text(
            on_progress,
            f"已进入技能 {skill_name} 的沙盒工作区，准备处理你的请求。\n",
            stage="需求解析",
            message="已连接技能沙盒",
        )
        await self._trace(
            on_progress,
            trace_state,
            stage="需求解析",
            stage_index=0,
            kind="thinking",
            title="解析技能输入",
            detail=f"已加载技能 {skill_name} 的运行配置，准备执行沙盒脚本链。",
            progress=0.16,
        )

        if has_validate_script:
            await self._run_command(
                on_progress,
                trace_state,
                stage="需求解析",
                stage_index=0,
                tool_id="validate-1",
                command=["python3", "scripts/validate_input.py"],
                cwd=skill_root,
                input_text=payload_text,
                progress=0.22,
                workspace_id=workspace_id,
                run_id=run_id,
                cwd_display=display_root,
                timeout_sec=min(command_timeout_sec, 45),
            )

        await self._progress(on_progress, "规则执行", 0.45, "正在基于技能规则生成结果")
        await self._stream_text(
            on_progress,
            "开始执行技能入口命令，结果会持续流式返回。\n",
            stage="规则执行",
            message="技能执行中",
        )
        await self._trace(
            on_progress,
            trace_state,
            stage="规则执行",
            stage_index=1,
            kind="thinking",
            title="执行技能规则",
            detail="运行技能 entrypoint 生成结构化结果并写入 outputs/latest.json。",
            progress=0.52,
        )

        if entrypoint_command:
            await self._run_command(
                on_progress,
                trace_state,
                stage="规则执行",
                stage_index=1,
                tool_id="run-1",
                command=entrypoint_command,
                cwd=skill_root,
                input_text=payload_text,
                progress=0.60,
                workspace_id=workspace_id,
                run_id=run_id,
                cwd_display=display_root,
                timeout_sec=command_timeout_sec,
            )

            if workspace_id:
                workspace_session_service.emit_fs_changed_real(
                    workspace_id=workspace_id,
                    op="created",
                    real_path=(skill_root / "outputs" / "latest.json"),
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="规则执行",
                    stage_index=1,
                    kind="fs_change",
                    title="输出文件变更",
                    detail=f"{display_root}/outputs/latest.json" if display_root else "outputs/latest.json",
                    status="done",
                    progress=0.68,
                    metrics={
                        "workspace_id": workspace_id,
                        "sandbox_id": workspace_id,
                        "artifacts": [{"op": "created", "path": f"{display_root}/outputs/latest.json" if display_root else "outputs/latest.json"}],
                    },
                )
                workspace_session_service.publish_fs_snapshot(workspace_id)
        else:
            await self._stream_text(
                on_progress,
                "未发现技能入口定义，已跳过脚本执行并进入兼容摘要模式。\n",
                stage="规则执行",
                message="未发现技能入口",
            )

        if has_format_script:
            await self._run_command(
                on_progress,
                trace_state,
                stage="规则执行",
                stage_index=1,
                tool_id="format-1",
                command=["python3", "scripts/format_output.py"],
                cwd=skill_root,
                input_text="",
                progress=0.72,
                workspace_id=workspace_id,
                run_id=run_id,
                cwd_display=display_root,
                timeout_sec=min(command_timeout_sec, 45),
            )

        await self._progress(on_progress, "结果整理", 0.86, "正在整理交付内容")

        output_path = skill_root / "outputs" / "latest.json"
        if output_path.exists():
            payload = json.loads(output_path.read_text(encoding="utf-8"))
            preview_rows = payload.get("preview_rows", []) if isinstance(payload, dict) else []
            columns = payload.get("columns", []) if isinstance(payload, dict) else []
            total_count = int(payload.get("total_count", len(preview_rows))) if isinstance(payload, dict) else len(preview_rows)
        else:
            preview_rows = [
                {"step": "输入理解", "output": query, "note": "未检测到可执行 entrypoint，已使用回退运行器"},
                {"step": "交付建议", "output": "请重新创建技能以获得完整脚本链", "note": "当前结果来自兼容模式"},
            ]
            columns = [
                {"key": "step", "label": "步骤", "type": "text"},
                {"key": "output", "label": "输出", "type": "text"},
                {"key": "note", "label": "说明", "type": "text"},
            ]
            total_count = len(preview_rows)
            payload = {
                "summary": f"{skill_name} 已完成兼容执行，共输出 {total_count} 条结构化结果。",
                "preview_rows": preview_rows,
                "columns": columns,
                "total_count": total_count,
            }

        await self._trace(
            on_progress,
            trace_state,
            stage="结果整理",
            stage_index=2,
            kind="delivery",
            title="生成交付摘要",
            detail="已生成执行摘要、预览数据与下一步建议。",
            status="done",
            progress=0.94,
        )
        await self._progress(on_progress, "完成", 1.0, "执行完成")

        duration = round(time.time() - start, 3)
        summary_raw = str(payload.get("summary") or "")
        if summary_raw:
            summary = summary_raw if "轻量执行" in summary_raw else f"{skill_name} 已完成轻量执行，{summary_raw}"
        else:
            summary = f"{skill_name} 已完成轻量执行，共输出 {total_count} 条结构化结果。"
        await self._stream_text(
            on_progress,
            f"{summary}\n",
            stage="结果整理",
            message="正在回传执行总结",
        )

        return AgentResult(
            summary=summary,
            report={
                "query_type": "generated",
                "generated_sql": "",
                "sql_description": "",
                "result_mode": "inline_delivery",
                "columns": columns,
                "preview_rows": preview_rows,
                "total_count": total_count,
                "stats": {
                    "executed_rules": 1,
                    "matched_items": total_count,
                },
                "data_quality": {
                    "total_requested": total_count,
                    "matched": total_count,
                    "missing_fields_filled": 0,
                },
                "skill_id": skill_id,
                "skill_name": skill_name,
                "delivery_notes": f"技能 {skill_name} 已完成执行。你可以继续通过 @{skill_id or '技能ID'} 提交更具体的需求。",
            },
            metadata={
                "duration": duration,
                "skill_id": skill_id,
                "skill_name": skill_name,
                "workspace_id": workspace_id,
                "run_id": run_id,
            },
        )
