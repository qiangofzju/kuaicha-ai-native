"""Skill creator workflow: requirement -> tool execution -> delivery."""

from __future__ import annotations

import asyncio
import json
import random
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

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
    ascii_like = re.sub(r"[^a-z0-9-]", "", lowered).strip("-")
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


def _build_skill_md(frontmatter: dict[str, Any], body_markdown: str) -> str:
    frontmatter_text = yaml.safe_dump(frontmatter, allow_unicode=True, sort_keys=False).strip()
    return f"""---
{frontmatter_text}
---

{body_markdown.rstrip()}
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


def _build_openai_yaml(skill_name: str, requirement: str) -> str:
    short_description = requirement[:48].strip() or skill_name
    payload = {
        "interface": {
            "display_name": skill_name,
            "short_description": short_description,
        }
    }
    return yaml.safe_dump(payload, allow_unicode=True, sort_keys=False).strip() + "\n"


def _load_skill_creator_context() -> dict[str, str]:
    skill_root = Path(__file__).resolve().parents[2] / "skills_assets" / "skill-creator"
    context: dict[str, str] = {}
    for rel_path in [
        "SKILL.md",
        "references/openai_yaml.md",
        "scripts/init_skill.py",
        "scripts/quick_validate.py",
        "scripts/generate_openai_yaml.py",
    ]:
        path = skill_root / rel_path
        if path.exists():
            context[rel_path] = path.read_text(encoding="utf-8")
    return context


def _build_default_skill_spec(
    *,
    skill_name: str,
    skill_id: str,
    category: str,
    requirement: str,
) -> dict[str, Any]:
    return {
        "display_name": skill_name,
        "canonical_name": skill_name.replace("技能", "") or skill_name,
        "category": category,
        "short_description": requirement[:48].strip() or skill_name,
        "assistant_summary": f"我将为你创建技能 {skill_name}，先生成标准技能包骨架，再补齐技能说明、参考资料和运行脚本。",
        "planning_steps": [
            "分析技能目标与适用场景",
            "初始化标准技能包目录",
            "生成 SKILL.md、参考文档和脚本",
            "验证并输出创建总结",
        ],
        "reference_files": [
            {
                "path": "references/usage.md",
                "summary": "技能使用说明",
                "content": _build_reference_md(skill_name, skill_id),
            }
        ],
        "skill_md_body": f"""# {skill_name}

## Overview

为业务提供一个可复用的技能入口，支持在聊天中通过 `@{skill_id}` 触发，并在技能广场中直接执行。

## Requirement

{requirement}

## Inputs

- `query` (required): 用户输入的技能调用需求

## Outputs

- `summary`
- `preview_rows`
- `total_count`

## Execution

Run the standard package script chain:

1. `python3 scripts/validate_input.py`
2. `python3 scripts/run.py`
3. `python3 scripts/format_output.py`

## References

- See `references/usage.md` for invocation guidance.

## Notes

Category: `{category}`

