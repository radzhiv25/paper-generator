from datetime import datetime

from pydantic import BaseModel


class ContextUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    chunk_count: int
    created_at: datetime


class ContextChunkPreview(BaseModel):
    id: str
    chunk_index: int
    content: str


class ContextDocumentSummary(BaseModel):
    document_id: str
    filename: str
    status: str
    chunk_count: int
    created_at: datetime

