import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.file import UploadedFile
from app.storage import file_store
from app.config import settings

router = APIRouter()

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    data = await file.read()
    if len(data) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "File too large")

    file_id = str(uuid.uuid4())
    raw = file_store.save_raw(file_id, file.filename or "upload", data)

    try:
        if ext == ".csv":
            sheets = file_store.parse_csv(file_id, raw)
            file_type = "csv"
        else:
            sheets = file_store.parse_excel(file_id, raw)
            file_type = "excel"
    except Exception as exc:
        raise HTTPException(422, f"Could not parse file: {exc}") from exc

    record = UploadedFile(
        id=file_id,
        original_filename=file.filename or "upload",
        storage_path=str(raw),
        file_type=file_type,
        size_bytes=len(data),
        sheets=sheets,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _file_response(record)


@router.get("")
def list_files(db: Session = Depends(get_db)):
    files = db.query(UploadedFile).order_by(UploadedFile.created_at.desc()).all()
    return [_file_response(f) for f in files]


@router.get("/{file_id}")
def get_file(file_id: str, db: Session = Depends(get_db)):
    f = db.get(UploadedFile, file_id)
    if not f:
        raise HTTPException(404, "File not found")
    return _file_response(f)


@router.get("/{file_id}/sheets/{sheet}/preview")
def preview_sheet(file_id: str, sheet: str, db: Session = Depends(get_db)):
    f = db.get(UploadedFile, file_id)
    if not f:
        raise HTTPException(404, "File not found")
    if sheet not in f.sheets:
        raise HTTPException(404, "Sheet not found")

    try:
        df = file_store.read_sheet(file_id, sheet)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc

    preview = df.head(settings.preview_row_limit).to_dicts()
    schema = f.sheets[sheet]["columns"]
    return {"sheet": sheet, "row_count": len(df), "schema": schema, "preview": preview}


@router.delete("/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db)):
    f = db.get(UploadedFile, file_id)
    if not f:
        raise HTTPException(404, "File not found")
    db.delete(f)
    db.commit()
    return {"deleted": file_id}


def _file_response(f: UploadedFile) -> dict:
    return {
        "id": f.id,
        "original_filename": f.original_filename,
        "file_type": f.file_type,
        "size_bytes": f.size_bytes,
        "sheets": f.sheets,
        "created_at": f.created_at.isoformat(),
    }
