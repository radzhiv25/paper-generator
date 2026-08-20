from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import get_settings
from app.db import get_db
from app.models.models import AnswerKeyRecord, PaperRecord, User
from app.schemas.export import ExportRequest, ExportResponse
from app.schemas.paper import AnswerKey, Paper
from app.services.docx_export import build_export_file

router = APIRouter(prefix="/papers", tags=["export"])


@router.post("/{paper_id}/export", response_model=ExportResponse)
async def export_paper(
    paper_id: str,
    body: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.get(PaperRecord, paper_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    if record.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    paper = Paper.model_validate(record.data)
    answer_key: AnswerKey | None = None
    if body.include in ("answer_key", "both"):
        ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == paper_id).first()
        if ak_record:
            answer_key = AnswerKey.model_validate(ak_record.data)

    settings = get_settings()
    path, filename = build_export_file(
        paper=paper,
        answer_key=answer_key,
        include=body.include,
        fmt=body.format,
        export_dir=settings.export_dir,
    )

    return ExportResponse(
        filename=filename,
        download_url=f"/exports/{filename}",
        format=body.format,
    )
