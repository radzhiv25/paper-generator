from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

ContentBlockType = Literal["text", "equation", "chem_notation"]
QuestionType = Literal["mcq", "short", "long", "numerical", "freeform"]
Difficulty = Literal["easy", "medium", "hard"]


class ContentBlock(BaseModel):
    type: ContentBlockType
    value: str


class Question(BaseModel):
    q_id: str
    type: QuestionType
    content: list[ContentBlock]
    body_doc: list[dict[str, Any]] | None = None
    options: list[str] | None = None
    marks: int = Field(ge=0)
    difficulty: Difficulty
    source_chunk_id: str | None = None

    @model_validator(mode="after")
    def validate_mcq_options(self) -> Question:
        if self.type == "mcq" and not self.options:
            raise ValueError("MCQ questions must include options")
        return self


class Section(BaseModel):
    section_id: str
    instructions: str | None = None
    questions: list[Question]


class PaperMetadata(BaseModel):
    subject: str
    grade_class: str
    total_marks: int = Field(ge=0)
    duration: str
    instructions: str | None = None


class Paper(BaseModel):
    paper_id: str
    owner_id: str
    template_id: str
    metadata: PaperMetadata
    sections: list[Section]
    created_at: datetime
    updated_at: datetime
    context_document_id: str | None = None

    def all_question_ids(self) -> set[str]:
        return {q.q_id for section in self.sections for q in section.questions}

    def total_marks_sum(self) -> int:
        return sum(q.marks for section in self.sections for q in section.questions)

    def find_question(self, q_id: str) -> Question | None:
        for section in self.sections:
            for question in section.questions:
                if question.q_id == q_id:
                    return question
        return None

    def marks_mismatch_warning(self) -> str | None:
        actual = self.total_marks_sum()
        expected = self.metadata.total_marks
        if actual != expected:
            return f"Marks sum ({actual}) does not match metadata.total_marks ({expected})"
        return None


class AnswerEntry(BaseModel):
    q_id: str
    answer: list[ContentBlock]
    explanation: str | None = None


class AnswerKey(BaseModel):
    paper_id: str
    answers: list[AnswerEntry]

    @model_validator(mode="after")
    def validate_unique_q_ids(self) -> AnswerKey:
        q_ids = [a.q_id for a in self.answers]
        if len(q_ids) != len(set(q_ids)):
            raise ValueError("Duplicate q_id in answer key")
        return self

    def validate_against_paper(self, paper: Paper) -> None:
        paper_q_ids = paper.all_question_ids()
        for entry in self.answers:
            if entry.q_id not in paper_q_ids:
                raise ValueError(f"Answer key references unknown q_id: {entry.q_id}")


class PaperCreate(BaseModel):
    template_id: str
    context_document_id: str | None = None
    metadata: PaperMetadata | None = None


class PaperUpdate(BaseModel):
    template_id: str | None = None
    metadata: PaperMetadata | None = None
    sections: list[Section] | None = None
    context_document_id: str | None = None


class PaperContextAttach(BaseModel):
    context_document_id: str | None = None


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)
    template_id: str | None = None
    context_document_id: str | None = None
    metadata: PaperMetadata | None = None
    use_mock: bool = False


class RegenerateQuestionRequest(BaseModel):
    prompt: str = Field(min_length=1)
    use_mock: bool = False


class AnswerKeyUpdate(BaseModel):
    answer: list[ContentBlock]
    explanation: str | None = None


class MarksWarning(BaseModel):
    warning: str | None = None


class PaperResponse(BaseModel):
    paper: Paper
    marks_warning: str | None = None


class GenerateResponse(BaseModel):
    paper: Paper
    answer_key: AnswerKey
    marks_warning: str | None = None
    provider: str


class RecentPaperItem(BaseModel):
    paper_id: str
    subject: str
    grade_class: str
    template_id: str
    updated_at: datetime


class TemplateInfo(BaseModel):
    id: str
    name: str
    type: str
    layout_config: dict
    owner_id: str | None = None


class EstimateRequest(BaseModel):
    prompt: str = Field(min_length=1)


class CostEstimate(BaseModel):
    estimated_tokens: int
    estimated_cost_usd: float
    model: str


class GenerationStartResponse(BaseModel):
    status: Literal["generating"] = "generating"
    paper_id: str


class GenerationStatusResponse(BaseModel):
    status: Literal["idle", "generating", "complete", "failed"]
    paper_id: str
    phase: str | None = None
    elapsed_seconds: int | None = None
    error: str | None = None
    paper: Paper | None = None
    answer_key: AnswerKey | None = None
    marks_warning: str | None = None
    provider: str | None = None
