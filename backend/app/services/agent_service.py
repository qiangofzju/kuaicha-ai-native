"""Agent service – wraps the agent registry and executor."""

import uuid
from typing import Optional

from app.agents.base import AgentInput
from app.agents.executor import executor
from app.agents.registry import register_all_agents, registry
from app.utils.logger import logger
from app.utils.mock_data import get_mock_agent_config, get_mock_agent_list


class AgentService:
    """High-level service for agent operations."""

    @staticmethod
    def _get_registered_agent(agent_id: str):
        agent = registry.get(agent_id)
        if agent is not None:
            return agent

        try:
            register_all_agents()
        except Exception as exc:
            logger.warning("Failed to lazily register agents for %s: %s", agent_id, exc)
            return None
        return registry.get(agent_id)

    # ------------------------------------------------------------------
    # Agent catalogue
    # ------------------------------------------------------------------

    def list_agents(self) -> list[dict]:
        """Return the list of available agents.

        Always returns the full mock catalogue regardless of USE_MOCK_DATA,
        because only 1 agent is registered in the workflow registry so far
        while the catalogue has 6. Execution is gated separately.
        """
        return get_mock_agent_list()

    def get_agent_config(self, agent_id: str) -> Optional[dict]:
        """Return the configuration schema for an agent.

        Prefer workflow-owned schema for registered agents so each agent
        can evolve its own config contract independently.
        """
        agent = self._get_registered_agent(agent_id)
        if agent is not None:
            try:
                return agent.get_config_schema()
            except Exception as exc:
                logger.warning(
                    "Failed to get schema from workflow agent=%s: %s; fallback to mock config",
                    agent_id,
                    exc,
                )
        return get_mock_agent_config(agent_id)

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute_agent(
        self, agent_id: str, target: str, params: dict, task_id: str | None = None
    ) -> Optional[str]:
        """Start agent execution and return the task ID.

        Returns ``None`` if the agent is not found.
        """
        agent = self._get_registered_agent(agent_id)
        if agent is None:
            logger.warning("Agent not found: %s", agent_id)
            return None

        final_task_id = task_id or str(uuid.uuid4())
        agent_input = AgentInput(target=target, params=params)

        await executor.execute(agent, agent_input, task_id=final_task_id)
        logger.info(
            "Started execution: agent=%s, target=%s, task=%s",
            agent_id, target, final_task_id,
        )
        return final_task_id

    # ------------------------------------------------------------------
    # Task queries
    # ------------------------------------------------------------------

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task."""
        return await executor.cancel_task(task_id)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """Return the current status of a task."""
        task = executor.get_task(task_id)
        if task is None:
            return None
        return task.to_status_dict()

    def get_task_result(self, task_id: str) -> Optional[dict]:
        """Return the completed result of a task.

        If the task uses mock data, builds the result from mock_data module.
        """
        task = executor.get_task(task_id)
        if task is None:
            return None

        if task.status.value != "completed":
            return None

        if task.result is not None:
            # Build the API-compatible result dict, merging all report keys
            report = task.result.report or {}
            result_dict = {
                "task_id": task_id,
                "agent_type": task.agent_id,
                "summary": task.result.summary,
                "metadata": task.result.metadata,
            }
            # Merge all report keys (risk_rating, risk_findings, etc.)
            result_dict.update(report)
            return result_dict

        return None


# Module-level singleton
agent_service = AgentService()
