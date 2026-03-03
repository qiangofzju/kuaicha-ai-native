"""Abstract base classes for the agent engine."""

from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import Any, AsyncGenerator, Optional


class AgentInput(BaseModel):
    """Input payload for agent execution."""

    target: str
    params: dict = Field(default_factory=dict)
    user_id: Optional[str] = None


class AgentProgress(BaseModel):
    """Progress update emitted during agent execution."""

    stage: str
    progress: float  # 0.0 – 1.0
    message: str
    data: Optional[Any] = None


class AgentResult(BaseModel):
    """Final output of an agent execution."""

    summary: str
    report: Optional[dict] = None
    charts: Optional[list[dict]] = None
    attachments: Optional[list[str]] = None
    metadata: dict = Field(default_factory=dict)


class BaseAgent(ABC):
    """Abstract base class that all agents must inherit from."""

    agent_id: str
    name: str
    description: str
    color: str
    tags: list[str]

    @abstractmethod
    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Run the agent and return a result.

        Args:
            agent_input: The input payload containing target and parameters.
            on_progress: Optional async callback ``(AgentProgress) -> None``
                         invoked whenever the agent wants to report progress.
        """
        ...

    @abstractmethod
    def get_config_schema(self) -> dict:
        """Return the configuration schema for this agent."""
        ...

    def to_definition(self) -> dict:
        """Serialise the agent metadata into a catalogue entry."""
        return {
            "id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "tags": self.tags,
            "icon": getattr(self, "icon", "Brain"),
            "status": getattr(self, "status", "ready"),
        }
