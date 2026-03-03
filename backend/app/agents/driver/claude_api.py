"""Claude API driver using the official Anthropic Python SDK."""

from typing import AsyncGenerator, Optional

from app.agents.driver.base_driver import BaseDriver, DriverResponse
from app.config import settings
from app.utils.logger import logger

try:
    import anthropic
except ImportError:
    anthropic = None  # type: ignore


class ClaudeAPIDriver(BaseDriver):
    """Driver that communicates with Claude via the Anthropic API."""

    # Map friendly model names to API model IDs
    MODEL_MAP = {
        "sonnet": "claude-sonnet-4-20250514",
        "opus": "claude-opus-4-20250514",
        "haiku": "claude-haiku-4-20250414",
    }

    def __init__(self):
        if anthropic is None:
            raise ImportError(
                "The 'anthropic' package is required for the API driver. "
                "Install it with: pip install anthropic"
            )
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY must be set when using the API driver."
            )

        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = self.MODEL_MAP.get(settings.CLAUDE_MODEL, settings.CLAUDE_MODEL)

    async def call(
        self,
        prompt: str,
        system: str = "",
        json_schema: Optional[dict] = None,
    ) -> DriverResponse:
        """Send a prompt and return the complete response."""
        logger.info("ClaudeAPIDriver.call: model=%s", self.model)

        if json_schema is not None:
            import json
            prompt += (
                "\n\nYou MUST return valid JSON matching this schema:\n"
                + json.dumps(json_schema, ensure_ascii=False, indent=2)
            )

        messages = [{"role": "user", "content": prompt}]
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        try:
            response = await self.client.messages.create(**kwargs)

            content = ""
            for block in response.content:
                if hasattr(block, "text"):
                    content += block.text

            return DriverResponse(
                content=content,
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
                model=response.model,
            )
        except Exception as exc:
            logger.exception("ClaudeAPIDriver.call failed")
            return DriverResponse(
                content=f"[API Error] {exc}",
                model=self.model,
            )

    async def call_streaming(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from the Anthropic API."""
        logger.info("ClaudeAPIDriver.call_streaming: model=%s", self.model)

        messages = [{"role": "user", "content": prompt}]
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as exc:
            logger.exception("ClaudeAPIDriver.call_streaming failed")
            yield f"[API Error] {exc}"
