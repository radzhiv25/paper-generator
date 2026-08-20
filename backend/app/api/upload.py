import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import get_settings
from app.db import get_db
from app.models.models import ContextChunk, ContextDocument, User
from app.schemas.upload import ContextChunkPreview, ContextDocumentSummary, ContextUploadResponse
from app.services.pdf_parser import chunk_text, extract_text_from_pdf
from app.services.rag import embed_text

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/context", response_model=ContextUploadResponse)
async def upload_context(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for context upload",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    settings = get_settings()
    doc_id = str(uuid.uuid4())

    try:
        extracted = extract_text_from_pdf(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF extraction failed: {exc}",
        ) from exc

    document = ContextDocument(
        id=doc_id,
        owner_id=user.id,
        filename=file.filename,
        extracted_text=extracted,
        status="processing",
        created_at=datetime.now(timezone.utc),
    )
    db.add(document)
    db.flush()

    chunks = chunk_text(extracted)
    for chunk in chunks:
        embedding = await embed_text(chunk.content, settings)
        db.add(
            ContextChunk(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                embedding=embedding,
            )
        )

    document.status = "ready" if chunks else "empty"
    db.commit()
    db.refresh(document)

    return ContextUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        status=document.status,
        chunk_count=len(chunks),
        created_at=document.created_at,
    )


@router.get("", response_model=list[ContextDocumentSummary])
@router.get("/", response_model=list[ContextDocumentSummary], include_in_schema=False)
async def list_context_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    documents = (
        db.query(ContextDocument)
        .filter(ContextDocument.owner_id == user.id)
        .order_by(ContextDocument.created_at.desc())
        .limit(50)
        .all()
    )
    items: list[ContextDocumentSummary] = []
    for document in documents:
        chunk_count = (
            db.query(ContextChunk)
            .filter(ContextChunk.document_id == document.id)
            .count()
        )
        items.append(
            ContextDocumentSummary(
                document_id=document.id,
                filename=document.filename,
                status=document.status,
                chunk_count=chunk_count,
                created_at=document.created_at,
            )
        )
    return items


@router.get("/{document_id}", response_model=ContextDocumentSummary)
async def get_context_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = db.get(ContextDocument, document_id)
    if document is None or document.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    chunk_count = (
        db.query(ContextChunk)
        .filter(ContextChunk.document_id == document.id)
        .count()
    )
    return ContextDocumentSummary(
        document_id=document.id,
        filename=document.filename,
        status=document.status,
        chunk_count=chunk_count,
        created_at=document.created_at,
    )


@router.get("/{document_id}/chunks", response_model=list[ContextChunkPreview])
async def list_chunks(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = db.get(ContextDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    chunks = (
        db.query(ContextChunk)
        .filter(ContextChunk.document_id == document_id)
        .order_by(ContextChunk.chunk_index)
        .all()
    )
    return [
        ContextChunkPreview(id=c.id, chunk_index=c.chunk_index, content=c.content[:500])
        for c in chunks
    ]
