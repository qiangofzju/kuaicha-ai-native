"""Risk Due Diligence Agent – the flagship agent workflow.

Performs a multi-stage risk assessment of a target company:
1. Data Collection   (0 – 25 %)
2. Smart Analysis    (25 – 50 %)
3. Report Generation (50 – 75 %)
4. Quality Check     (75 – 100 %)

Live mode uses 2 LLM calls (stages 1+2 combined, then stage 3)
to balance efficiency with structured output quality.
"""

import asyncio
import json
import os
import re
from typing import Any, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.driver import get_driver
from app.config import settings
from app.utils.logger import logger
from app.utils.mock_data import get_mock_agent_config, get_mock_agent_result


# JSON schema that exactly matches what the frontend AgentResultData expects.
# Used to instruct the LLM (via prompt or --json-schema flag) to produce
# structured output that renders directly in the frontend result tabs.
REPORT_JSON_SCHEMA = {
    "type": "object",
    "required": ["summary", "risk_rating", "risk_findings", "report_sections", "timeline"],
    "properties": {
        "summary": {
            "type": "string",
            "description": "2-3 sentence executive summary of the risk assessment"
        },
        "risk_rating": {
            "type": "string",
            "enum": ["A", "B", "C", "D", "E"],
            "description": "Overall risk rating: A=low, B=medium, C=elevated, D=high, E=critical"
        },
        "risk_findings": {
            "type": "array",
            "description": "Exactly 5 risk dimensions",
            "items": {
                "type": "object",
                "required": ["label", "level", "score", "description", "trend"],
                "properties": {
                    "label": {"type": "string", "description": "Risk category name, e.g. 司法风险"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                    "description": {"type": "string"},
                    "trend": {"type": "string", "enum": ["up", "down", "stable"]}
                }
            }
        },
        "report_sections": {
            "type": "array",
            "description": "At least 6 report chapters",
            "items": {
                "type": "object",
                "required": ["title", "content"],
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]}
                }
            }
        },
        "timeline": {
            "type": "array",
            "description": "Key events in reverse chronological order",
            "items": {
                "type": "object",
                "required": ["date", "event"],
                "properties": {
                    "date": {"type": "string", "description": "Date string, e.g. 2024-08-15"},
                    "event": {"type": "string"},
                    "type": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low", "info"]}
                }
            }
        }
    }
}


