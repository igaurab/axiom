from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("")
async def browse_directory(path: str = "~"):
    """List directories and .json files at a given server-side path."""
    target = Path(path).expanduser().resolve()
    if not target.exists():
        raise HTTPException(400, f"Path not found: {target}")
    if not target.is_dir():
        raise HTTPException(400, f"Not a directory: {target}")

    items = []
    try:
        for entry in sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
            if entry.name.startswith("."):
                continue
            if entry.is_dir():
                items.append({"name": entry.name, "type": "dir", "path": str(entry)})
            elif entry.suffix == ".json":
                items.append({"name": entry.name, "type": "file", "path": str(entry)})
    except PermissionError:
        raise HTTPException(403, f"Permission denied: {target}")

    return {
        "current": str(target),
        "parent": str(target.parent) if target != target.parent else None,
        "items": items,
    }
