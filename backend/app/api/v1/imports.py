from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models import ImportJob, ImportRowError
from backend.app.schemas import (
    ImportDiffPreview, ImportCommitRequest, ImportCommitResponse
)
from backend.app.services.import_service import ImportService
from backend.app.services.export_service import ExportService

router = APIRouter(prefix="/imports", tags=["Smart Imports"])


@router.post("/preview", response_model=ImportDiffPreview)
async def preview_import_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Step 1 of Smart Import Diff:
    Upload CSV or Excel file, analyze against PostgreSQL DB, and generate smart diff preview.
    """
    filename = file.filename or "unknown.csv"
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a .csv or .xlsx file."
        )

    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        df = ImportService.parse_file(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded file: {str(e)}"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no data rows."
        )

    diff_preview = ImportService.generate_diff_preview(
        df=df,
        filename=filename,
        file_size_bytes=len(file_bytes),
        db=db
    )

    return diff_preview


@router.post("/commit", response_model=ImportCommitResponse)
def commit_or_cancel_import(
    payload: ImportCommitRequest,
    db: Session = Depends(get_db)
):
    """
    Step 2 of Smart Import:
    Confirm or cancel import after reviewing diff preview and resolving conflicts.
    """
    try:
        response = ImportService.commit_import(
            job_id=payload.job_id,
            action=payload.action,
            conflict_resolutions=payload.conflict_resolutions or {},
            db=db
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/history")
def get_import_history(
    db: Session = Depends(get_db)
):
    """Retrieve history of all import jobs and row metrics."""
    jobs = db.query(ImportJob).order_by(desc(ImportJob.created_at)).limit(50).all()
    results = []
    for j in jobs:
        results.append({
            "id": j.id,
            "filename": j.filename,
            "file_type": j.file_type,
            "file_size_bytes": j.file_size_bytes,
            "status": j.status,
            "total_rows": j.total_rows,
            "new_rows": j.new_rows,
            "updated_rows": j.updated_rows,
            "unchanged_rows": j.unchanged_rows,
            "duplicate_rows": j.duplicate_rows,
            "conflicting_rows": j.conflicting_rows,
            "invalid_rows": j.invalid_rows,
            "created_at": j.created_at,
            "committed_at": j.committed_at
        })
    return results


@router.get("/{job_id}/errors")
def get_import_job_errors(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve row-level validation and conflict errors for a specific import job."""
    errors = db.query(ImportRowError).filter(ImportRowError.import_job_id == job_id).all()
    return [
        {
            "id": e.id,
            "row_number": e.row_number,
            "external_call_id": e.external_call_id,
            "error_type": e.error_type,
            "message": e.message,
            "raw_data": e.raw_data
        }
        for e in errors
    ]


@router.get("/{job_id}/errors/export")
def export_import_errors(
    job_id: int,
    format: str = "csv",
    db: Session = Depends(get_db)
):
    """Download validation and duplicate errors as CSV or Excel."""
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found.")

    errors = db.query(ImportRowError).filter(ImportRowError.import_job_id == job_id).all()
    data = [
        {
            "Row Number": e.row_number,
            "Call ID": e.external_call_id or "N/A",
            "Error Type": e.error_type,
            "Error Message": e.message
        }
        for e in errors
    ]

    if format.lower() == "xlsx":
        content = ExportService.generate_excel(data, sheet_name="Import Errors")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=errors_job_{job_id}.xlsx"}
        )
    else:
        content = ExportService.generate_csv(data)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=errors_job_{job_id}.csv"}
        )
