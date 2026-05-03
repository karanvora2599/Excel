"""Download exported files."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.config import settings

router = APIRouter()


@router.get("/exports/{filename}")
def download_export(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")
    path = Path(settings.file_storage_path) / "exports" / filename
    if not path.exists():
        raise HTTPException(404, "File not found")
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if filename.endswith(".xlsx")
        else "text/csv"
    )
    return FileResponse(path, media_type=media_type, filename=filename)
