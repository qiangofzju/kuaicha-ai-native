"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env files."""

    APP_NAME: str = "快查 AI"
    DEBUG: bool = True
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    # Agent driver: "mock", "cli", or "api"
    AGENT_DRIVER: str = "mock"

    # CLI binary name
    CLAUDE_CLI_BINARY: str = "claude"

    # Custom config dir for CLI (e.g. ~/.claude-glm for GLM model)
    CLAUDE_CONFIG_DIR: str = ""

    # Claude model configuration
    CLAUDE_MODEL: str = "sonnet"

    # Anthropic API key (required for api driver)
    ANTHROPIC_API_KEY: str = ""

    # CLI subprocess timeout in seconds
    CLI_TIMEOUT: int = 120

    # Use mock data for responses
    USE_MOCK_DATA: bool = True

    # Skills API key gate (reserved for external invoke)
    SKILL_API_KEY_ENABLED: bool = False
    SKILL_API_KEYS: str = ""

    # Workspace root directory (empty = default: project_root/data/workspaces)
    WORKSPACE_ROOT: str = ""

    class Config:
        env_file = (
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local"),
            ".env.local",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local"),
        )
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
