"""Data visualization service – returns dashboard overview data."""

from typing import Optional

from app.utils.mock_data import (
    get_mock_overview,
    get_mock_nl_chart,
    get_mock_company_graph,
    get_mock_trends,
)


class DatashowService:
    """Service for dashboard and data visualization endpoints."""

    def get_overview(self) -> dict:
        """Return the full dashboard overview data."""
        return get_mock_overview()

    def nl_query(self, query: str) -> dict:
        """Convert a natural-language query to an ECharts config."""
        return get_mock_nl_chart(query)

    def get_graph(self, company: str) -> dict:
        """Return relationship graph data for a company."""
        return get_mock_company_graph(company)

    def get_trends(self, companies: Optional[list[str]] = None) -> dict:
        """Return trend comparison data for multiple companies."""
        return get_mock_trends(companies)


# Module-level singleton
datashow_service = DatashowService()
