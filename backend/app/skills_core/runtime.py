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
        run_id: str | None = None,
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
        params["_skill_id"] = skill_id

        if context:
            merged_context = dict(context)
            merged_context.setdefault("skill_id", skill_id)
            if run_id:
                merged_context.setdefault("run_id", run_id)
            params["_skill_context"] = merged_context
        else:
            base_context: dict[str, Any] = {"skill_id": skill_id}
            if run_id:
                base_context["run_id"] = run_id
            params["_skill_context"] = base_context

        task_id = await agent_service.execute_agent(
            agent_id=agent_id,
            target=target,
            params=params,
            task_id=run_id,
        )
        if task_id is None:
            raise HTTPException(status_code=404, detail="Skill workflow not found")
        return task_id


skills_runtime = SkillsRuntime()