本技能由 Skill Creator 自动生成初版结构。
""",
    }


def _build_clarification_questions(requirement: str) -> list[str]:
    text = requirement.strip()
    questions = [
        "你想支持哪些具体场景或能力？请给 2-4 个典型例子。",
        "用户会如何触发这个技能？请给出 2-3 条典型输入示例。",
        "是否需要附带参考资料、脚本或资源文件？如果需要，请说明类型。",
    ]
    if any(token in text for token in ["导出", "报表", "sql", "批量"]):
        questions[2] = "是否需要脚本或数据模板来支撑执行？如果需要，请说明会处理哪些文件或数据。"
    return questions


def _needs_clarification_heuristic(requirement: str) -> bool:
    text = (requirement or "").strip()
    if len(text) < 12:
        return True

    strong_signals = [
        "支持",
        "包含",
        "用于",
        "用户",
        "输入",
        "输出",
        "示例",
        "流程",
        "参考资料",
        "脚本",
        "资源",
        "触发",
        "结果",
        "页面",
        "图表",
        "导出",
        "接口",
    ]
    hit_count = sum(1 for token in strong_signals if token in text)
    if hit_count >= 2:
        return False

    weak_patterns = [
        "帮我创建",
        "做一个",
        "搞一个",
        "建一个",
    ]
    if any(token in text for token in weak_patterns) and hit_count == 0:
        return True

    return len(text) < 24


def _build_skill_frontmatter(
    *,
    skill_name: str,
    skill_id: str,
    category: str,
    requirement: str,
    short_description: str,
    icon: str,
    accent: str,
) -> dict[str, Any]:
    return {
        "name": skill_id,
        "description": requirement[:140],
        "metadata": {
            "short-description": short_description,
        },
        "app": {
            "id": skill_id,
            "version": "1.0.0",
            "display_name": skill_name,
            "category": category,
            "status": "ready",
            "author": "@SkillCreator",
            "tags": ["用户创建", category],
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
                "mode": "script",
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
                "theme_accent": accent,
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
            "icon": icon,
            "cover": "custom",
            "source": "builder",
        },
    }


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
\"\"\"Execute one generated skill package with the configured app driver.\"\"\"

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import sys

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.environ["DEBUG"] = "false"

from app.agents.driver import get_driver


def _parse_frontmatter(skill_md_path: Path) -> tuple[dict, str]:
    content = skill_md_path.read_text(encoding="utf-8")
    stripped = content.lstrip()
    if not stripped.startswith("---"):
        raise RuntimeError("SKILL.md 缺少 frontmatter")
    lines = stripped.splitlines()
    end_index = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end_index = index
            break
    if end_index is None:
        raise RuntimeError("SKILL.md frontmatter 未闭合")
    frontmatter = yaml.safe_load("\\n".join(lines[1:end_index])) or {}
    if not isinstance(frontmatter, dict):
        raise RuntimeError("SKILL.md frontmatter 非法")
    body = "\\n".join(lines[end_index + 1 :]).lstrip("\\n")
    return frontmatter, body


def _load_references(reference_dir: Path) -> list[dict]:
    if not reference_dir.exists():
        return []
    docs = []
    for path in sorted(reference_dir.glob("*.md")):
        docs.append(
            {
                "path": str(path.relative_to(reference_dir.parent)).replace("\\\\", "/"),
                "content": path.read_text(encoding="utf-8"),
            }
        )
    return docs


async def _run(payload: dict) -> dict:
    skill_root = Path.cwd()
    frontmatter, skill_body = _parse_frontmatter(skill_root / "SKILL.md")
    app_block = frontmatter.get("app", {}) if isinstance(frontmatter, dict) else {}
    query = str(payload.get("query") or payload.get("target") or "").strip()
    if not query:
        raise RuntimeError("missing-query")

    references = _load_references(skill_root / "references")
    prompt = (
        "你正在执行一个技能包。请结合 skill 定义、参考资料和用户输入，输出结构化 JSON 结果。\\n\\n"
        f"Skill metadata:\\n{json.dumps(app_block, ensure_ascii=False, indent=2)}\\n\\n"
        f"SKILL.md body:\\n{skill_body}\\n\\n"
        f"References:\\n{json.dumps(references, ensure_ascii=False, indent=2)}\\n\\n"
        f"User query:\\n{query}\\n"
    )
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "preview_rows": {"type": "array"},
            "total_count": {"type": "integer"},
            "columns": {"type": "array"},
        },
        "required": ["summary", "preview_rows", "total_count"],
    }

    driver = get_driver()
    response = await driver.call(
        prompt=prompt,
        system="你是技能运行器。严格按照技能定义和参考资料工作，只输出 JSON。",
        json_schema=schema,
    )
    try:
        result = json.loads(response.content)
    except json.JSONDecodeError:
        result = {
            "summary": response.content.strip() or "技能执行完成",
            "preview_rows": [],
            "total_count": 0,
            "columns": [],
        }
    if not isinstance(result, dict):
        raise RuntimeError("invalid-skill-output")
    result.setdefault("summary", "技能执行完成")
    result.setdefault("preview_rows", [])
    result.setdefault("total_count", len(result["preview_rows"]) if isinstance(result.get("preview_rows"), list) else 0)
    result.setdefault("columns", [])
    return result


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print("invalid-json", file=sys.stderr)
        return 1

    try:
        result = asyncio.run(_run(payload))
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

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

    async def _emit_clarification(
        self,
        *,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
        questions: list[str],
    ) -> None:
        detail = "请先确认以下信息：\n\n" + "\n".join(f"{index + 1}. {question}" for index, question in enumerate(questions))
        await self._trace(
            on_progress,
            trace_state,
            stage="需求分析",
            stage_index=0,
            kind="clarification",
            title="需要你确认的信息",
            detail=detail,
            status="running",
            progress=0.22,
        )

    async def _decide_clarification(
        self,
        *,
        requirement: str,
        enable_cli_draft: bool,
    ) -> dict[str, Any]:
        default_questions = _build_clarification_questions(requirement)
        default_needs = _needs_clarification_heuristic(requirement)
        default_payload = {
            "needs_clarification": default_needs,
            "reason": "需求信息不足，建议先补充使用场景、触发示例和资源约束。"
            if default_needs
            else "需求已包含较明确的能力范围，可直接进入技能规划与创建。",
            "questions": default_questions if default_needs else [],
        }

        if settings.AGENT_DRIVER.lower() != "cli" or not enable_cli_draft:
            return default_payload

        schema = {
            "type": "object",
            "properties": {
                "needs_clarification": {"type": "boolean"},
                "reason": {"type": "string"},
                "questions": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["needs_clarification", "reason", "questions"],
        }
        prompt = (
            "请判断下面的技能创建需求，是否已经足够明确到可以直接开始创建技能包。"
            "只有在缺少关键能力范围、触发方式、输入输出预期、资源约束时，才需要澄清。\n\n"
            f"用户需求：{requirement}\n\n"
            "输出 JSON：\n"
            "- needs_clarification: 是否必须先澄清\n"
            "- reason: 判断理由\n"
            "- questions: 如果 needs_clarification=true，给出最多 3 个关键问题；否则返回空数组\n"
        )

        try:
            driver = get_driver()
            response = await driver.call(
                prompt=prompt,
                system="你是技能创建流程的需求判断器。必须严格输出符合 schema 的 JSON。",
                json_schema=schema,
            )
            payload = json.loads(response.content)
            if not isinstance(payload, dict):
                return default_payload
            questions = payload.get("questions", [])
            normalized_questions = [
                str(item).strip()
                for item in questions
                if str(item).strip()
            ][:3]
            needs_clarification = bool(payload.get("needs_clarification"))
            if needs_clarification and not normalized_questions:
                normalized_questions = default_questions
            return {
                "needs_clarification": needs_clarification,
                "reason": str(payload.get("reason") or default_payload["reason"]).strip() or default_payload["reason"],
                "questions": normalized_questions if needs_clarification else [],
            }
        except Exception:
            return default_payload

    async def _stream_cli_plan(
        self,
        *,
        requirement: str,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
    ) -> None:
        if settings.AGENT_DRIVER.lower() != "cli":
            await self._trace(
                on_progress,
                trace_state,
                stage="需求分析",
                stage_index=0,
                kind="thinking",
                title="创建策略",
                detail="当前为非 CLI 驱动，使用后端降级规划流程。",
                progress=0.12,
            )
            return

        driver = get_driver()
        skill_context = _load_skill_creator_context()
        system = (
            "你是技能创建助手。请参考 skill-creator 技能包的工作方式，"
            "用中文输出简洁但清晰的创建计划、文件规划和执行判断。"
        )
        prompt = (
            f"用户需求：{requirement}\n\n"
            "请先规划如何创建这个技能。输出要求：\n"
            "1. 先一句话确认你理解的技能目标。\n"
            "2. 给出 3-5 步执行计划。\n"
            "3. 说明将创建哪些关键文件。\n"
            "4. 不要输出代码块。\n\n"
            f"skill-creator/SKILL.md:\n{skill_context.get('SKILL.md', '')}\n"
        )

        buffered = ""
        line_count = 0
        async for chunk in driver.call_streaming(prompt=prompt, system=system):
            if chunk.startswith("[Error]") or chunk.startswith("[CLI Error]"):
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="需求分析",
                    stage_index=0,
                    kind="warn",
                    title="CLI 规划输出异常",
                    detail=chunk,
                    status="warning",
                    progress=0.14,
                )
                return

            buffered += chunk
            while "\n" in buffered:
                line, buffered = buffered.split("\n", 1)
                content = line.strip()
                if not content:
                    continue
                kind = "plan" if line_count == 1 or content[:2].isdigit() else "thinking"
                title = "更新计划" if kind == "plan" else "技能规划"
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="需求分析",
                    stage_index=0,
                    kind=kind,
                    title=title,
                    detail=content,
                    progress=min(0.22, 0.10 + line_count * 0.02),
                )
                line_count += 1

        tail = buffered.strip()
        if tail:
            await self._trace(
                on_progress,
                trace_state,
                stage="需求分析",
                stage_index=0,
                kind="thinking",
                title="技能规划",
                detail=tail,
                progress=0.22,
            )

    async def _generate_skill_spec(
        self,
        *,
        requirement: str,
        skill_name: str,
        skill_id: str,
        category: str,
    ) -> dict[str, Any]:
        default_spec = _build_default_skill_spec(
            skill_name=skill_name,
            skill_id=skill_id,
            category=category,
            requirement=requirement,
        )
        if settings.AGENT_DRIVER.lower() != "cli":
            return default_spec

        skill_context = _load_skill_creator_context()
        driver = get_driver()
        schema = {
            "type": "object",
            "properties": {
                "display_name": {"type": "string"},
                "canonical_name": {"type": "string"},
                "category": {"type": "string"},
                "short_description": {"type": "string"},
                "assistant_summary": {"type": "string"},
                "planning_steps": {"type": "array", "items": {"type": "string"}},
                "skill_md_body": {"type": "string"},
                "reference_files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "summary": {"type": "string"},
                            "content": {"type": "string"},
                        },
                        "required": ["path", "summary", "content"],
                    },
                },
            },
            "required": [
                "display_name",
                "canonical_name",
                "category",
                "short_description",
                "assistant_summary",
                "planning_steps",
                "skill_md_body",
                "reference_files",
            ],
        }
        prompt = (
            f"请根据下面需求生成一个可执行技能包设计 JSON。\n\n"
            f"技能 ID 固定为：{skill_id}\n"
            f"技能显示名建议：{skill_name}\n"
            f"分类建议：{category}\n"
            f"用户需求：{requirement}\n\n"
            "要求：\n"
            "1. 必须输出适合 Codex/Claude 风格 SKILL 的正文内容，不包含 YAML frontmatter。\n"
            "2. 必须给出 1-4 个 references/*.md 文件内容。\n"
            "3. 不要输出 manifest.json。\n"
            "4. 正文与参考资料均使用中文。\n\n"
            f"skill-creator/SKILL.md:\n{skill_context.get('SKILL.md', '')}\n\n"
            f"references/openai_yaml.md:\n{skill_context.get('references/openai_yaml.md', '')}\n"
        )

        try:
            response = await driver.call(
                prompt=prompt,
                system="你是技能包设计师。只输出符合 schema 的 JSON。",
                json_schema=schema,
            )
            payload = json.loads(response.content)
            if isinstance(payload, dict):
                return payload
        except Exception:
            pass
        return default_spec

    async def _write_skill_file(
        self,
        *,
        on_progress: Optional[Any],
        trace_state: dict[str, Any],
        workspace_id: str,
        root_rel: str,
        rel_path: str,
        content: str,
        index: int,
        total: int,
    ) -> dict[str, Any]:
        tool_id = f"write-{index + 1}"
        tool_call_id = f"{tool_id}-{uuid.uuid4().hex[:8]}"
        started_ms = int(time.time() * 1000)
        display_path = f"/workspace/projects/{root_rel}/{rel_path}".replace("//", "/")

        await self._trace(
            on_progress,
            trace_state,
            stage="工具执行",
            stage_index=1,
            kind="tool_start",
            title="创建文件",
            detail=rel_path,
            progress=0.42 + (index / max(total, 1)) * 0.28,
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "workspace_id": workspace_id,
                "sandbox_id": workspace_id,
                "cmd": f"write {rel_path}",
                "started_at_ms": started_ms,
            },
        )

        result = tool_execution_service.write_text_file(
            workspace_id=workspace_id,
            display_path=display_path,
            content=content,
            tool_call_id=tool_call_id,
        )
        for line in result.stdout_lines:
            await self._trace(
                on_progress,
                trace_state,
                stage="工具执行",
                stage_index=1,
                kind="tool_stdout",
                title="创建文件输出",
                detail=line,
                progress=min(0.78, 0.44 + index * 0.03),
                metrics={
                    "tool_id": tool_id,
                    "tool_call_id": tool_call_id,
                    "workspace_id": workspace_id,
                    "sandbox_id": workspace_id,
                },
            )

        await self._trace(
            on_progress,
            trace_state,
            stage="工具执行",
            stage_index=1,
            kind="tool_end",
            title="文件创建完成",
            detail=rel_path,
            status="done" if result.status == "success" else "error",
            progress=min(0.82, 0.46 + index * 0.03),
            metrics={
                "tool_id": tool_id,
                "tool_call_id": tool_call_id,
                "workspace_id": workspace_id,
                "sandbox_id": workspace_id,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "started_at_ms": started_ms,
                "finished_at_ms": result.finished_at_ms,
                "artifacts": [{"op": "created", "path": display_path}],
            },
        )
        await self._trace(
            on_progress,
            trace_state,
            stage="工具执行",
            stage_index=1,
            kind="fs_change",
            title="文件已创建",
            detail=display_path,
            status="done",
            progress=min(0.84, 0.47 + index * 0.03),
        )
        return {
            "name": Path(rel_path).name,
            "path": display_path,
            "summary": "file written",
            "preview": content[:900] + ("…" if len(content) > 900 else ""),
        }

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
        workspace = workspace_session_service.get(workspace_id) if workspace_id else None
        creator_session_mode = str(context.get("creator_session_mode", "")).strip()
        enable_cli_draft = source in {"standalone", "skill_creator_ui", "chat"}
        creator_session = workspace_session_service.get_creator_session_state(workspace_id) if workspace_id else {}

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

        conversation_messages = list(creator_session.get("messages", [])) if isinstance(creator_session.get("messages"), list) else []
        if creator_session_mode == "continuation":
            base_requirement = str(creator_session.get("base_requirement") or "").strip()
            conversation_messages.append({"role": "user", "content": requirement})
            requirement = "\n\n".join(
                part for part in [
                    base_requirement,
                    "用户补充信息：",
                    "\n".join(
                        f"- {item.get('role')}: {item.get('content')}"
                        for item in conversation_messages
                        if isinstance(item, dict) and item.get("content")
                    ),
                ] if part
            )
        else:
            conversation_messages = [{"role": "user", "content": requirement}]

        skill_name = str(creator_session.get("skill_name") or _infer_skill_name(requirement)).strip() or _infer_skill_name(requirement)
        base_skill_id = _slugify(skill_name)
        skill_id = str(creator_session.get("skill_id") or "").strip() or self._ensure_unique_skill_id(base_skill_id)
        category = str(creator_session.get("category") or _infer_category(requirement)).strip() or _infer_category(requirement)
        llm_note = await self._build_llm_note(requirement, enable_cli_draft=enable_cli_draft)

        if creator_session_mode != "continuation":
            clarification_decision = await self._decide_clarification(
                requirement=requirement,
                enable_cli_draft=enable_cli_draft,
            )
            needs_clarification = bool(clarification_decision.get("needs_clarification"))
            questions = [
                str(item).strip()
                for item in clarification_decision.get("questions", [])
                if str(item).strip()
            ]
            decision_reason = str(clarification_decision.get("reason") or "").strip()

            if needs_clarification:
                if workspace_id:
                    workspace_session_service.update_creator_session_state(
                        workspace_id,
                        {
                            "base_requirement": requirement,
                            "messages": conversation_messages,
                            "pending_questions": questions,
                            "skill_name": skill_name,
                            "skill_id": skill_id,
                            "category": category,
                        },
                    )
                if decision_reason:
                    await self._trace(
                        on_progress,
                        trace_state,
                        stage="需求分析",
                        stage_index=0,
                        kind="thinking",
                        title="需求判断",
                        detail=decision_reason,
                        progress=0.16,
                    )
                await self._emit_clarification(
                    on_progress=on_progress,
                    trace_state=trace_state,
                    questions=questions,
                )
                summary = "需要你确认一些信息后，才能继续创建技能。"
                report = {
                    "creator_state": "clarification_pending",
                    "pending_questions": questions,
                    "artifact_root": workspace.display_root if workspace else "",
                    "artifact_tree": "",
                    "delivery_notes": summary,
                    "artifact_files": [],
                    "preview_rows": [{"question": question} for question in questions],
                    "columns": [{"key": "question", "label": "待确认问题", "type": "text"}],
                    "total_count": len(questions),
                }
                if workspace_id:
                    workspace_session_service.record_creator_result(
                        workspace_id=workspace_id,
                        run_id=run_id,
                        result={
                            "task_id": run_id,
                            "run_id": run_id,
                            "summary": summary,
                            "metadata": {"creator_state": "clarification_pending"},
                            **report,
                        },
                    )
                return AgentResult(summary=summary, report=report, metadata={"creator_state": "clarification_pending"})

            if workspace_id:
                workspace_session_service.update_creator_session_state(
                    workspace_id,
                    {
                        "base_requirement": requirement,
                        "messages": conversation_messages,
                        "pending_questions": [],
                        "skill_name": skill_name,
                        "skill_id": skill_id,
                        "category": category,
                    },
                )
            if decision_reason:
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="需求分析",
                    stage_index=0,
                    kind="thinking",
                    title="需求判断",
                    detail=decision_reason,
                    progress=0.16,
                )

        if workspace_id:
            workspace_session = workspace_session_service.get_creator_session_state(workspace_id)
            workspace_session.update(
                {
                    "messages": conversation_messages,
                    "pending_questions": [],
                    "skill_name": skill_name,
                    "skill_id": skill_id,
                    "category": category,
                }
            )
            workspace_session_service.update_creator_session_state(workspace_id, workspace_session)

        await self._stream_cli_plan(
            requirement=requirement,
            on_progress=on_progress,
            trace_state=trace_state,
        )

        spec = await self._generate_skill_spec(
            requirement=requirement,
            skill_name=skill_name,
            skill_id=skill_id,
            category=category,
        )
        skill_name = str(spec.get("display_name") or skill_name).strip() or skill_name
        category = str(spec.get("category") or category).strip() or category
        short_description = str(spec.get("short_description") or requirement[:48]).strip() or skill_name
        planning_steps = [str(item).strip() for item in spec.get("planning_steps", []) if str(item).strip()]
        assistant_summary = str(spec.get("assistant_summary") or "").strip()

        if planning_steps:
            for index, step in enumerate(planning_steps):
                await self._trace(
                    on_progress,
                    trace_state,
                    stage="需求分析",
                    stage_index=0,
                    kind="plan",
                    title="更新计划",
                    detail=step,
                    progress=min(0.24, 0.16 + index * 0.02),
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
            progress=0.24,
        )
        await self._progress(on_progress, "需求分析", 0.26, "需求分析完成")

        icon_pool = [
            "Shield",
            "Alert",
            "TrendUp",
            "Brain",
            "Network",
            "Briefcase",
            "Database",
            "Globe",
            "Pulse",
            "BarChart",
            "Doc",
            "Table",
        ]
        color_pool = [
            "#3B82F6",
            "#8B5CF6",
            "#EC4899",
            "#F59E0B",
            "#06B6D4",
            "#EF4444",
            "#F97316",
            "#6366F1",
            "#14B8A6",
        ]
        icon_rng = random.Random(skill_id)
        skill_icon = icon_rng.choice(icon_pool)
        skill_accent = icon_rng.choice(color_pool)

        root_rel = skill_id
        root_real = (skill_creator_workspace.user_generated_root / root_rel).resolve()
        root_virtual = virtual_fs.to_virtual(root_real)
        artifact_root = root_virtual
        display_root = workspace.display_root if workspace_id and workspace else ""

        await self._progress(on_progress, "工具执行", 0.34, "开始初始化标准技能包")

        init_script = Path(__file__).resolve().parents[2] / "skills_assets" / "skill-creator" / "scripts" / "init_skill.py"
        generate_yaml_script = Path(__file__).resolve().parents[2] / "skills_assets" / "skill-creator" / "scripts" / "generate_openai_yaml.py"
        quick_validate_script = Path(__file__).resolve().parents[2] / "skills_assets" / "skill-creator" / "scripts" / "quick_validate.py"

        if workspace_id and workspace:
            init_result = await self._run_workspace_command(
                on_progress,
                trace_state,
                workspace_id=workspace_id,
                run_id=run_id,
                stage="工具执行",
                stage_index=1,
                tool_id="init-skill",
                command=[
                    "python3",
                    str(init_script),
                    skill_id,
                    "--path",
                    str(skill_creator_workspace.user_generated_root),
                    "--resources",
                    "scripts,references",
                    "--interface",
                    f"display_name={skill_name}",
                    "--interface",
                    f"short_description={short_description}",
                ],
                cwd_display=workspace.display_root,
                progress=0.38,
            )
            if not init_result.ok:
                raise RuntimeError("标准技能包脚手架初始化失败")
            record = workspace_session_service.attach_skill_root(workspace_id, skill_id)
            display_root = record.display_root
            artifact_root = display_root
            workspace_session_service.publish_fs_snapshot(workspace_id)
        else:
            root_real.mkdir(parents=True, exist_ok=True)

        frontmatter = _build_skill_frontmatter(
            skill_name=skill_name,
            skill_id=skill_id,
            category=category,
            requirement=requirement,
            short_description=short_description,
            icon=skill_icon,
            accent=skill_accent,
        )

        skill_md_body = str(spec.get("skill_md_body") or _build_default_skill_spec(
            skill_name=skill_name,
            skill_id=skill_id,
            category=category,
            requirement=requirement,
        )["skill_md_body"])

        normalized_reference_files: list[dict[str, str]] = []
        for item in spec.get("reference_files", []):
            if not isinstance(item, dict):
                continue
            path = str(item.get("path", "")).strip()
            summary = str(item.get("summary", "")).strip() or "参考资料"
            content = str(item.get("content", "")).strip()
            if not path or not content:
                continue
            if not path.startswith("references/") or not path.endswith(".md"):
                continue
            normalized_reference_files.append({"path": path, "summary": summary, "content": content + "\n"})

        if not normalized_reference_files:
            normalized_reference_files.append(
                {
                    "path": "references/usage.md",
                    "summary": "技能使用说明",
                    "content": _build_reference_md(skill_name, skill_id),
                }
            )

        file_specs = [
            ("SKILL.md", "SKILL.md", _build_skill_md(frontmatter, skill_md_body)),
            ("scripts/validate_input.py", "scripts/validate_input.py", _build_validate_script()),
            ("scripts/run.py", "scripts/run.py", _build_run_script()),
            ("scripts/format_output.py", "scripts/format_output.py", _build_format_script()),
        ]
        for item in normalized_reference_files:
            file_specs.append((Path(item["path"]).name, item["path"], item["content"]))

        artifact_files: list[dict[str, Any]] = []
        if workspace_id and display_root:
            for index, (label, rel_path, content) in enumerate(file_specs):
                artifact_files.append(
                    await self._write_skill_file(
                        on_progress=on_progress,
                        trace_state=trace_state,
                        workspace_id=workspace_id,
                        root_rel=root_rel,
                        rel_path=rel_path,
                        content=content,
                        index=index,
                        total=len(file_specs),
                    )
                )

            yaml_result = await self._run_workspace_command(
                on_progress,
                trace_state,
                workspace_id=workspace_id,
                run_id=run_id,
                stage="工具执行",
                stage_index=1,
                tool_id="generate-ui-meta",
                command=[
                    "python3",
                    str(generate_yaml_script),
                    ".",
                    "--interface",
                    f"display_name={skill_name}",
                    "--interface",
                    f"short_description={short_description}",
                ],
                cwd_display=display_root,
                progress=0.78,
            )
            if not yaml_result.ok:
                artifact_files.append(
                    await self._write_skill_file(
                        on_progress=on_progress,
                        trace_state=trace_state,
                        workspace_id=workspace_id,
                        root_rel=root_rel,
                        rel_path="agents/openai.yaml",
                        content=_build_openai_yaml(skill_name, short_description),
                        index=len(file_specs),
                        total=len(file_specs) + 1,
                    )
                )

            openai_yaml_path = root_real / "agents" / "openai.yaml"
            if openai_yaml_path.exists():
                artifact_files.append(
                    {
                        "name": "openai.yaml",
                        "path": f"{display_root}/agents/openai.yaml",
                        "summary": "ui metadata generated",
                        "preview": openai_yaml_path.read_text(encoding="utf-8")[:900],
                    }
                )

            validate_result = await self._run_workspace_command(
                on_progress,
                trace_state,
                workspace_id=workspace_id,
                run_id=run_id,
                stage="工具执行",
                stage_index=1,
                tool_id="validate-skill",
                command=[
                    "python3",
                    str(quick_validate_script),
                    ".",
                ],
                cwd_display=display_root,
                progress=0.84,
            )
            if not validate_result.ok:
                raise RuntimeError("标准技能包校验失败")
            workspace_session_service.publish_fs_snapshot(workspace_id)
        else:
            root_real.mkdir(parents=True, exist_ok=True)
            skill_creator_workspace.mkdir_p(f"{root_rel}/scripts")
            skill_creator_workspace.mkdir_p(f"{root_rel}/references")
            skill_creator_workspace.mkdir_p(f"{root_rel}/outputs")
            skill_creator_workspace.mkdir_p(f"{root_rel}/agents")
            for _label, rel_path, content in file_specs:
                skill_creator_workspace.write_text_file(f"{root_rel}/{rel_path}", content)

        await self._trace(
            on_progress,
            trace_state,
            stage="工具执行",
            stage_index=1,
            kind="thinking",
            title="刷新技能目录索引",
            detail="重新加载 SKILL.md 目录索引，并刷新 @ 技能触发映射。",
            progress=0.88,
        )
        manifest_registry.reload()
        skill_mention_parser.reload()
        await self._progress(on_progress, "工具执行", 0.90, "标准技能包创建完成，已刷新技能注册")

        tree_result = skill_creator_workspace.list_tree(root_rel)

        await self._progress(on_progress, "交付整理", 0.94, "正在整理交付说明")
        root_label = display_root or root_virtual
        delivery_notes = assistant_summary or f"已完成技能 `{skill_name}` 创建，并写入目录 `{root_label}`。"
        delivery_notes += f"\n\n可在聊天中通过 `@{skill_id}` 触发；技能广场将自动展示该技能。"
        if llm_note.strip():
            delivery_notes += f"\n\nCLI 建议摘录：\n{llm_note.strip()}"

        await self._trace(
            on_progress,
            trace_state,
            stage="交付整理",
            stage_index=2,
            kind="delivery",
            title="交付整理完成",
            detail=delivery_notes,
            status="done",
            progress=0.99,
        )
        await self._progress(on_progress, "交付整理", 1.0, "技能创建完成")

        elapsed = round(time.time() - started, 3)
        summary = assistant_summary or f"已成功创建技能 {skill_name}（{skill_id}），可立即在技能广场与 @ 对话中使用。"

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
            workspace_session_service.clear_creator_session_state(workspace_id)

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
