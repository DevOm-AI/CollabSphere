from fastapi import APIRouter, Query

from app.core.colleges import load_colleges


router = APIRouter(prefix="/colleges", tags=["colleges"])


@router.get("", response_model=list[str])
def list_colleges(q: str = Query(default="", max_length=120), limit: int = Query(default=50, ge=1, le=200)) -> list[str]:
    query = q.strip().casefold()
    colleges = load_colleges()
    if query:
        colleges = [college for college in colleges if query in college.casefold()]
    return colleges[:limit]
