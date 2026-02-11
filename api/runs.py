import asyncio
import json as json_mod
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from benchmark_app.database import get_db, async_session
from benchmark_app.config import get_settings
from benchmark_app.models.run import Run
from benchmark_app.models.suite import BenchmarkSuite
from benchmark_app.models.agent import AgentConfig
from benchmark_app.models.query import Query
from benchmark_app.models.result import Result
from benchmark_app.schemas.schemas import RunCreate, RunOut, RunDetailOut

router = APIRouter()


@router.get("", response_model=list[RunDetailOut])
async def list_runs(tag: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Run).options(
        selectinload(Run.suite), selectinload(Run.agent_config)
    )
    if tag:
        stmt = stmt.where(Run.tags.overlap([tag]))
    stmt = stmt.order_by(Run.created_at.desc())
    result = await db.execute(stmt)
    runs = result.scalars().all()
    out = []
    for r in runs:
        d = RunDetailOut.model_validate(r)
        d.suite_name = r.suite.name if r.suite else ""
        d.agent_name = r.agent_config.name if r.agent_config else ""
        out.append(d)
    return out


@router.post("", response_model=list[RunOut], status_code=201)
async def create_run(body: RunCreate, db: AsyncSession = Depends(get_db)):
    # Validate suite
    suite = await db.get(BenchmarkSuite, body.suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")
    # Validate agent
    agent = await db.get(AgentConfig, body.agent_config_id)
    if not agent:
        raise HTTPException(404, "Agent config not found")

    # Get queries
    if body.query_ids:
        q_stmt = select(Query).where(Query.id.in_(body.query_ids), Query.suite_id == body.suite_id)
    else:
        q_stmt = select(Query).where(Query.suite_id == body.suite_id)
    queries = (await db.execute(q_stmt)).scalars().all()
    if not queries:
        raise HTTPException(400, "No queries found for this suite")

    repeat = max(1, body.repeat)
    run_group = str(uuid.uuid4())[:12] if repeat > 1 else None
    safe_label = body.label.replace(" ", "_").replace("/", "_")
    base_dir = Path(body.output_dir).expanduser() if body.output_dir else Path(get_settings().OUTPUT_BASE_DIR).expanduser() / safe_label

    created_runs = []
    query_ids = [q.id for q in queries]

    for i in range(repeat):
        run_num = i + 1
        if repeat > 1:
            label = f"{body.label} ({run_num}/{repeat})"
            output_dir = str(base_dir / f"run_{run_num}")
        else:
            label = body.label
            output_dir = str(base_dir)

        run = Run(
            suite_id=body.suite_id,
            agent_config_id=body.agent_config_id,
            label=label,
            tags=body.tags,
            batch_size=body.batch_size,
            progress_total=len(queries),
            output_dir=output_dir,
            run_group=run_group,
            run_number=run_num,
            status="pending",
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        created_runs.append(run)
        task = asyncio.create_task(_start_run_job(run.id, query_ids, body.batch_size))
        task.add_done_callback(_task_done_callback)

    return [RunOut.model_validate(r) for r in created_runs]


from loguru import logger as _run_logger

def _task_done_callback(task: asyncio.Task):
    exc = task.exception()
    if exc:
        _run_logger.opt(exception=exc).error("Background run task failed")

async def _start_run_job(run_id: int, query_ids: list[int], batch_size: int):
    from benchmark_app.workers.runner import execute_run
    await execute_run(run_id, query_ids, batch_size)


@router.get("/group/{run_group}", response_model=list[RunDetailOut])
async def list_group_runs(run_group: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Run).where(Run.run_group == run_group).options(
        selectinload(Run.suite), selectinload(Run.agent_config)
    ).order_by(Run.run_number)
    result = await db.execute(stmt)
    runs = result.scalars().all()
    out = []
    for r in runs:
        d = RunDetailOut.model_validate(r)
        d.suite_name = r.suite.name if r.suite else ""
        d.agent_name = r.agent_config.name if r.agent_config else ""
        out.append(d)
    return out


@router.get("/{run_id}/config")
async def get_run_config(run_id: int, db: AsyncSession = Depends(get_db)):
    """Return run configuration including agent and suite details."""
    stmt = select(Run).where(Run.id == run_id).options(
        selectinload(Run.suite).selectinload(BenchmarkSuite.queries),
        selectinload(Run.agent_config),
    )
    result = await db.execute(stmt)
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Run not found")
    agent = run.agent_config
    suite = run.suite
    return {
        "run": {
            "id": run.id, "label": run.label, "status": run.status,
            "tags": run.tags or [], "batch_size": run.batch_size,
            "progress_total": run.progress_total,
            "output_dir": run.output_dir,
            "run_group": run.run_group, "run_number": run.run_number,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        },
        "agent": {
            "id": agent.id, "name": agent.name, "executor_type": agent.executor_type,
            "model": agent.model, "system_prompt": agent.system_prompt or "",
            "tools_config": agent.tools_config, "model_settings": agent.model_settings,
        } if agent else None,
        "suite": {
            "id": suite.id, "name": suite.name, "description": suite.description or "",
            "query_count": len(suite.queries) if suite.queries else 0,
        } if suite else None,
    }


@router.get("/{run_id}", response_model=RunDetailOut)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Run).where(Run.id == run_id).options(
        selectinload(Run.suite), selectinload(Run.agent_config)
    )
    result = await db.execute(stmt)
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Run not found")
    d = RunDetailOut.model_validate(run)
    d.suite_name = run.suite.name if run.suite else ""
    d.agent_name = run.agent_config.name if run.agent_config else ""
    return d


@router.post("/{run_id}/cancel", response_model=RunOut)
async def cancel_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status not in ("pending", "running"):
        raise HTTPException(400, "Run cannot be cancelled")
    run.status = "cancelled"
    run.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return RunOut.model_validate(run)


@router.delete("/{run_id}", status_code=204)
async def delete_run(run_id: int, delete_data: bool = False, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    output_dir = run.output_dir
    run_group = run.run_group
    await db.delete(run)
    await db.commit()
    if delete_data and output_dir:
        import shutil
        p = Path(output_dir)
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)


class RunImport(BaseModel):
    suite_id: int
    agent_config_id: int
    label: str
    json_dir: str  # path to directory containing JSON files
    tags: list[str] = []
    run_group: Optional[str] = None
    run_number: int = 1


@router.post("/import", response_model=RunOut, status_code=201)
async def import_run(body: RunImport, db: AsyncSession = Depends(get_db)):
    """Import a completed run from existing JSON files on disk."""
    suite = await db.get(BenchmarkSuite, body.suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")
    agent = await db.get(AgentConfig, body.agent_config_id)
    if not agent:
        raise HTTPException(404, "Agent config not found")

    json_dir = Path(body.json_dir).expanduser()
    if not json_dir.exists():
        raise HTTPException(400, f"Directory not found: {json_dir}")

    # Load all JSON files
    json_files = sorted(json_dir.glob("*.json"), key=lambda f: int(f.stem) if f.stem.isdigit() else 0)
    if not json_files:
        raise HTTPException(400, f"No JSON files found in {json_dir}")

    # Load queries for matching
    q_stmt = select(Query).where(Query.suite_id == body.suite_id).order_by(Query.ordinal)
    queries = (await db.execute(q_stmt)).scalars().all()
    ordinal_to_query = {q.ordinal: q for q in queries}

    # Create the run as completed
    now = datetime.now(timezone.utc)
    run = Run(
        suite_id=body.suite_id,
        agent_config_id=body.agent_config_id,
        label=body.label,
        tags=body.tags,
        batch_size=0,
        progress_total=len(json_files),
        progress_current=len(json_files),
        output_dir=str(json_dir.parent),
        run_group=body.run_group,
        run_number=body.run_number,
        status="completed",
        started_at=now,
        completed_at=now,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Import each JSON file as a result
    imported = 0
    for jf in json_files:
        try:
            data = json_mod.loads(jf.read_text())
        except Exception:
            continue

        ordinal = int(data.get("id", jf.stem)) if str(data.get("id", jf.stem)).isdigit() else 0
        query = ordinal_to_query.get(ordinal)
        if not query:
            continue

        result = Result(
            run_id=run.id,
            query_id=query.id,
            agent_response=data.get("agent_response") or None,
            tool_calls=data.get("tool_calls") or None,
            reasoning=data.get("reasoning") or None,
            usage=data.get("usage") or None,
            execution_time_seconds=data.get("execution_time_seconds", 0),
            error=data.get("error") or None,
        )
        db.add(result)
        imported += 1

    await db.commit()

    # Update progress
    run.progress_current = imported
    run.progress_total = imported
    await db.commit()
    await db.refresh(run)

    return RunOut.model_validate(run)


@router.delete("/group/{run_group}", status_code=204)
async def delete_group(run_group: str, delete_data: bool = False, db: AsyncSession = Depends(get_db)):
    stmt = select(Run).where(Run.run_group == run_group)
    result = await db.execute(stmt)
    runs = result.scalars().all()
    if not runs:
        raise HTTPException(404, "Run group not found")
    dirs = [r.output_dir for r in runs if r.output_dir]
    for r in runs:
        await db.delete(r)
    await db.commit()
    if delete_data:
        import shutil
        for d in dirs:
            p = Path(d)
            if p.exists():
                shutil.rmtree(p, ignore_errors=True)
