"""Skills marketplace schemas."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.agent import TaskStatus


class SkillStatus(str, Enum):
    READY = "ready"
    COMING = "coming"
    BETA = "beta"


class SkillMarketStatus(str, Enum):
    READY = "ready"
    COMING = "coming"


class SkillPriceType(str, Enum):
    FREE = "free"
    PAID = "paid"


class SkillDefinition(BaseModel):
    id: str
    name: str
    description: str
    color: str
    tags: list[str]
    icon: str
    status: SkillStatus
    author: str
    price_type: SkillPriceType
    owned: bool
    cover: str
    market_status: SkillMarketStatus


class SkillStoreSection(BaseModel):
    id: str
    title: str
    subtitle: str = ""
    style: str = "grid"
    items: list[SkillDefinition]


class SkillStoreResponse(BaseModel):
    sections: list[SkillStoreSection]


class PurchaseRecord(BaseModel):
    record_id: str
    skill_id: str
    skill_name: str
    price_type: SkillPriceType
    amount: float
    currency: str
    purchased_at: str
    status: str


class SkillCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    category: str = Field(default="general")


class SkillCreateResponse(BaseModel):
    status: str
    message: str
    review_id: str


class SkillConfigField(BaseModel):
    name: str
    label: str
    type: str
    required: bool
    placeholder: Optional[str] = None
    options: Optional[list[dict]] = None
    default: Optional[Any] = None


class SkillConfigSchema(BaseModel):
    skill_id: str
    fields: list[SkillConfigField]


class ExecuteSkillRequest(BaseModel):
    target: str = ""
    params: dict = Field(default_factory=dict)


class SkillTaskStatusResponse(BaseModel):
    task_id: str
    skill_id: str
    status: TaskStatus
    progress: float
    stage: str
    message: str
    created_at: str


class SkillResultResponse(BaseModel):
    """Generic skill result with flexible payload."""

    model_config = ConfigDict(extra="allow")

    task_id: str
    skill_type: str
    summary: str
    metadata: dict = Field(default_factory=dict)
