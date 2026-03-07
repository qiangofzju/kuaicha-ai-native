"""Skill creator workflow: requirement -> tool execution -> delivery."""

from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.driver import get_driver
from app.config import settings
from app.services.skill_creator_workspace import skill_creator_workspace
from app.services.workspace.command_runner import CommandRunResult
from app.services.workspace.tool_execution import tool_execution_service
from app.services.workspace.virtual_fs import virtual_fs
from app.services.workspace.workspace_session import workspace_session_service
from app.skills_core.chat_invoke import skill_mention_parser
from app.skills_core.manifest_loader import manifest_registry


def _slugify(text: str) -> str:
    lowered = (text or "").strip().lower()
    lowered = re.sub(r"[^a-z0-9\u4e00-\u9fff\s_-]", " ", lowered)
    lowered = re.sub(r"\s+", "-", lowered)
    lowered = re.sub(r"-+", "-", lowered).strip("-")
    ascii_like = re.sub(r"[^a-z0-9-]", "", lowered)
    if ascii_like:
        return ascii_like[:42]
    return f"skill-{uuid.uuid4().hex[:6]}"


def _infer_skill_name(requirement: str) -> str:
    query = (requirement or "").strip()
    if not query:
        return "自定义技能"

    direct = re.search(r"创建(?:一个|一项)?(.{2,24}?技能)", query)
    if direct:
        return direct.group(1).strip(" ，。,.:")

    short = query[:18].strip(" ，。,.:")
    if not short.endswith("技能"):
        short += "技能"
    return short


def _infer_category(requirement: str) -> str:
    text = requirement.lower()
    if any(token in text for token in ["风控", "风险", "尽调"]):
        return "risk"
    if any(token in text for token in ["sql", "数据", "查询", "导出"]):
        return "data"
    if any(token in text for token in ["图谱", "关系", "趋势", "洞察"]):
        return "insight"
    return "general"


def _build_skill_md(
    skill_name: str,
    skill_id: str,
    category: str,
    requirement: str,
    llm_note: str,
) -> str:
    draft_line = llm_note.strip() if llm_note.strip() else "本技能由 Skill Creator 自动生成初版结构。"
    return f"""# {skill_name}

## Goal

为业务提供一个可复用的技能入口，支持在聊天中通过 `@{skill_id}` 触发，并在技能广场中直接执行。

## Requirement

{requirement}

## Category

- `{category}`

## Inputs

- `query` (required): 用户输入的技能调用需求
- `context` (optional): 扩展上下文

## Outputs

- `summary`: 执行摘要
- `preview_rows`: 结构化预览数据
- `total_count`: 结果条数

## Runtime

- execution mode: `agent_workflow`
- mapped agent: `generated-skill-runtime`
- command chain:
  1. `python3 scripts/validate_input.py`
  2. `python3 scripts/run.py`
  3. `python3 scripts/format_output.py`

## Artifact

- 输出目录: `outputs/latest.json`
- 运行日志: 由工作台终端实时展示

## Notes

{draft_line}
"""


def _build_reference_md(skill_name: str, skill_id: str) -> str:
    return f"""# {skill_name} 使用说明

## 快速调用

- 聊天中输入：`@{skill_id} 你的需求`
- 技能广场中打开后填写参数并运行

## 推荐输入格式

1. 明确目标对象
2. 描述输出字段
3. 指定筛选条件或期望格式

## 输出说明

运行结果会写入 `outputs/latest.json`，并在工作台中同步展示。
"""


def _build_validate_script() -> str:
    return """#!/usr/bin/env python3
\"\"\"Validate input payload for generated skill.\"\"\"

import json
import sys


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print("invalid-json")
        return 1

    query = str(payload.get("query", "")).strip()
    if not query:
        print("missing-query")
        return 2

    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
"""


