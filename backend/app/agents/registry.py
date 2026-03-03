"""Agent registry – central catalogue of available agents."""

from typing import Optional

from app.agents.base import BaseAgent
from app.utils.logger import logger


class AgentRegistry:
    """Registry that holds all agent instances by their ID."""

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent):
        """Register an agent instance."""
        self._agents[agent.agent_id] = agent
        logger.info("Registered agent: %s (%s)", agent.agent_id, agent.name)

    def get(self, agent_id: str) -> Optional[BaseAgent]:
        """Retrieve an agent by ID, or ``None`` if not found."""
        return self._agents.get(agent_id)

    def list_all(self) -> list[BaseAgent]:
        """Return all registered agents."""
        return list(self._agents.values())


# Module-level singleton
registry = AgentRegistry()


def register_all_agents():
    """Discover and register all built-in agents.

    Called once at application startup.
    """
    from app.agents.workflows.risk_due_diligence import RiskDueDiligenceAgent
    from app.agents.workflows.sentiment_briefing import SentimentBriefingAgent
    from app.agents.workflows.tech_assessment import TechAssessmentAgent
    from app.agents.workflows.relationship_explorer import RelationshipExplorerAgent
    from app.agents.workflows.trend_analysis import TrendAnalysisAgent
    from app.agents.workflows.batch_processing import BatchProcessingAgent

    registry.register(RiskDueDiligenceAgent())
    registry.register(SentimentBriefingAgent())
    registry.register(TechAssessmentAgent())
    registry.register(RelationshipExplorerAgent())
    registry.register(TrendAnalysisAgent())
    registry.register(BatchProcessingAgent())

    logger.info("All agents registered. Total: %d", len(registry.list_all()))
