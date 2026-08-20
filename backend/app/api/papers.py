import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.models.models import AnswerKeyRecord, ContextDocument, PaperRecord, Template, User
from app.schemas.paper import (
    AnswerKey,
    AnswerKeyUpdate,
    Paper,
    PaperContextAttach,
    PaperCreate,
    PaperMetadata,
    PaperResponse,
    PaperUpdate,
    RecentPaperItem,
)

router = APIRouter(prefix="/papers", tags=["papers"])


def _paper_from_record(record: PaperRecord) -> Paper:
    paper = Paper.model_validate(record.data)
    paper.context_document_id = record.context_document_id
    return paper


def _answer_key_from_record(record: AnswerKeyRecord | None, paper_id: str) -> AnswerKey:
    if record is None:
        return AnswerKey(paper_id=paper_id, answers=[])
    return AnswerKey.model_validate(record.data)


def _get_paper_record(db: Session, paper_id: str, user: User) -> PaperRecord:
    record = db.get(PaperRecord, paper_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    if record.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return record


@router.post("", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(
    body: PaperCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    template = db.get(Template, body.template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown template")

    now = datetime.now(timezone.utc)
    paper_id = str(uuid.uuid4())
    metadata = body.metadata or PaperMetadata(
        subject="Untitled",
        grade_class="",
        total_marks=0,
        duration="",
    )
    paper = Paper(
        paper_id=paper_id,
        owner_id=user.id,
        template_id=body.template_id,
        metadata=metadata,
        sections=[],
        created_at=now,
        updated_at=now,
        context_document_id=body.context_document_id,
    )

    record = PaperRecord(
        id=paper_id,
        owner_id=user.id,
        template_id=body.template_id,
        context_document_id=body.context_document_id,
        data=paper.model_dump(mode="json"),
    )
    db.add(record)
    db.add(AnswerKeyRecord(id=str(uuid.uuid4()), paper_id=paper_id, data={"paper_id": paper_id, "answers": []}))
    db.commit()

    return PaperResponse(paper=paper, marks_warning=paper.marks_mismatch_warning())


@router.get("/recent", response_model=list[RecentPaperItem])
async def list_recent_papers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    records = (
        db.query(PaperRecord)
        .filter(PaperRecord.owner_id == user.id)
        .order_by(PaperRecord.updated_at.desc())
        .limit(20)
        .all()
    )
    items: list[RecentPaperItem] = []
    for record in records:
        paper = _paper_from_record(record)
        items.append(
            RecentPaperItem(
                paper_id=paper.paper_id,
                subject=paper.metadata.subject,
                grade_class=paper.metadata.grade_class,
                template_id=paper.template_id,
                updated_at=paper.updated_at,
            )
        )
    return items


@router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _get_paper_record(db, paper_id, user)
    paper = _paper_from_record(record)
    return PaperResponse(paper=paper, marks_warning=paper.marks_mismatch_warning())


@router.put("/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_id: str,
    body: PaperUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _get_paper_record(db, paper_id, user)
    paper = _paper_from_record(record)

    if body.template_id is not None:
        paper.template_id = body.template_id
    if body.metadata is not None:
        paper.metadata = body.metadata
    if body.sections is not None:
        paper.sections = body.sections
    if "context_document_id" in body.model_fields_set:
        record.context_document_id = body.context_document_id
        paper.context_document_id = body.context_document_id

    paper.updated_at = datetime.now(timezone.utc)
    record.data = paper.model_dump(mode="json")
    record.updated_at = paper.updated_at
    db.commit()

    return PaperResponse(paper=paper, marks_warning=paper.marks_mismatch_warning())


@router.put("/{paper_id}/context", response_model=PaperResponse)
async def attach_paper_context(
    paper_id: str,
    body: PaperContextAttach,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _get_paper_record(db, paper_id, user)
    if body.context_document_id:
        document = db.get(ContextDocument, body.context_document_id)
        if document is None or document.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Context document not found")
    record.context_document_id = body.context_document_id
    paper = _paper_from_record(record)
    paper.context_document_id = body.context_document_id
    record.data = paper.model_dump(mode="json")
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    return PaperResponse(paper=paper, marks_warning=paper.marks_mismatch_warning())


@router.get("/{paper_id}/answer-key", response_model=AnswerKey)
async def get_answer_key(
    paper_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_paper_record(db, paper_id, user)
    ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == paper_id).first()
    return _answer_key_from_record(ak_record, paper_id)


@router.put("/{paper_id}/answer-key", response_model=AnswerKey)
async def replace_answer_key(
    paper_id: str,
    body: AnswerKey,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.paper_id != paper_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="paper_id in body does not match URL",
        )

    record = _get_paper_record(db, paper_id, user)
    paper = _paper_from_record(record)
    body.validate_against_paper(paper)

    ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == paper_id).first()
    if ak_record is None:
        ak_record = AnswerKeyRecord(
            id=str(uuid.uuid4()),
            paper_id=paper_id,
            data=body.model_dump(mode="json"),
        )
        db.add(ak_record)
    else:
        ak_record.data = body.model_dump(mode="json")
        ak_record.updated_at = datetime.now(timezone.utc)

    db.commit()
    return body


@router.patch("/{paper_id}/answer-key/{q_id}", response_model=AnswerKey)
async def update_answer_key_entry(
    paper_id: str,
    q_id: str,
    body: AnswerKeyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _get_paper_record(db, paper_id, user)
    paper = _paper_from_record(record)
    if q_id not in paper.all_question_ids():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found in paper")

    ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == paper_id).first()
    if ak_record is None:
        ak_record = AnswerKeyRecord(id=str(uuid.uuid4()), paper_id=paper_id, data={"paper_id": paper_id, "answers": []})
        db.add(ak_record)

    answer_key = _answer_key_from_record(ak_record, paper_id)
    updated = False
    for entry in answer_key.answers:
        if entry.q_id == q_id:
            entry.answer = body.answer
            entry.explanation = body.explanation
            updated = True
            break

    if not updated:
        from app.schemas.paper import AnswerEntry

        answer_key.answers.append(
            AnswerEntry(q_id=q_id, answer=body.answer, explanation=body.explanation)
        )

    answer_key.validate_against_paper(paper)
    ak_record.data = answer_key.model_dump(mode="json")
    ak_record.updated_at = datetime.now(timezone.utc)
    db.commit()

    return answer_key
