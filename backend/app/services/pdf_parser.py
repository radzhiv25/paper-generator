"""PDF text extraction and chunking via PyMuPDF."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class TextChunk:
    chunk_index: int
    content: str


def extract_text_from_pdf(file_bytes: bytes) -> str:
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text.strip())
    doc.close()
    return "\n\n".join(pages)


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 150) -> list[TextChunk]:
    """Paragraph-aware chunking with optional overlap."""
    if not text.strip():
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            sentences = re.split(r"(?<=[.!?])\s+", para)
            buf = ""
            for sentence in sentences:
                if len(buf) + len(sentence) + 1 <= max_chars:
                    buf = f"{buf} {sentence}".strip()
                else:
                    if buf:
                        chunks.append(buf)
                    buf = sentence
            if buf:
                chunks.append(buf)
            continue

        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = para

    if current:
        chunks.append(current.strip())

    if overlap > 0 and len(chunks) > 1:
        overlapped: list[str] = []
        for i, chunk in enumerate(chunks):
            if i == 0:
                overlapped.append(chunk)
                continue
            prev_tail = chunks[i - 1][-overlap:]
            overlapped.append(f"{prev_tail}\n{chunk}")
        chunks = overlapped

    return [TextChunk(chunk_index=i, content=c) for i, c in enumerate(chunks)]
