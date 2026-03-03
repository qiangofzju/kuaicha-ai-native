"""Agent API routes – catalogue, execution, and task management."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response

from app.schemas.agent import (
    AgentConfigSchema,
    AgentDefinition,
    AgentResultResponse,
    ExecuteAgentRequest,
    TaskStatusResponse,
)
from app.services.agent_service import agent_service

agent_router = APIRouter(prefix="/agent", tags=["agent"])


@agent_router.get("/list", response_model=list[AgentDefinition])
async def list_agents():
    """Return the catalogue of available AI agents."""
    return agent_service.list_agents()


@agent_router.get("/{agent_id}/schema", response_model=AgentConfigSchema)
async def get_agent_schema(agent_id: str):
    """Return the configuration schema for a specific agent."""
    config = agent_service.get_agent_config(agent_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return config


@agent_router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, req: ExecuteAgentRequest):
    """Start agent execution and return a task ID.

    The caller should poll ``GET /tasks/{task_id}`` or connect to
    ``ws://host/ws/agent/{task_id}`` for real-time progress updates.
    """
    task_id = await agent_service.execute_agent(
        agent_id=agent_id,
        target=req.target,
        params=req.params,
    )
    if task_id is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {"task_id": task_id, "agent_id": agent_id, "status": "pending"}


@agent_router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get the current status and progress of a running task."""
    status = agent_service.get_task_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return status


@agent_router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a running task."""
    success = await agent_service.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or not cancellable")
    return {"task_id": task_id, "status": "cancelled"}


@agent_router.get("/tasks/{task_id}/result", response_model=AgentResultResponse)
async def get_task_result(task_id: str):
    """Get the final result of a completed task."""
    result = agent_service.get_task_result(task_id)
    if result is None:
        # Check if task exists but is not complete
        status = agent_service.get_task_status(task_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Task not found")
        raise HTTPException(
            status_code=202,
            detail=f"Task is still {status['status']}",
        )
    return result


@agent_router.get("/tasks/{task_id}/export/{fmt}")
async def export_task_result(task_id: str, fmt: str):
    """Export the task result as PDF or Excel.

    ``fmt`` should be ``pdf`` or ``excel``.
    """
    result = agent_service.get_task_result(task_id)
    if result is None:
        status = agent_service.get_task_status(task_id)
        if status is None:
            raise HTTPException(status_code=404, detail="Task not found")
        raise HTTPException(status_code=202, detail=f"Task is still {status['status']}")

    agent_type = result.get("agent_type", "risk")

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
        content = generate_pdf(result, agent_type)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{task_id[:8]}.pdf"},
        )
    elif fmt == "excel":
        try:
            if agent_type == "batch":
                from app.services.batch_export import generate_batch_excel
                content = generate_batch_excel(result, agent_type)
                filename = f"batch_result_{task_id[:8]}.xlsx"
            else:
                from app.services.export_service import generate_excel
                content = generate_excel(result, agent_type)
                filename = f"report_{task_id[:8]}.xlsx"
        except ModuleNotFoundError as exc:
            # Batch agent fallback: if openpyxl is unavailable, export CSV instead
            # of failing hard so users can still download deliverable data.
            if agent_type == "batch":
                from app.services.batch_export import generate_batch_csv

                csv_content = generate_batch_csv(result)
                filename = f"batch_result_{task_id[:8]}.csv"
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
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'pdf' or 'excel'.")


@agent_router.post("/batch/upload-companies")
async def upload_company_list(file: UploadFile = File(...)):
    """Parse an uploaded company name list for batch structured export.

    Accepts .xlsx, .csv, or .txt files. Returns parsed company names.
    The returned list should be passed as ``params.company_names`` when
    calling ``POST /api/agent/batch/execute``.
    """
    filename = file.filename or ""
    content = await file.read()
    companies: list[str] = []

    try:
        if filename.endswith((".xlsx", ".xls")):
            import io as _io
            import openpyxl
            wb = openpyxl.load_workbook(_io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            for row in ws.iter_rows(values_only=True):  # type: ignore[union-attr]
                for cell in row:
                    val = str(cell).strip() if cell is not None else ""
                    if val and val not in ("None", "企业名称", "公司名称", "name"):
                        companies.append(val)
        elif filename.endswith(".csv"):
            import csv
            import io as _io
            text = content.decode("utf-8-sig", errors="replace")
            reader = csv.reader(_io.StringIO(text))
            for row in reader:
                if row:
                    val = row[0].strip()
                    if val and val not in ("企业名称", "公司名称", "name"):
                        companies.append(val)
        else:
            # Plain text, one company per line
            text = content.decode("utf-8-sig", errors="replace")
            companies = [
                line.strip() for line in text.splitlines()
                if line.strip() and line.strip() not in ("企业名称", "公司名称", "name")
            ]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"文件解析失败: {e}")

    # Deduplicate and cap at 500
    seen: set[str] = set()
    unique: list[str] = []
    for c in companies:
        if c not in seen:
            seen.add(c)
            unique.append(c)
        if len(unique) >= 500:
            break

    return {"companies": unique, "count": len(unique), "filename": filename}
