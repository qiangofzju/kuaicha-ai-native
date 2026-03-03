"""Data visualization / dashboard schemas."""

from pydantic import BaseModel
from typing import Optional


class OverviewCard(BaseModel):
    label: str
    value: str
    change: str
    trend_up: Optional[bool]
    color: str
    trend_data: list[float]


class RiskTrendBar(BaseModel):
    month: str
    high: int
    medium: int
    low: int


class IndustrySegment(BaseModel):
    label: str
    value: int
    color: str
    percentage: str


class AlertItem(BaseModel):
    company: str
    event: str
    time: str
    level: str


class InsightItem(BaseModel):
    icon: str
    title: str
    description: str
    type: str


class OverviewResponse(BaseModel):
    cards: list[OverviewCard]
    risk_trend: list[RiskTrendBar]
    industry_distribution: list[IndustrySegment]
    alerts: list[AlertItem]
    insights: list[InsightItem]


# ---------------------------------------------------------------------------
# NL Query → Chart
# ---------------------------------------------------------------------------

class NLQueryRequest(BaseModel):
    query: str


class NLChartResponse(BaseModel):
    chart_type: str  # bar / line / pie / radar / scatter
    title: str
    description: str
    echarts_option: dict  # Full ECharts option, directly renderable


# ---------------------------------------------------------------------------
# Relationship Graph
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    id: str
    name: str
    category: str
    value: Optional[float] = None
    symbol_size: float = 30


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    value: Optional[float] = None


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    categories: list[str]
