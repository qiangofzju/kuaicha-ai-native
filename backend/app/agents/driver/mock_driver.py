"""Mock driver that returns pre-built responses with simulated delays."""

import asyncio
from typing import AsyncGenerator, Optional

from app.agents.driver.base_driver import BaseDriver, DriverResponse


class MockDriver(BaseDriver):
    """A mock LLM driver for development and testing.

    Returns realistic-looking responses after a short delay to simulate
    network and inference latency.
    """

    async def call(
        self, prompt: str, system: str = "", json_schema: Optional[dict] = None
    ) -> DriverResponse:
        """Return a pre-built response after simulating processing time."""
        await asyncio.sleep(0.5)

        content = (
            f"[Mock Response]\n\n"
            f"已收到您的查询请求。以下是基于模拟数据的分析结果：\n\n"
            f"1. 数据采集完成，共获取 1,247 条相关记录\n"
            f"2. 风险评估模型已运行，综合评分 72/100\n"
            f"3. 识别出 3 个主要风险点和 2 个关注事项\n\n"
            f"建议进一步查看详细报告获取完整信息。"
        )

        return DriverResponse(
            content=content,
            usage={"input_tokens": 150, "output_tokens": 200},
            model="mock-v1",
        )

    async def call_streaming(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[str, None]:
        """Yield pre-built response tokens with simulated delays."""
        sentences = [
            "[Mock Streaming Response]\n\n",
            "正在分析您的查询...\n",
            "数据采集完成，共获取 1,247 条相关记录。\n",
            "风险评估模型已运行，综合评分 72/100。\n",
            "识别出 3 个主要风险点和 2 个关注事项。\n\n",
            "建议进一步查看详细报告获取完整信息。",
        ]

        for sentence in sentences:
            await asyncio.sleep(0.3)
            yield sentence
