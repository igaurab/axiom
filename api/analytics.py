from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from benchmark_app.database import get_db
from benchmark_app.models.run import Run
from benchmark_app.models.result import Result
from benchmark_app.models.grade import Grade
from benchmark_app.models.query import Query as QueryModel
from benchmark_app.services.analytics import compute_run_analytics, compute_compare_analytics
from benchmark_app.schemas.schemas import RunAnalyticsOut, CompareAnalyticsOut

router = APIRouter()


@router.get("/runs/{run_id}", response_model=RunAnalyticsOut)
async def run_analytics(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return await compute_run_analytics(run_id, db)


@router.get("/compare", response_model=CompareAnalyticsOut)
async def compare_analytics(run_ids: str = Query(..., description="Comma-separated run IDs"), db: AsyncSession = Depends(get_db)):
    ids = [int(x.strip()) for x in run_ids.split(",") if x.strip()]
    if len(ids) < 2:
        raise HTTPException(400, "At least 2 run IDs required")
    return await compute_compare_analytics(ids, db)
