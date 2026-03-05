"""Skill API routes – marketplace, manifest and runtime."""

from __future__ import annotations

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import Response

from app.schemas.skill import (
    ExecuteSkillRequest,
    PurchaseRecord,
    SkillCatalogItem,
    SkillConfigSchema,
    SkillCreateRequest,
    SkillCreateResponse,
    SkillDefinition,
    SkillManifestResponse,
    SkillResultResponse,
    SkillRunCancelResponse,
    SkillRunCreateRequest,
    SkillRunCreateResponse,
    SkillRunResultResponse,
    SkillRunStatusResponse,
    SkillStoreResponse,
    SkillTaskStatusResponse,
)
from app.services.skill_service import SkillComingSoonError, skill_service
from app.skills_core.permissions import skill_permission_service


skill_router = APIRouter(prefix="/skills", tags=["skills"])


def _check_skill_api_key(x_api_key: str | None) -> None:
    skill_permission_service.ensure_api_key(x_api_key)


async def _export_by_run(run_id: str, fmt: str):
    result = skill_service.get_run_result(run_id)
    if result is None:
        status = skill_service.get_run_status(run_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Run not found")
        raise HTTPException(status_code=202, detail=f"Run is still {status['status']}")

    skill_type = result.get("skill_type", "batch")

    if fmt == "pdf":
        try:
            from app.services.export_service import generate_pdf
        except ModuleNotFoundError as exc:
            missing = exc.name or "unknown"
            raise HTTPException(
                status_code=503,
                detail=(
                    f"PDF export dependency missing: {missing}. "
                    "Please run: pip install -r backend/requirements.txt"
                ),
            )
        content = generate_pdf(result, str(skill_type))
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=skill_report_{run_id[:8]}.pdf"},
        )

    if fmt == "excel":
        try:
            if skill_type == "batch":
                from app.services.batch_export import generate_batch_excel

                content = generate_batch_excel(result, str(skill_type))
                filename = f"skill_batch_result_{run_id[:8]}.xlsx"
            else:
                from app.services.export_service import generate_excel

                content = generate_excel(result, str(skill_type))
                filename = f"skill_report_{run_id[:8]}.xlsx"
        except ModuleNotFoundError as exc:
            if skill_type == "batch":
                from app.services.batch_export import generate_batch_csv

                csv_content = generate_batch_csv(result)
                filename = f"skill_batch_result_{run_id[:8]}.csv"
                return Response(
                    content=csv_content,
                    media_type="text/csv; charset=utf-8",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}",
                        "X-Export-Fallback": "csv",
                    },
                )
            missing = exc.name or "unknown"
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Excel export dependency missing: {missing}. "
                    "Please run: pip install -r backend/requirements.txt"
                ),
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Excel export failed: {exc}")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    raise HTTPException(status_code=400, detail="Unsupported format. Use 'pdf' or 'excel'.")


@skill_router.get("/list", response_model=list[SkillDefinition])
async def list_skills():
    return skill_service.list_skills()


@skill_router.get("/store", response_model=SkillStoreResponse)
async def get_skill_store():
    return skill_service.get_store()


@skill_router.get("/mine", response_model=list[SkillDefinition])
async def get_my_skills():
    return skill_service.get_my_skills()


@skill_router.get("/purchase-records", response_model=list[PurchaseRecord])
async def get_purchase_records():
    return skill_service.get_purchase_records()


@skill_router.post("/create", response_model=SkillCreateResponse)
async def create_skill(req: SkillCreateRequest):
    return skill_service.create_skill(req.model_dump())


@skill_router.get("/catalog", response_model=list[SkillCatalogItem])
async def get_catalog(x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    return skill_service.get_catalog()


@skill_router.get("/{skill_id}/manifest", response_model=SkillManifestResponse)
async def get_manifest(skill_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    manifest = skill_service.get_manifest(skill_id)
    if manifest is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    return manifest


@skill_router.get("/{skill_id}/schema", response_model=SkillConfigSchema)
async def get_skill_schema(skill_id: str):
    config = skill_service.get_skill_config(skill_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    return config


@skill_router.post("/runs", response_model=SkillRunCreateResponse)
async def create_run(
    req: SkillRunCreateRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    _check_skill_api_key(x_api_key)
    run = await skill_service.create_run(skill_id=req.skill_id, input_payload=req.input, context=req.context)
    return {
        "run_id": run["run_id"],
        "skill_id": run["skill_id"],
        "status": run["status"],
    }


@skill_router.get("/runs/{run_id}", response_model=SkillRunStatusResponse)
async def get_run_status(run_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    status = skill_service.get_run_status(run_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return status


@skill_router.get("/runs/{run_id}/result", response_model=SkillRunResultResponse)
async def get_run_result(run_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    result = skill_service.get_run_result(run_id)
    if result is None:
        status = skill_service.get_run_status(run_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Run not found")
        raise HTTPException(status_code=202, detail=f"Run is still {status['status']}")
    return result


@skill_router.post("/runs/{run_id}/cancel", response_model=SkillRunCancelResponse)
async def cancel_run(run_id: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    success = await skill_service.cancel_run(run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Run not found or not cancellable")
    return {"run_id": run_id, "status": "cancelled"}


@skill_router.get("/runs/{run_id}/export/{fmt}")
async def export_run_result(run_id: str, fmt: str, x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    _check_skill_api_key(x_api_key)
    return await _export_by_run(run_id, fmt)


@skill_router.post("/{skill_id}/execute")
async def execute_skill(skill_id: str, req: ExecuteSkillRequest):
    try:
        task_id = await skill_service.execute_skill(
            skill_id=skill_id,
            target=req.target,
            params=req.params,
        )
    except SkillComingSoonError:
        raise HTTPException(status_code=409, detail="技能即将上线，暂不支持执行")

    if task_id is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    return {"task_id": task_id, "skill_id": skill_id, "status": "pending"}


@skill_router.get("/tasks/{task_id}", response_model=SkillTaskStatusResponse)
async def get_task_status(task_id: str):
    status = skill_service.get_task_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return status


@skill_router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    success = await skill_service.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or not cancellable")
    return {"task_id": task_id, "status": "cancelled"}


@skill_router.get("/tasks/{task_id}/result", response_model=SkillResultResponse)
async def get_task_result(task_id: str):
    result = skill_service.get_task_result(task_id)
    if result is None:
        status = skill_service.get_task_status(task_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Task not found")
        raise HTTPException(status_code=202, detail=f"Task is still {status['status']}")
    return result


@skill_router.get("/tasks/{task_id}/export/{fmt}")
async def export_task_result(task_id: str, fmt: str):
    return await _export_by_run(task_id, fmt)


@skill_router.post("/batch/upload-companies")
async def upload_company_list(file: UploadFile = File(...)):
    filename = file.filename or ""
    content = await file.read()
    try:
        companies = skill_service.parse_company_list(filename=filename, content=content)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"文件解析失败: {exc}")
    return {"companies": companies, "count": len(companies), "filename": filename}
