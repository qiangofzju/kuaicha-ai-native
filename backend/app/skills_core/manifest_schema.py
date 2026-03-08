"""Pydantic schema for parsed skill package metadata."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SkillEntrypoints(BaseModel):
    """Supported entry modes for one skill."""

    standalone: bool = True
    chat_invoke: bool = True
    external_api: bool = True


class SkillTriggers(BaseModel):
    """Mention triggers used in chat."""

    mention_ids: list[str] = Field(default_factory=list)
    mention_aliases: list[str] = Field(default_factory=list)


class SkillExecutionConfig(BaseModel):
    """Execution adapter configuration."""

    mode: Literal["agent_workflow", "python_callable", "http_adapter", "script"] = "agent_workflow"
    agent_id: str | None = None
    driver: str | None = None


class JsonSchemaNode(BaseModel):
    """Simplified JSON schema node for skill input/output."""

    model_config = ConfigDict(extra="allow")

    type: str | None = None
    required: list[str] = Field(default_factory=list)
    properties: dict[str, Any] = Field(default_factory=dict)


class SkillUiConfig(BaseModel):
    """UI hints consumed by frontend."""

    model_config = ConfigDict(extra="allow")

    theme_accent: str = "#F59E0B"
    stages: list[str] = Field(default_factory=list)
    chat_card: dict[str, Any] = Field(default_factory=dict)
    standalone: dict[str, Any] = Field(default_factory=dict)


class SkillManifest(BaseModel):
    """Canonical app-facing metadata derived from ``SKILL.md`` frontmatter."""

    model_config = ConfigDict(extra="allow")

    id: str
    version: str
    name: str
    display_name: str
    description: str
    category: str
    status: Literal["ready", "coming", "beta"] = "coming"
    author: str = ""
    tags: list[str] = Field(default_factory=list)
    entrypoints: SkillEntrypoints = Field(default_factory=SkillEntrypoints)
    triggers: SkillTriggers = Field(default_factory=SkillTriggers)
    execution: SkillExecutionConfig
    input_schema: JsonSchemaNode = Field(default_factory=JsonSchemaNode)
    output_schema: JsonSchemaNode = Field(default_factory=JsonSchemaNode)
    permissions: list[str] = Field(default_factory=list)
    ui: SkillUiConfig = Field(default_factory=SkillUiConfig)
    entrypoint: str | None = None
    icon: str | None = None
    cover: str | None = None
    source: str | None = None
    internal: bool = False
