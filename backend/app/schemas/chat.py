"""Chat-related request/response schemas."""

from pydantic import BaseModel, Field
from typing import Optional


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    message_count: int


class UpdateSessionRequest(BaseModel):
    title: str


class SendMessageRequest(BaseModel):
    content: str


class SkillInvocationRequest(BaseModel):
    skill_id: str
    input: dict = Field(default_factory=dict)
    origin_message_id: Optional[str] = None


class RiskDetail(BaseModel):
    label: str
    value: str
    level: str  # high / medium / low


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    details: Optional[list[RiskDetail]] = None
    actions: Optional[list[str]] = None
    created_at: str
