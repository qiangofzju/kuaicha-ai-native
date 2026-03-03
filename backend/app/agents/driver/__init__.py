"""Driver factory – returns the appropriate LLM driver based on settings."""

from app.agents.driver.base_driver import BaseDriver
from app.config import settings


def get_driver() -> BaseDriver:
    """Instantiate and return the configured driver."""
    driver_type = settings.AGENT_DRIVER.lower()

    if driver_type == "cli":
        from app.agents.driver.claude_cli import ClaudeCodeCLIDriver
        return ClaudeCodeCLIDriver()
    elif driver_type == "api":
        from app.agents.driver.claude_api import ClaudeAPIDriver
        return ClaudeAPIDriver()
    else:
        from app.agents.driver.mock_driver import MockDriver
        return MockDriver()
