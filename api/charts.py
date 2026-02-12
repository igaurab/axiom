from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from database import get_db
from services.analytics import compute_run_analytics
from services.charts import generate_accuracy_chart

router = APIRouter()


@router.get("/accuracy")
async def accuracy_chart(
    run_ids: str = Query(..., description="Comma-separated run IDs"),
    db: AsyncSession = Depends(get_db),
):
    ids = [int(x.strip()) for x in run_ids.split(",") if x.strip()]
    if not ids:
        raise HTTPException(400, "At least 1 run ID required")

    runs = []
    for rid in ids:
        try:
            analytics = await compute_run_analytics(rid, db)
            runs.append({"label": analytics.label, "grade_counts": analytics.grade_counts})
        except ValueError:
            raise HTTPException(404, f"Run {rid} not found")

    png_bytes = generate_accuracy_chart(runs)
    return StreamingResponse(
        io.BytesIO(png_bytes),
        media_type="image/png",
        headers={"Content-Disposition": "inline; filename=accuracy_chart.png"},
    )
