"""Agent-related request/response schemas."""

from pydantic import BaseModel, ConfigDict
from typing import Any, Optional
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentDefinition(BaseModel):
    id: str
    name: str
    description: str
    color: str
    tags: list[str]
    icon: str
    status: str


class AgentConfigField(BaseModel):
    name: str
    label: str
    type: str  # text / select / number / boolean
    required: bool
    placeholder: Optional[str] = None
    options: Optional[list[dict]] = None
    default: Optional[Any] = None


class AgentConfigSchema(BaseModel):
    agent_id: str
    fields: list[AgentConfigField]


class ExecuteAgentRequest(BaseModel):
    target: str
    params: dict = {}


class TaskStatusResponse(BaseModel):
    task_id: str
    agent_id: str
    status: TaskStatus
    progress: float
    stage: str
    message: str
    created_at: str


class AgentResultResponse(BaseModel):
    """Generic agent result – allows extra fields for agent-specific data."""
    model_config = ConfigDict(extra="allow")

    task_id: str
    agent_type: str
    summary: str
    risk_rating: Optional[str] = None
    risk_findings: Optional[list[dict]] = None
    report_sections: Optional[list[dict]] = None
    timeline: Optional[list[dict]] = None
    metadata: dict = {}