def _build_run_script() -> str:
    return """#!/usr/bin/env python3
\"\"\"Execute generated skill and materialize outputs/latest.json.\"\"\"

from __future__ import annotations

import json
from pathlib import Path
import sys


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print("invalid-json", file=sys.stderr)
        return 1

    query = str(payload.get("query", "")).strip()
    if not query:
        print("missing-query", file=sys.stderr)
        return 2

    rows = [
        {
            "step": "输入理解",
            "output": query,
            "note": "已识别本次技能请求内容",
        },
        {
            "step": "规则执行",
            "output": "完成参数校验与逻辑生成",
            "note": "可继续追加限制条件与目标字段",
        },
        {
            "step": "交付建议",
            "output": "建议继续细化输入以提升结果精度",
            "note": "支持通过 @skill-id 反复调用",
        },
    ]

    result = {
        "summary": f"技能已完成执行，共输出 {len(rows)} 条结构化结果。",
        "columns": [
            {"key": "step", "label": "步骤", "type": "text"},
            {"key": "output", "label": "输出", "type": "text"},
            {"key": "note", "label": "说明", "type": "text"},
        ],
        "preview_rows": rows,
        "total_count": len(rows),
        "result_mode": "inline_delivery",
    }

    out_dir = Path("outputs")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "latest.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"output-written={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
"""


def _build_format_script() -> str:
    return """#!/usr/bin/env python3
\"\"\"Format generated runtime result rows.\"\"\"

from __future__ import annotations

import json
from pathlib import Path
import sys


def to_table(rows: list[dict]) -> str:
    if not rows:
        return "(empty)"

    keys = list(rows[0].keys())
    header = " | ".join(keys)
    sep = " | ".join(["---"] * len(keys))
    body = [" | ".join(str(row.get(k, "")) for k in keys) for row in rows]
    return "\\n".join([header, sep, *body])


def main() -> int:
    target = Path("outputs/latest.json")
    if not target.exists():
        print("latest.json not found", file=sys.stderr)
        return 1

    payload = json.loads(target.read_text(encoding="utf-8"))
    rows = payload.get("preview_rows", [])
    print(to_table(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
"""


