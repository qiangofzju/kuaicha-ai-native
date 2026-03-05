"""Unified runtime entry for standalone/chat/external skill invoke."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.services.agent_service import agent_service
from app.skills_core.manifest_loader import manifest_registry


class SkillsRuntime:
    """Runtime adapter over existing agent workflows."""

    async def invoke_async(
        self,
        skill_id: str,
        input_payload: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> str:
        manifest = manifest_registry.get_manifest(skill_id)
        if manifest is None:
            raise HTTPException(status_code=404, detail="Skill not found")

        if manifest.status != "ready":
            raise HTTPException(status_code=409, detail="技能即将上线，暂不支持执行")

        if manifest.execution.mode != "agent_workflow":
            raise HTTPException(status_code=501, detail="当前技能执行模式尚未实现")

        agent_id = manifest.execution.agent_id
        if not agent_id:
            raise HTTPException(status_code=500, detail="技能执行配置缺少 agent_id")

        target = str(input_payload.get("query") or input_payload.get("target") or "")
        params = dict(input_payload)
        params.pop("target", None)

        if context:
            params["_skill_context"] = context

        task_id = await agent_service.execute_agent(agent_id=agent_id, target=target, params=params)
        if task_id is None:
            raise HTTPException(status_code=404, detail="Skill workflow not found")
        return task_id


skills_runtime = SkillsRuntime()