class RiskDueDiligenceAgent(BaseAgent):
    """Enterprise risk due diligence agent."""

    agent_id = "risk"
    name = "企业风控尽调"
    description = "扫描司法、信用、舆情数据，生成风险评估报告"
    color = "#EF4444"
    tags = ["风控", "尽调"]
    icon = "Shield"
    status = "ready"

    # Path to the system prompt markdown
    _prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "risk_due_diligence.md",
    )

    def _load_system_prompt(self) -> str:
        """Load the system prompt from the markdown file."""
        try:
            with open(self._prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("System prompt not found at %s", self._prompt_path)
            return "你是一个专业的企业风控尽调分析师。请对目标企业进行全面的风险评估。"

    def get_config_schema(self) -> dict:
        """Return the configuration schema for the risk agent."""
        return get_mock_agent_config(self.agent_id)

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Run the 4-stage risk due diligence pipeline."""

        target = agent_input.target
        logger.info("RiskDueDiligenceAgent: starting for target=%s", target)

        if settings.USE_MOCK_DATA:
            return await self._execute_mock(target, on_progress)

        return await self._execute_live(agent_input, on_progress)

    # ------------------------------------------------------------------
    # Mock execution path
    # ------------------------------------------------------------------

    async def _execute_mock(
        self,
        target: str,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Simulate the pipeline with mock data and delays."""

        # Stage names and progress ranges align with frontend STAGES:
        # 0-24%: 数据采集, 25-49%: 智能分析, 50-74%: 报告生成, 75-100%: 质量校验
        stages = [
            ("数据采集", 0.0, 0.24, "正在采集司法、工商、舆情等多维度数据...", 1.5),
            ("智能分析", 0.25, 0.49, "正在运行风险评估模型，分析关联关系...", 2.0),
            ("报告生成", 0.50, 0.74, "正在生成结构化风险评估报告...", 1.5),
            ("质量校验", 0.75, 1.0, "正在进行报告质量审查和数据校验...", 1.0),
        ]

        for stage_name, start, end, message, duration in stages:
            if on_progress:
                await on_progress(AgentProgress(
                    stage=stage_name,
                    progress=start,
                    message=message,
                ))

            # Simulate incremental progress within the stage
            steps = 5
            for i in range(1, steps + 1):
                await asyncio.sleep(duration / steps)
                progress = start + (end - start) * (i / steps)
                if on_progress:
                    await on_progress(AgentProgress(
                        stage=stage_name,
                        progress=round(progress, 2),
                        message=message,
                    ))

        # Build the result from mock data
        mock_result = get_mock_agent_result(self.agent_id, target)

        return AgentResult(
            summary=mock_result["summary"],
            report={
                "risk_rating": mock_result["risk_rating"],
                "risk_findings": mock_result["risk_findings"],
                "report_sections": mock_result["report_sections"],
                "timeline": mock_result["timeline"],
            },
            metadata=mock_result["metadata"],
        )

    # ------------------------------------------------------------------
    # Live execution path (CLI or API driver)
    # ------------------------------------------------------------------

    async def _execute_live(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Run the pipeline using the configured LLM driver.

        Uses 2 LLM calls for efficiency:
        - Call 1 (streaming): Data collection + analysis – text streamed to frontend
        - Call 2 (non-streaming): Structured JSON report generation
        """

        driver = get_driver()
        system_prompt = self._load_system_prompt()
        target = agent_input.target

        # ── Stage 1+2: Streaming Data Collection & Analysis ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="数据采集",
                progress=0.02,
                message=f"正在采集并分析 {target} 的公开数据...",
            ))

        analysis_prompt = (
            f"请对企业「{target}」进行全面的风控尽调分析。\n\n"
            f"请从以下五个维度评估，每个维度给出风险等级(high/medium/low)、"
            f"百分制评分(0-100)和趋势(up/down/stable)：\n"
            f"1. 司法风险 - 涉诉案件、执行案件、失信情况\n"
            f"2. 监管合规 - 行政处罚、监管问询、资质合规\n"
            f"3. 舆情风险 - 负面舆情数量、热点话题、传播影响力\n"
            f"4. 经营风险 - 营收利润趋势、资产负债、现金流\n"
            f"5. 关联风险 - 子公司风险、关联交易、实控人变更\n\n"
            f"请详细分析每个维度，列出具体的风险发现和关键事件时间线。"
        )

        # Stream analysis output – chunks are pushed to frontend in real-time.
        # If streaming fails (e.g. CLI doesn't support stream-json), fall back
        # to a non-streaming call and simulate chunk delivery.
        accumulated = ""
        chunk_count = 0

        try:
            async for chunk in driver.call_streaming(analysis_prompt, system=system_prompt):  # type: ignore[reportGeneralTypeIssues]
                normalized = (chunk or "").strip()
                if not normalized:
                    continue

                # Driver-level stream error text: keep it out of frontend stream panel,
                # then fallback to non-streaming call below.
                if normalized.startswith("[Error]") or normalized.startswith("[CLI Error]"):
                    logger.warning("Streaming returned error chunk, fallback to call(): %s", normalized[:200])
                    accumulated = ""
                    break

                accumulated += chunk
                chunk_count += 1

                # Push stream chunk to frontend via WebSocket
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="数据采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": chunk},
                    ))

                # Periodically push progress bar updates (every 25 chunks)
                if chunk_count % 25 == 0 and on_progress:
                    prog = min(0.02 + chunk_count * 0.003, 0.45)
                    stage = "数据采集" if prog < 0.25 else "智能分析"
                    await on_progress(AgentProgress(
                        stage=stage,
                        progress=prog,
                        message="正在分析中...",
                    ))
        except Exception as exc:
            logger.warning("Streaming failed, will fall back to call(): %s", exc)
            accumulated = ""

        # ── Fallback: non-streaming call if streaming produced nothing usable ──
        if not accumulated or accumulated.startswith("[Error]"):
            logger.info("Falling back to non-streaming driver.call() for analysis")
            if on_progress:
                await on_progress(AgentProgress(
                    stage="数据采集",
                    progress=0.05,
                    message=f"正在分析 {target}（非流式模式）...",
                ))

            resp = await driver.call(analysis_prompt, system=system_prompt)
            accumulated = resp.content

            if accumulated.startswith("[Error]") or accumulated.startswith("[CLI Error]"):
                raise RuntimeError(f"Analysis call failed: {accumulated[:300]}")

            # Simulate streaming by sending result in chunks so frontend shows text
            chunk_size = 80
            for i in range(0, len(accumulated), chunk_size):
                text_chunk = accumulated[i : i + chunk_size]
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="数据采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": text_chunk},
                    ))
                    await asyncio.sleep(0.03)  # Brief pause for smooth UI rendering

        # Mark stages 1 & 2 done
        if on_progress:
            await on_progress(AgentProgress(
                stage="数据采集",
                progress=0.24,
                message="数据采集完成",
            ))
            await on_progress(AgentProgress(
                stage="智能分析",
                progress=0.49,
                message="风险分析完成",
            ))

        # ── Stage 3: Structured JSON Report Generation ──
        # Use a focused JSON-only system prompt (not the full risk prompt)
        # and do NOT use --json-schema (GLM models don't support it well)

        if on_progress:
            await on_progress(AgentProgress(
                stage="报告生成",
                progress=0.52,
                message="正在生成结构化尽调报告...",
            ))

        json_system = (
            "你是一个数据格式转换工具。你只输出合法的JSON对象，"
            "不输出任何解释文字、markdown标记或代码块包裹。"
        )

        report_prompt = (
            f"将以下「{target}」的风险分析转换为JSON对象。\n\n"
            f"分析内容：\n{accumulated[:8000]}\n\n"
            f"请直接输出JSON对象，格式如下（不要用```包裹）：\n"
            f'{{"summary":"2-3句风险评估摘要",'
            f'"risk_rating":"A或B或C或D或E",'
            f'"risk_findings":['
            f'{{"label":"司法风险","level":"high或medium或low","score":0到100,"description":"一句话描述","trend":"up或down或stable"}},'
            f'...共5个维度（司法风险/监管合规/舆情风险/经营风险/关联风险）],'
            f'"report_sections":['
            f'{{"title":"章节标题","content":"详细内容","level":"high或medium或low"}},'
            f'...至少6个章节],'
            f'"timeline":['
            f'{{"date":"2024-01-15","event":"事件描述","type":"legal或regulatory或financial或reputation","level":"high或medium或low或info"}},'
            f'...5到10个事件，按时间倒序]}}\n\n'
            f"所有内容使用中文。"
        )

        # No json_schema – rely on prompt engineering for GLM compatibility
        report_resp = await driver.call(report_prompt, system=json_system)

        if report_resp.content.startswith("[Error]") or report_resp.content.startswith("[CLI Error]"):
            raise RuntimeError(f"Report generation failed: {report_resp.content}")

        if on_progress:
            await on_progress(AgentProgress(
                stage="报告生成",
                progress=0.74,
                message="报告生成完成",
            ))

        # ── Stage 4: Quality Check – parse and validate ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="质量校验",
                progress=0.77,
                message="正在解析和校验报告数据...",
            ))

        report_data = self._parse_report_response(report_resp.content, target)

        if on_progress:
            await on_progress(AgentProgress(
                stage="质量校验",
                progress=1.0,
                message="质量审查通过",
            ))

        return AgentResult(
            summary=report_data["summary"],
            report={
                "risk_rating": report_data["risk_rating"],
                "risk_findings": report_data["risk_findings"],
                "report_sections": report_data["report_sections"],
                "timeline": report_data["timeline"],
            },
            metadata={
                "agent_id": self.agent_id,
                "target": target,
                "model": report_resp.model,
                "usage": report_resp.usage,
            },
        )

    # ------------------------------------------------------------------
    # Response parsing
    # ------------------------------------------------------------------

    def _parse_report_response(self, content: str, target: str) -> dict:
        """Parse Claude's report response into the structured format.

        Uses a multi-layer strategy:
        1. Direct JSON parse
        2. Extract from markdown code fences
        3. Find first { to last } substring
        4. Fallback to minimal valid structure
        """
        # Layer 1: Direct parse
        try:
            data = json.loads(content)
            return self._validate_report(data, target)
        except (json.JSONDecodeError, ValueError):
            pass

        # Layer 2: Extract from markdown code fences ```json ... ```
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 3: Find outermost { ... }
        first_brace = content.find("{")
        last_brace = content.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                data = json.loads(content[first_brace : last_brace + 1])
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 4: Fallback
        logger.warning("Failed to parse report JSON for %s, using fallback", target)
        return self._build_fallback_report(content, target)

    def _validate_report(self, data: dict, target: str) -> dict:
        """Normalize and validate the parsed report data."""
        validated: dict[str, Any] = {
            "summary": data.get("summary", f"{target} 风控尽调报告"),
            "risk_rating": data.get("risk_rating", "B"),
            "risk_findings": [],
            "report_sections": [],
            "timeline": [],
        }

        # Ensure risk_rating is valid
        if validated["risk_rating"] not in ("A", "B", "C", "D", "E"):
            validated["risk_rating"] = "B"

        # Normalize risk_findings – handle both "label" and "category" field names
        for finding in data.get("risk_findings", []):
            validated["risk_findings"].append({
                "label": finding.get("label") or finding.get("category", "未知"),
                "level": finding.get("level", "medium"),
                "score": finding.get("score", 50),
                "description": finding.get("description", ""),
                "trend": finding.get("trend", "stable"),
            })

        # Normalize report_sections
        for section in data.get("report_sections", []):
            validated["report_sections"].append({
                "title": section.get("title", ""),
                "content": section.get("content", ""),
                "level": section.get("level") or section.get("risk_level"),
            })

        # Normalize timeline
        for item in data.get("timeline", []):
            validated["timeline"].append({
                "date": item.get("date", ""),
                "event": item.get("event", ""),
                "type": item.get("type", "info"),
                "level": item.get("level", "info"),
            })

        return validated

    def _build_fallback_report(self, raw_content: str, target: str) -> dict:
        """Build a minimal valid report when JSON parsing completely fails."""
        return {
            "summary": f"{target} 风控评估已完成。由于数据解析异常，报告内容以原始文本形式呈现。",
            "risk_rating": "B",
            "risk_findings": [
                {
                    "label": "综合评估",
                    "level": "medium",
                    "score": 50,
                    "description": "报告数据解析异常，请查看原始报告内容。",
                    "trend": "stable",
                }
            ],
            "report_sections": [
                {
                    "title": "原始分析报告",
                    "content": raw_content[:5000],
                    "level": None,
                }
            ],
            "timeline": [],
        }
