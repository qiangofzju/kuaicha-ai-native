"""Abstract base class for LLM drivers."""

from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import AsyncGenerator, Optional


class DriverResponse(BaseModel):
    """Response from an LLM driver call."""

    content: str
    usage: Optional[dict] = None
    model: Optional[str] = None


class BaseDriver(ABC):
    """Interface that all LLM drivers must implement."""

    @abstractmethod
    async def call(
        self,
        prompt: str,
        system: str = "",
        json_schema: Optional[dict] = None,
    ) -> DriverResponse:
        """Send a prompt to the LLM and return the complete response.

        If *json_schema* is provided, the driver should attempt to
        enforce structured JSON output matching the schema.
        """
        ...

    @abstractmethod
    async def call_streaming(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[str, None]:
        """Send a prompt and yield response tokens as they arrive."""
        ...
