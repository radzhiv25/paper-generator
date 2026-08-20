from typing import Literal

from pydantic import BaseModel

ExportFormat = Literal["docx", "pdf"]
ExportInclude = Literal["paper", "answer_key", "both"]


class ExportRequest(BaseModel):
    format: ExportFormat = "docx"
    include: ExportInclude = "paper"


class ExportResponse(BaseModel):
    filename: str
    download_url: str
    format: ExportFormat