class SkillCreatorAgent(BaseAgent):
    """Create one MVP-ready skill package through controlled file tools."""

    agent_id = "skill-creator"
    name = "技能创建器"
    description = "根据自然语言需求创建可运行技能模板"
    color = "#F59E0B"
    tags = ["技能", "创建", "自动化"]
    icon = "Sparkle"
    status = "ready"

    def get_config_schema(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "fields": [
                {
                    "name": "query",
                    "label": "技能开发需求",
                    "type": "text",
                    "required": True,
                    "placeholder": "描述要创建的技能能力、输入输出和流程",
                    "default": "",
                }
            ],
        }

    async def _progress(self, on_progress: Optional[Any], stage: str, progress: float, message: str) -> None:
        if on_progress is None:
            return
        await on_progress(AgentProgress(stage=stage, progress=progress, message=message))

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

    async def _build_llm_note(self, requirement: str, enable_cli_draft: bool) -> str:
        if settings.AGENT_DRIVER.lower() != "cli" or not enable_cli_draft:
            return ""

        prompt = (
            "请为下面的技能创建需求给出 5 行以内的实现建议（中文，纯文本）：\n\n"
            f"{requirement}"
        )
        system = "你是资深技能工程师，请输出精炼建议，不要包含代码块。"

        try:
            driver = get_driver()
            timeout_sec = max(3, min(int(settings.CLI_TIMEOUT), 15))
            resp = await asyncio.wait_for(
                driver.call(prompt=prompt, system=system),
                timeout=timeout_sec,
            )
            content = (resp.content or "").strip()
            if not content or content.startswith("[Error]") or content.startswith("[CLI Error]"):
                return ""
            return content[:600]
        except Exception:
            return ""

    def _ensure_unique_skill_id(self, base_skill_id: str) -> str:
        candidate = base_skill_id
        index = 2
        while True:
            if manifest_registry.get_manifest(candidate) is None:
                path = skill_creator_workspace.user_generated_root / candidate
                if not path.exists():
                    return candidate
            candidate = f"{base_skill_id}-{index}"
            index += 1

    async def _run_workspace_command(
        self,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
        workspace_id: str,
        run_id: str,
        stage: str,
        stage_index: int,
        tool_id: str,
        command: list[str],
        cwd_display: str,
        progress: float,
        input_text: str = "",
    ) -> CommandRunResult:
        command_text = " ".join(command)
        tool_call_id = f"{tool_id}-{uuid.uuid4().hex[:8]}"
        started_ms = int(time.time() * 1000)
        await self._trace(
            on_progress,
            trace_state,
            stage=stage,
            stage_index=stage_index,
            kind="tool_start",
            title=f"调用工具 {command[0]}",
            detail=command_text,
            progress=progress,
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "workspace_id": workspace_id,
                "sandbox_id": workspace_id,
                "cmd": command_text,
                "started_at_ms": started_ms,
            },
        )

        async def _on_stdout(line: str) -> None:
            await self._trace(
                on_progress,
                trace_state,
                stage=stage,
                stage_index=stage_index,
                kind="tool_stdout",
                title=f"{command[0]} stdout",
                detail=line,
                progress=min(0.92, progress + 0.01),
                metrics={
                    "tool_id": tool_id,
                    "tool_call_id": tool_call_id,
                    "workspace_id": workspace_id,
                    "sandbox_id": workspace_id,
                },
            )

        async def _on_stderr(line: str) -> None:
            await self._trace(
                on_progress,
                trace_state,
                stage=stage,
                stage_index=stage_index,
                kind="tool_stderr",
                title=f"{command[0]} stderr",
                detail=line,
                status="warning",
                progress=min(0.92, progress + 0.01),
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
            timeout_sec=60,
            on_stdout=_on_stdout,
            on_stderr=_on_stderr,
            tool_call_id=tool_call_id,
        )
        result = CommandRunResult(
            command=command,
            exit_code=tool_result.exit_code,
            stdout_lines=tool_result.stdout_lines,
            stderr_lines=tool_result.stderr_lines,
            duration_ms=tool_result.duration_ms,
            timed_out=False,
        )

        await self._trace(
            on_progress,
            trace_state,
            stage=stage,
            stage_index=stage_index,
            kind="tool_end",
            title=f"工具结束 {command[0]}",
            detail=f"exit_code={result.exit_code}",
            status="done" if result.ok else "error",
            progress=min(0.94, progress + 0.02),
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "workspace_id": workspace_id,
                "sandbox_id": workspace_id,
                "cmd": command_text,
                "started_at_ms": started_ms,
                "finished_at_ms": int(time.time() * 1000),
                "artifacts": [],
            },
        )
        return result

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        started = time.time()
        requirement = (agent_input.target or str(agent_input.params.get("query", ""))).strip()
        if not requirement:
            requirement = "创建一个通用数据查询技能，支持输入需求并返回结构化建议"

        raw_context = agent_input.params.get("_skill_context", {})
        context = raw_context if isinstance(raw_context, dict) else {}
        source = str(context.get("source", ""))
        workspace_id = str(context.get("workspace_id", "")).strip()
        run_id = str(context.get("run_id", "")).strip()
        enable_cli_draft = source in {"standalone", "skill_creator_ui", "chat"}

        trace_state = {"token": uuid.uuid4().hex[:10], "seq": 0}

        await self._progress(on_progress, "需求分析", 0.06, "正在分析技能需求")
        await self._trace(
            on_progress,
            trace_state,
            stage="需求分析",
            stage_index=0,
            kind="thinking",
            title="解析用户需求",
            detail="提取技能名称、触发词、输入输出契约与目录结构。",
            progress=0.08,
        )

        skill_name = _infer_skill_name(requirement)
        base_skill_id = _slugify(skill_name)
        skill_id = self._ensure_unique_skill_id(base_skill_id)
        category = _infer_category(requirement)
        llm_note = await self._build_llm_note(requirement, enable_cli_draft=enable_cli_draft)

        await self._trace(
            on_progress,
            trace_state,
            stage="需求分析",
            stage_index=0,
            kind="plan",
            title="创建计划",
            detail=(
                "1) 初始化技能目录与运行脚本\n"
                "2) 生成 manifest 与文档\n"
                "3) 刷新技能注册并输出交付"
            ),
            status="done",
            progress=0.16,
        )
        await self._trace(
            on_progress,
            trace_state,
            stage="需求分析",
            stage_index=0,
            kind="thinking",
            title="需求分析完成",
            detail=f"技能名: {skill_name}，skill_id: {skill_id}，分类: {category}",
            status="done",
            progress=0.22,
        )
        await self._progress(on_progress, "需求分析", 0.25, "需求分析完成")

        root_rel = skill_id
        root_real = (skill_creator_workspace.user_generated_root / root_rel).resolve()
        root_real.mkdir(parents=True, exist_ok=True)
        root_virtual = virtual_fs.to_virtual(root_real)
        artifact_root = root_virtual
        display_root = ""

        if workspace_id:
            try:
                record = workspace_session_service.attach_skill_root(workspace_id, skill_id)
                display_root = record.display_root
                artifact_root = display_root
            except Exception:
                display_root = ""

        await self._progress(on_progress, "工具执行", 0.34, "开始创建技能目录与文件")

        if workspace_id and display_root:
            await self._run_workspace_command(
                on_progress,
                trace_state,
                workspace_id=workspace_id,
                run_id=run_id,
                stage="工具执行",
                stage_index=1,
                tool_id="mkdir-1",
                command=["bash", "-lc", "mkdir -p scripts references outputs"],
                cwd_display=display_root,
                progress=0.36,
            )
        else:
            skill_creator_workspace.mkdir_p(f"{root_rel}/scripts")
            skill_creator_workspace.mkdir_p(f"{root_rel}/references")
            skill_creator_workspace.mkdir_p(f"{root_rel}/outputs")
            await self._trace(
                on_progress,
                trace_state,
                stage="工具执行",
                stage_index=1,
                kind="tool_end",
                title="工具结束 mkdir_p",
                detail=f"已创建目录 {root_rel}/scripts references outputs",
                status="done",
                progress=0.38,
            )

        manifest = {
            "id": skill_id,
            "version": "1.0.0",
            "name": skill_name.replace("技能", "") or skill_name,
            "display_name": skill_name,
            "description": requirement[:140],
            "category": category,
            "status": "ready",
            "author": "@SkillCreator",
            "tags": ["用户创建", category, "MVP"],
            "entrypoints": {
                "standalone": True,
                "chat_invoke": True,
                "external_api": True,
            },
            "triggers": {
                "mention_ids": [skill_id],
                "mention_aliases": [skill_name],
            },
            "execution": {
                "mode": "agent_workflow",
                "agent_id": "generated-skill-runtime",
                "driver": "generated-runtime",
            },
            "entrypoint": "python3 scripts/run.py",
            "input_schema": {
                "type": "object",
                "required": ["query"],
                "properties": {
                    "query": {
                        "type": "string",
                        "title": "调用内容",
                        "description": "输入希望技能处理的请求",
                    }
                },
            },
            "output_schema": {
                "type": "object",
                "required": ["summary", "preview_rows", "total_count"],
                "properties": {
                    "summary": {"type": "string"},
                    "preview_rows": {"type": "array"},
                    "total_count": {"type": "integer"},
                },
            },
            "permissions": ["skill:generated.execute", "chat:invoke"],
            "ui": {
                "theme_accent": "#22C55E",
                "stages": ["需求解析", "规则执行", "结果整理"],
                "chat_card": {
                    "show_fields": ["query"],
                    "allow_file_upload": False,
                },
                "standalone": {
                    "show_trace": True,
                    "show_export": False,
                },
            },
            "icon": "Sparkle",
            "cover": "custom",
            "source": "builder",
        }

        file_specs: list[tuple[str, str, str]] = [
            ("manifest.json", f"{root_rel}/manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2)),
            ("SKILL.md", f"{root_rel}/SKILL.md", _build_skill_md(skill_name, skill_id, category, requirement, llm_note)),
            ("scripts/validate_input.py", f"{root_rel}/scripts/validate_input.py", _build_validate_script()),
            ("scripts/run.py", f"{root_rel}/scripts/run.py", _build_run_script()),
            ("scripts/format_output.py", f"{root_rel}/scripts/format_output.py", _build_format_script()),
            ("references/usage.md", f"{root_rel}/references/usage.md", _build_reference_md(skill_name, skill_id)),
        ]

        artifact_files: list[dict[str, Any]] = []
        for idx, (label, rel_path, content) in enumerate(file_specs):
            tool_id = f"write-{idx+1}"
            tool_call_id = f"{tool_id}-{uuid.uuid4().hex[:8]}"
            started_ms = int(time.time() * 1000)
            await self._trace(
                on_progress,
                trace_state,
                stage="工具执行",
                stage_index=1,
                kind="tool_start",
                title="调用工具 write_text_file",
                detail=f"create {rel_path}",
                progress=0.42 + idx * 0.05,
                metrics={
                    "tool_id": tool_id,
                    "tool_call_id": tool_call_id,
                    "workspace_id": workspace_id or "",
                    "sandbox_id": workspace_id or "",
                    "cmd": f"create {rel_path}",
                    "started_at_ms": started_ms,
                },
            )
            real_path = skill_creator_workspace.user_generated_root / rel_path
            display_path = rel_path
            bytes_count = len(content.encode("utf-8"))

            if workspace_id and display_root:
                display_path = f"{display_root}/{rel_path[len(root_rel):].strip('/')}"
                tool_result = tool_execution_service.write_text_file(
                    workspace_id=workspace_id,
                    display_path=display_path,
                    content=content,
                    tool_call_id=tool_call_id,
                )
                write_ok = tool_result.status == "success"
                for line in tool_result.stdout_lines:
                    await self._trace(
                        on_progress,
                        trace_state,
                        stage="工具执行",
                        stage_index=1,
                        kind="tool_stdout",
                        title="write_text_file stdout",
                        detail=line,
                        progress=min(0.86, 0.43 + idx * 0.05),
                        metrics={
                            "tool_id": tool_id,
                            "tool_call_id": tool_call_id,
                            "workspace_id": workspace_id,
                            "sandbox_id": workspace_id,
                        },
                    )
                result_detail = "file written"
            else:
                fs_result = skill_creator_workspace.write_text_file(rel_path, content)
                write_ok = fs_result.ok
                result_detail = fs_result.detail
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="工具执行",
                    stage_index=1,
                    kind="tool_stdout",
                    title="write_text_file stdout",
                    detail=f"file written: {rel_path}",
                    progress=min(0.86, 0.43 + idx * 0.05),
                    metrics={
                        "tool_id": tool_id,
                        "tool_call_id": tool_call_id,
                    },
                )
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="工具执行",
                    stage_index=1,
                    kind="tool_stdout",
                    title="write_text_file stdout",
                    detail=f"bytes: {bytes_count}",
                    progress=min(0.86, 0.43 + idx * 0.05),
                    metrics={
                        "tool_id": tool_id,
                        "tool_call_id": tool_call_id,
                    },
                )

            await self._trace(
                on_progress,
                trace_state,
                stage="工具执行",
                stage_index=1,
                kind="tool_end",
                title="工具结束 write_text_file",
                detail=f"{result_detail}: {rel_path}",
                status="done" if write_ok else "warning",
                progress=0.44 + idx * 0.05,
                metrics={
                    "tool_id": tool_id,
                    "tool_call_id": tool_call_id,
                    "workspace_id": workspace_id or "",
                    "sandbox_id": workspace_id or "",
                    "exit_code": 0 if write_ok else 1,
                    "bytes": bytes_count,
                    "started_at_ms": started_ms,
                    "finished_at_ms": int(time.time() * 1000),
                    "duration_ms": max(0, int(time.time() * 1000) - started_ms),
                    "artifacts": [{"op": "created", "path": display_path}],
                },
            )
            if workspace_id:
                workspace_session_service.emit_fs_changed_real(workspace_id, op="created", real_path=real_path)
                display_path = workspace_session_service.real_to_display_path(workspace_id, real_path)

            await self._trace(
                on_progress,
                trace_state,
                stage="工具执行",
                stage_index=1,
                kind="fs_change",
                title=f"文件已创建 {label}",
                detail=display_path,
                status="done",
                progress=0.45 + idx * 0.05,
            )

            artifact_files.append(
                {
                    "name": label,
                    "path": display_path,
                    "summary": result_detail,
                    "preview": content[:900] + ("…" if len(content) > 900 else ""),
                }
            )

        if workspace_id:
            workspace_session_service.publish_fs_snapshot(workspace_id)

        await self._trace(
            on_progress,
            trace_state,
            stage="工具执行",
            stage_index=1,
            kind="thinking",
            title="刷新技能目录索引",
            detail="重新加载 manifest 并刷新 @ 技能触发索引。",
            progress=0.80,
        )
        manifest_registry.reload()
        skill_mention_parser.reload()
        await self._progress(on_progress, "工具执行", 0.84, "文件创建完成，已刷新技能注册")

        tree_result = skill_creator_workspace.list_tree(root_rel)

        await self._progress(on_progress, "交付整理", 0.90, "正在整理交付说明")
        root_label = display_root or root_virtual
        delivery_notes = (
            f"已完成技能 `{skill_name}` 创建，并写入目录 `{root_label}`。\n"
            f"可在聊天中通过 `@{skill_id}` 触发；技能广场将自动展示该技能。"
        )
        if llm_note.strip():
            delivery_notes += f"\n\nCLI 建议摘录：\n{llm_note.strip()}"

        await self._trace(
            on_progress,
            trace_state,
            stage="交付整理",
            stage_index=2,
            kind="delivery",
            title="交付整理完成",
            detail="输出目录树、关键文件与使用说明。",
            status="done",
            progress=0.98,
        )
        await self._progress(on_progress, "交付整理", 1.0, "技能创建完成")

        elapsed = round(time.time() - started, 3)
        summary = f"已成功创建技能 {skill_name}（{skill_id}），可立即在技能广场与 @ 对话中使用。"

        report = {
            "created_skill_id": skill_id,
            "created_skill_name": skill_name,
            "artifact_root": root_label,
            "artifact_vfs_root": root_virtual,
            "artifact_tree": tree_result.extra.get("tree", ""),
            "delivery_notes": delivery_notes,
            "artifact_files": artifact_files,
            "total_count": len(artifact_files),
            "columns": [
                {"key": "name", "label": "文件", "type": "text"},
                {"key": "path", "label": "路径", "type": "text"},
                {"key": "summary", "label": "说明", "type": "text"},
            ],
            "preview_rows": [
                {"name": item["name"], "path": item["path"], "summary": item["summary"]}
                for item in artifact_files
            ],
        }

        if workspace_id:
            workspace_session_service.record_creator_result(
                workspace_id=workspace_id,
                run_id=run_id,
                result={
                    "task_id": run_id,
                    "run_id": run_id,
                    "summary": summary,
                    "metadata": {
                        "duration": elapsed,
                        "skill_id": skill_id,
                        "skill_name": skill_name,
                        "category": category,
                        "artifact_root": root_label,
                        "workspace_id": workspace_id,
                    },
                    **report,
                },
            )

        return AgentResult(
            summary=summary,
            report=report,
            metadata={
                "duration": elapsed,
                "skill_id": skill_id,
                "skill_name": skill_name,
                "category": category,
                "artifact_root": root_label,
                "workspace_id": workspace_id,
                "run_id": run_id,
            },
        )
