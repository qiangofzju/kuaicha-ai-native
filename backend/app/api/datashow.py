"""Data visualization API routes."""

from fastapi import APIRouter
from typing import Optional

from app.schemas.datashow import (
    OverviewResponse,
    NLQueryRequest,
    NLChartResponse,
    GraphResponse,
)
from app.services.datashow_service import datashow_service

datashow_router = APIRouter(prefix="/datashow", tags=["datashow"])


@datashow_router.get("/overview", response_model=OverviewResponse)
async def get_overview():
    """Return the full dashboard overview data.

    Includes KPI cards, risk trends, industry distribution,
    recent alerts, and AI-generated insights.
    """
    return datashow_service.get_overview()


@datashow_router.post("/nl-query", response_model=NLChartResponse)
async def nl_query(req: NLQueryRequest):
    """Convert a natural-language query to an ECharts chart configuration.

    The returned ``echarts_option`` can be passed directly to ReactECharts.
    """
    return datashow_service.nl_query(req.query)


@datashow_router.get("/graph/{company}", response_model=GraphResponse)
async def get_graph(company: str):
    """Return relationship graph data for a company.

    Returns nodes, edges, and category list for ECharts graph rendering.
    """
    return datashow_service.get_graph(company)


@datashow_router.get("/trends")
async def get_trends(companies: Optional[str] = None):
    """Return trend comparison data for multiple companies.

    Pass company names as comma-separated query param, e.g. ?companies=同花顺,东方财富
    """
    company_list = [c.strip() for c in companies.split(",")] if companies else None
    return datashow_service.get_trends(company_list)
