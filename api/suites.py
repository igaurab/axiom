import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from benchmark_app.database import get_db
from benchmark_app.models.suite import BenchmarkSuite
from benchmark_app.models.query import Query as QueryModel
from benchmark_app.schemas.schemas import SuiteCreate, SuiteUpdate, SuiteOut, SuiteDetailOut, QueryCreate, QueryOut

router = APIRouter()


@router.get("", response_model=list[SuiteOut])
async def list_suites(tag: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(BenchmarkSuite)
    if tag:
        stmt = stmt.where(BenchmarkSuite.tags.overlap([tag]))
    stmt = stmt.order_by(BenchmarkSuite.created_at.desc())
    result = await db.execute(stmt)
    suites = result.scalars().all()
    out = []
    for s in suites:
        count_stmt = select(func.count()).select_from(QueryModel).where(QueryModel.suite_id == s.id)
        count = (await db.execute(count_stmt)).scalar() or 0
        d = SuiteOut.model_validate(s)
        d.query_count = count
        out.append(d)
    return out


@router.post("", response_model=SuiteOut, status_code=201)
async def create_suite(body: SuiteCreate, db: AsyncSession = Depends(get_db)):
    suite = BenchmarkSuite(name=body.name, description=body.description, tags=body.tags)
    db.add(suite)
    await db.commit()
    await db.refresh(suite)
    d = SuiteOut.model_validate(suite)
    d.query_count = 0
    return d


@router.get("/{suite_id}", response_model=SuiteDetailOut)
async def get_suite(suite_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(BenchmarkSuite).where(BenchmarkSuite.id == suite_id).options(selectinload(BenchmarkSuite.queries))
    result = await db.execute(stmt)
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(404, "Suite not found")
    d = SuiteDetailOut.model_validate(suite)
    d.query_count = len(suite.queries)
    return d


@router.put("/{suite_id}", response_model=SuiteOut)
async def update_suite(suite_id: int, body: SuiteUpdate, db: AsyncSession = Depends(get_db)):
    suite = await db.get(BenchmarkSuite, suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(suite, k, v)
    await db.commit()
    await db.refresh(suite)
    count_stmt = select(func.count()).select_from(QueryModel).where(QueryModel.suite_id == suite.id)
    count = (await db.execute(count_stmt)).scalar() or 0
    d = SuiteOut.model_validate(suite)
    d.query_count = count
    return d


@router.delete("/{suite_id}", status_code=204)
async def delete_suite(suite_id: int, db: AsyncSession = Depends(get_db)):
    suite = await db.get(BenchmarkSuite, suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")
    await db.delete(suite)
    await db.commit()


@router.post("/{suite_id}/queries", response_model=QueryOut, status_code=201)
async def add_query(suite_id: int, body: QueryCreate, db: AsyncSession = Depends(get_db)):
    suite = await db.get(BenchmarkSuite, suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")
    max_ord = (await db.execute(
        select(func.coalesce(func.max(QueryModel.ordinal), 0)).where(QueryModel.suite_id == suite_id)
    )).scalar()
    q = QueryModel(
        suite_id=suite_id, ordinal=max_ord + 1, tag=body.tag,
        query_text=body.query_text, expected_answer=body.expected_answer,
        comments=body.comments,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return QueryOut.model_validate(q)


@router.post("/{suite_id}/import-csv", response_model=dict)
async def import_csv(suite_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Import queries from CSV. Expected columns: id, tag, query, answer, comments."""
    suite = await db.get(BenchmarkSuite, suite_id)
    if not suite:
        raise HTTPException(404, "Suite not found")

    content = (await file.read()).decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    header = next(reader, None)
    if not header:
        raise HTTPException(400, "Empty CSV")

    # Delete existing queries
    existing = (await db.execute(select(QueryModel).where(QueryModel.suite_id == suite_id))).scalars().all()
    for q in existing:
        await db.delete(q)

    count = 0
    for row in reader:
        if len(row) < 4:
            continue
        q = QueryModel(
            suite_id=suite_id,
            ordinal=int(row[0]) if row[0].strip().isdigit() else count + 1,
            tag=row[1] if len(row) > 1 else None,
            query_text=row[2],
            expected_answer=row[3],
            comments=row[4] if len(row) > 4 else None,
        )
        db.add(q)
        count += 1

    await db.commit()
    return {"imported": count}
