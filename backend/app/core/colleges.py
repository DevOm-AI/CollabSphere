import json
from functools import lru_cache
from pathlib import Path


COLLEGES_PATH = Path(__file__).resolve().parents[2] / "data" / "colleges.json"


def normalize_college_name(value: str) -> str:
    return " ".join(value.strip().split())


@lru_cache
def load_colleges() -> list[str]:
    if not COLLEGES_PATH.exists():
        return []

    raw_colleges = json.loads(COLLEGES_PATH.read_text(encoding="utf-8"))
    seen: set[str] = set()
    colleges: list[str] = []
    for raw_name in raw_colleges:
        if not isinstance(raw_name, str):
            continue
        name = normalize_college_name(raw_name)
        canonical = name.casefold()
        if not name or canonical in seen:
            continue
        colleges.append(name)
        seen.add(canonical)
    return colleges


def college_exists(name: str) -> bool:
    canonical = normalize_college_name(name).casefold()
    return canonical in {college.casefold() for college in load_colleges()}


def canonical_college_name(name: str) -> str | None:
    canonical = normalize_college_name(name).casefold()
    for college in load_colleges():
        if college.casefold() == canonical:
            return college
    return None
