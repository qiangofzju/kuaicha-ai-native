"""Permission and API key checks for skills runtime."""

from __future__ import annotations

from fastapi import HTTPException

from app.config import settings


class SkillPermissionService:
    """Simple permission hooks for runtime and external entrypoints."""

    def _configured_keys(self) -> set[str]:
        if not settings.SKILL_API_KEYS:
            return set()
        return {item.strip() for item in settings.SKILL_API_KEYS.split(",") if item.strip()}

    def ensure_api_key(self, x_api_key: str | None) -> None:
        """Validate API key only when switch is on."""
        if not settings.SKILL_API_KEY_ENABLED:
            return

        keys = self._configured_keys()
        if not keys:
            raise HTTPException(status_code=503, detail="Skills API key 未配置")
        if not x_api_key or x_api_key not in keys:
            raise HTTPException(status_code=401, detail="无效的 Skills API Key")


skill_permission_service = SkillPermissionService()
