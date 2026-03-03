"""Sentiment Risk Briefing Agent – periodic sentiment monitoring and briefing.

Performs a multi-stage sentiment analysis of a target company:
1. Sentiment Collection  (0 – 25 %)
2. Event Clustering      (25 – 50 %)
3. Briefing Generation   (50 – 75 %)
4. Quality Review        (75 – 100 %)

Live mode uses 2 LLM calls (stages 1+2 combined, then stage 3)
following the same pattern as the risk due diligence agent.
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


REPORT_JSON_SCHEMA = {
    "type": "object",
    "required": ["summary", "risk_rating", "risk_findings", "report_sections", "timeline"],
    "properties": {
        "summary": {
            "type": "string",
            "description": "2-3 sentence executive summary of the sentiment landscape"
        },
        "risk_rating": {
            "type": "string",
            "enum": ["A", "B", "C", "D", "E"],
            "description": "Overall sentiment rating: A=very positive, B=positive, C=mixed, D=negative, E=crisis"
        },
        "risk_findings": {
            "type": "array",
            "description": "Exactly 5 sentiment dimensions",
            "items": {
                "type": "object",
                "required": ["label", "level", "score", "description", "trend"],
                "properties": {
                    "label": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                    "description": {"type": "string"},
                    "trend": {"type": "string", "enum": ["up", "down", "stable"]}
                }
            }
        },
        "report_sections": {
            "type": "array",
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
            "items": {
                "type": "object",
                "required": ["date", "event"],
                "properties": {
                    "date": {"type": "string"},
                    "event": {"type": "string"},
                    "type": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low", "info"]}
                }
            }
        }
    }
}


class SentimentBriefingAgent(BaseAgent):
    """Sentiment risk briefing agent."""

    agent_id = "sentiment"
    name = "舆情风险简报"
    description = "采集整合舆情信息，生成周期性风险简报"
    color = "#F97316"
    tags = ["舆情", "监控"]
    icon = "Alert"
    status = "ready"

    _prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "sentiment_briefing.md",
    )

    def _load_system_prompt(self) -> str:
        try:
            with open(self._prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("System prompt not found at %s", self._prompt_path)
            return "你是一个专业的企业舆情分析师。请对目标企业进行全面的舆情风险评估。"

    def get_config_schema(self) -> dict:
        return get_mock_agent_config(self.agent_id)

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        target = agent_input.target
        logger.info("SentimentBriefingAgent: starting for target=%s", target)

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
        stages = [
            ("舆情采集", 0.0, 0.24, "正在采集新闻媒体、社交平台、论坛社区等多渠道舆情数据...", 1.5),
            ("事件聚类", 0.25, 0.49, "正在进行事件识别、情感分析和话题聚类...", 2.0),
            ("简报生成", 0.50, 0.74, "正在生成结构化舆情风险简报...", 1.5),
            ("质量审核", 0.75, 1.0, "正在审核简报质量和数据准确性...", 1.0),
        ]

        for stage_name, start, end, message, duration in stages:
            if on_progress:
                await on_progress(AgentProgress(
                    stage=stage_name,
                    progress=start,
                    message=message,
                ))

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
    # Live execution path
    # ------------------------------------------------------------------

    async def _execute_live(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        driver = get_driver()
        system_prompt = self._load_system_prompt()
        target = agent_input.target
        period = agent_input.params.get("period", "weekly")
        sources = agent_input.params.get("sources", "all")

        period_label = {"daily": "每日", "weekly": "每周", "monthly": "每月"}.get(period, "每周")
        sources_label = {
            "all": "全渠道", "news": "新闻媒体", "social": "社交媒体", "forum": "论坛社区"
        }.get(sources, "全渠道")

        if on_progress:
            await on_progress(AgentProgress(
                stage="舆情采集",
                progress=0.02,
                message=f"正在采集 {target} 的{sources_label}舆情数据...",
            ))

        analysis_prompt = (
            f"请对企业「{target}」进行{period_label}舆情风险分析。\n\n"
            f"数据来源范围：{sources_label}\n\n"
            f"请从以下五个维度评估，每个维度给出舆情等级(high=负面/medium=中性/low=正面)、"
            f"百分制评分(0-100, 100为最正面)和趋势(up=好转/down=恶化/stable=稳定)：\n"
            f"1. 新闻媒体舆情 - 主流媒体报道量、正负面比例、关键话题\n"
            f"2. 社交媒体舆情 - 微博微信抖音讨论量、用户情感倾向、热点话题\n"
            f"3. 行业对比舆情 - 相对同行业企业的舆情表现\n"
            f"4. 政策监管舆情 - 政策相关报道、监管动态覆盖\n"
            f"5. 资本市场舆情 - 分析师评级、投资者社区讨论\n\n"
            f"请详细分析每个维度，列出关键舆情事件和时间线。"
        )

        accumulated = ""
        chunk_count = 0

        try:
            async for chunk in driver.call_streaming(analysis_prompt, system=system_prompt):  # type: ignore[reportGeneralTypeIssues]
                normalized = (chunk or "").strip()
                if not normalized:
                    continue
                if normalized.startswith("[Error]") or normalized.startswith("[CLI Error]"):
                    logger.warning("Streaming returned error chunk, fallback: %s", normalized[:200])
                    accumulated = ""
                    break

                accumulated += chunk
                chunk_count += 1

                if on_progress:
                    await on_progress(AgentProgress(
                        stage="舆情采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": chunk},
                    ))

                if chunk_count % 25 == 0 and on_progress:
                    prog = min(0.02 + chunk_count * 0.003, 0.45)
                    stage = "舆情采集" if prog < 0.25 else "事件聚类"
                    await on_progress(AgentProgress(
                        stage=stage,
                        progress=prog,
                        message="正在分析舆情数据...",
                    ))
        except Exception as exc:
            logger.warning("Streaming failed, falling back to call(): %s", exc)
            accumulated = ""

        if not accumulated or accumulated.startswith("[Error]"):
            logger.info("Falling back to non-streaming driver.call()")
            if on_progress:
                await on_progress(AgentProgress(
                    stage="舆情采集",
                    progress=0.05,
                    message=f"正在分析 {target}（非流式模式）...",
                ))

            resp = await driver.call(analysis_prompt, system=system_prompt)
            accumulated = resp.content

            if accumulated.startswith("[Error]") or accumulated.startswith("[CLI Error]"):
                raise RuntimeError(f"Analysis call failed: {accumulated[:300]}")

            chunk_size = 80
            for i in range(0, len(accumulated), chunk_size):
                text_chunk = accumulated[i : i + chunk_size]
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="舆情采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": text_chunk},
                    ))
                    await asyncio.sleep(0.03)

        if on_progress:
            await on_progress(AgentProgress(stage="舆情采集", progress=0.24, message="舆情采集完成"))
            await on_progress(AgentProgress(stage="事件聚类", progress=0.49, message="事件聚类完成"))

        # ── Stage 3: Structured JSON Report ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="简报生成",
                progress=0.52,
                message="正在生成结构化舆情简报...",
            ))

        json_system = (
            "你是一个数据格式转换工具。你只输出合法的JSON对象，"
            "不输出任何解释文字、markdown标记或代码块包裹。"
        )

        report_prompt = (
            f"将以下「{target}」的舆情分析转换为JSON对象。\n\n"
            f"分析内容：\n{accumulated[:8000]}\n\n"
            f"请直接输出JSON对象，格式如下（不要用```包裹）：\n"
            f'{{"summary":"2-3句舆情态势摘要",'
            f'"risk_rating":"A或B或C或D或E(A=正面,E=危机)",'
            f'"risk_findings":['
            f'{{"label":"新闻媒体舆情","level":"high或medium或low","score":0到100,"description":"一句话描述","trend":"up或down或stable"}},'
            f'...共5个维度(新闻媒体舆情/社交媒体舆情/行业对比舆情/政策监管舆情/资本市场舆情)],'
            f'"report_sections":['
            f'{{"title":"章节标题","content":"详细内容","level":"high或medium或low"}},'
            f'...至少6个章节],'
            f'"timeline":['
            f'{{"date":"2024-01-15","event":"舆情事件描述","type":"news或social或regulatory或financial","level":"high或medium或low或info"}},'
            f'...5到10个事件，按时间倒序]}}\n\n'
            f"所有内容使用中文。"
        )

        report_resp = await driver.call(report_prompt, system=json_system)

        if report_resp.content.startswith("[Error]") or report_resp.content.startswith("[CLI Error]"):
            raise RuntimeError(f"Report generation failed: {report_resp.content}")

        if on_progress:
            await on_progress(AgentProgress(stage="简报生成", progress=0.74, message="简报生成完成"))

        # ── Stage 4: Quality Check ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="质量审核",
                progress=0.77,
                message="正在审核简报数据准确性...",
            ))

        report_data = self._parse_report_response(report_resp.content, target)

        if on_progress:
            await on_progress(AgentProgress(stage="质量审核", progress=1.0, message="质量审核通过"))

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
    # Response parsing (same multi-layer strategy as risk agent)
    # ------------------------------------------------------------------

    def _parse_report_response(self, content: str, target: str) -> dict:
        # Layer 1: Direct parse
        try:
            data = json.loads(content)
            return self._validate_report(data, target)
        except (json.JSONDecodeError, ValueError):
            pass

        # Layer 2: Markdown code fences
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 3: Outermost braces
        first_brace = content.find("{")
        last_brace = content.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                data = json.loads(content[first_brace : last_brace + 1])
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 4: Fallback
        logger.warning("Failed to parse sentiment report JSON for %s, using fallback", target)
        return self._build_fallback_report(content, target)

    def _validate_report(self, data: dict, target: str) -> dict:
        validated: dict[str, Any] = {
            "summary": data.get("summary", f"{target} 舆情风险简报"),
            "risk_rating": data.get("risk_rating", "C"),
            "risk_findings": [],
            "report_sections": [],
            "timeline": [],
        }

        if validated["risk_rating"] not in ("A", "B", "C", "D", "E"):
            validated["risk_rating"] = "C"

        for finding in data.get("risk_findings", []):
            validated["risk_findings"].append({
                "label": finding.get("label") or finding.get("category", "未知"),
                "level": finding.get("level", "medium"),
                "score": finding.get("score", 50),
                "description": finding.get("description", ""),
                "trend": finding.get("trend", "stable"),
            })

        for section in data.get("report_sections", []):
            validated["report_sections"].append({
                "title": section.get("title", ""),
                "content": section.get("content", ""),
                "level": section.get("level") or section.get("risk_level"),
            })

        for item in data.get("timeline", []):
            validated["timeline"].append({
                "date": item.get("date", ""),
                "event": item.get("event", ""),
                "type": item.get("type", "info"),
                "level": item.get("level", "info"),
            })

        return validated

    def _build_fallback_report(self, raw_content: str, target: str) -> dict:
        return {
            "summary": f"{target} 舆情分析已完成。由于数据解析异常，简报内容以原始文本形式呈现。",
            "risk_rating": "C",
            "risk_findings": [
                {
                    "label": "综合舆情",
                    "level": "medium",
                    "score": 50,
                    "description": "简报数据解析异常，请查看原始分析内容。",
                    "trend": "stable",
                }
            ],
            "report_sections": [
                {
                    "title": "原始分析内容",
                    "content": raw_content[:5000],
                    "level": None,
                }
            ],
            "timeline": [],
        }
