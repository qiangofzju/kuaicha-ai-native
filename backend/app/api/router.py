"""Central API router – aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.agent import agent_router
from app.api.chat import chat_router
from app.api.datashow import datashow_router
from app.api.skill import skill_router
from app.api.workspace import workspace_router

api_router = APIRouter()

api_router.include_router(chat_router)
api_router.include_router(agent_router)
api_router.include_router(datashow_router)
api_router.include_router(skill_router)
api_router.include_router(workspace_router)
