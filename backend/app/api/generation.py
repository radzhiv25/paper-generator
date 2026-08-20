from datetime import datetime, timezone
import asyncio
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import get_settings
from app.db import get_db
from app.models.models import AnswerKeyRecord, ContextChunk, PaperRecord, SessionLocal, User
from app.schemas.paper import (
    CostEstimate,
    EstimateRequest,
    GenerateRequest,
    GenerateResponse,
    GenerationStartResponse,
    GenerationStatusResponse,
    AnswerKey,
    Paper,
    Question,
    RegenerateQuestionRequest,
)
from app.services.generation_jobs import (
    complete_job,
    fail_job,
    get_job,
    set_job_phase,
    start_job,
)
from app.services.llm_client import (
    check_ollama_available,
    generate_with_retry,
    get_llm_client,
    regenerate_with_retry,
)
from app.services.rag import embed_text, retrieve_top_chunks
from app.services.templates import BUILTIN_TEMPLATES

router = APIRouter(prefix="/papers", tags=["generation"])
estimate_router = APIRouter(prefix="/generation", tags=["generation"])
logger = logging.getLogger(__name__)


@estimate_router.post("/estimate", response_model=CostEstimate)
async def estimate_cost(body: EstimateRequest):
    settings = get_settings()
    tokens = max(500, len(body.prompt) * 12)
    if settings.llm_provider == "local":
        model_label = f"Ollama · {settings.ollama_model}"
        cost = 0.0
    elif settings.llm_provider == "byok":
        model_label = "Bring Your Own Key"
        cost = tokens * 0.000003
    elif settings.llm_provider == "claude":
        model_label = "Claude (server)"
        cost = tokens * 0.000003
    else:
        model_label = settings.llm_provider
        cost = 0.0
    return CostEstimate(
        estimated_tokens=tokens,
        estimated_cost_usd=cost,
        model=model_label,
    )


def _get_paper_record(db: Session, paper_id: str, user: User) -> PaperRecord:
    record = db.get(PaperRecord, paper_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    if record.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return record


def _template_dict(template_id: str) -> dict:
    for t in BUILTIN_TEMPLATES:
        if t["id"] == template_id:
            return t
    return BUILTIN_TEMPLATES[0]


async def _retrieve_context_chunks(
    db: Session,
    context_doc_id: str | None,
    query: str,
    api_key: str | None,
) -> list[str]:
    if not context_doc_id:
        return []
    chunks = (
        db.query(ContextChunk)
        .filter(ContextChunk.document_id == context_doc_id)
        .order_by(ContextChunk.chunk_index)
        .all()
    )
    if not chunks:
        return []
    settings = get_settings()
    if query.strip():
        query_emb = await embed_text(query, settings, api_key=api_key)
        chunk_data = [(c.id, c.embedding, c.content) for c in chunks]
        return retrieve_top_chunks(query_emb, chunk_data, top_k=5)
    return [c.content for c in chunks[:5]]


async def _run_generation(
    paper_id: str,
    body: GenerateRequest,
    user_id: str,
    byok_api_key: str | None,
    byok_base_url: str | None,
) -> None:
    db = SessionLocal()
    try:
        record = db.get(PaperRecord, paper_id)
        if record is None or record.owner_id != user_id:
            fail_job(paper_id, "Paper not found")
            return

        settings = get_settings()
        existing_paper = Paper.model_validate(record.data)
        template_id = body.template_id or record.template_id or existing_paper.template_id
        context_doc_id = body.context_document_id or record.context_document_id
        paper_metadata = (body.metadata or existing_paper.metadata).model_dump()

        context_chunks = await _retrieve_context_chunks(
            db, context_doc_id, body.prompt, byok_api_key
        )

        use_mock = body.use_mock or settings.use_mock_llm or settings.llm_provider == "mock"
        client = get_llm_client(
            settings,
            force_mock=use_mock,
            byok_api_key=byok_api_key,
            byok_base_url=byok_base_url,
        )
        template = _template_dict(template_id)

        set_job_phase(paper_id, "llm")
        logger.info(
            "Generating paper %s | provider=%s model=%s subject=%s",
            paper_id,
            settings.llm_provider,
            settings.ollama_model,
            paper_metadata.get("subject"),
        )

        paper, answer_key, provider = await generate_with_retry(
            client,
            prompt=body.prompt,
            context_chunks=context_chunks,
            template=template,
            paper_id=paper_id,
            owner_id=user_id,
            template_id=template_id,
            paper_metadata=paper_metadata,
            api_key=byok_api_key,
            force_mock_on_failure=use_mock,
        )

        logger.info(
            "Generation complete for paper %s | provider=%s sections=%d",
            paper_id,
            provider,
            len(paper.sections),
        )

        set_job_phase(paper_id, "saving")
        paper.context_document_id = context_doc_id
        record.data = paper.model_dump(mode="json")
        record.template_id = template_id
        record.updated_at = datetime.now(timezone.utc)
        record.context_document_id = context_doc_id

        ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == paper_id).first()
        if ak_record is None:
            ak_record = AnswerKeyRecord(
                id=paper_id + "-ak",
                paper_id=paper_id,
                data=answer_key.model_dump(mode="json"),
            )
            db.add(ak_record)
        else:
            ak_record.data = answer_key.model_dump(mode="json")
            ak_record.updated_at = datetime.now(timezone.utc)

        db.commit()

        response = GenerateResponse(
            paper=paper,
            answer_key=answer_key,
            marks_warning=paper.marks_mismatch_warning(),
            provider=provider,
        )
        complete_job(paper_id, response.model_dump(mode="json"))
    except Exception as exc:
        logger.error("Generation failed for paper %s: %s", paper_id, exc)
        fail_job(paper_id, str(exc))
    finally:
        db.close()


def _status_from_result(paper_id: str, result: dict) -> GenerationStatusResponse:
    ak_raw = result.get("answer_key")
    return GenerationStatusResponse(
        status="complete",
        paper_id=paper_id,
        phase="done",
        paper=Paper.model_validate(result["paper"]),
        answer_key=AnswerKey.model_validate(ak_raw) if ak_raw else None,
        marks_warning=result.get("marks_warning"),
        provider=result.get("provider"),
    )


def _try_recover_from_db(
    record: PaperRecord,
    job,
    db: Session,
) -> GenerationStatusResponse | None:
    """If the LLM finished and saved but complete_job didn't run, recover from DB."""
    paper = Paper.model_validate(record.data)
    if not any(section.questions for section in paper.sections):
        return None

    record_updated = record.updated_at
    if record_updated.tzinfo is None:
        record_updated = record_updated.replace(tzinfo=timezone.utc)
    before = job.paper_updated_at_before
    if before.tzinfo is None:
        before = before.replace(tzinfo=timezone.utc)
    if record_updated <= before:
        return None

    ak_record = db.query(AnswerKeyRecord).filter(AnswerKeyRecord.paper_id == record.id).first()
    if ak_record is None:
        return None
    answer_key = AnswerKey.model_validate(ak_record.data)
    if not answer_key.answers:
        return None

    result = GenerateResponse(
        paper=paper,
        answer_key=answer_key,
        marks_warning=paper.marks_mismatch_warning(),
        provider=get_settings().llm_provider,
    ).model_dump(mode="json")
    complete_job(record.id, result)
    logger.info("Recovered completed generation for paper %s from database", record.id)
    return _status_from_result(record.id, result)


_running_tasks: dict[str, asyncio.Task] = {}


@router.post(
    "/{paper_id}/generate",
    response_model=GenerationStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_paper(
    paper_id: str,
    body: GenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_byok_api_key: str | None = Header(default=None, alias="X-BYOK-API-Key"),
    x_byok_base_url: str | None = Header(default=None, alias="X-BYOK-Base-URL"),
):
    record = _get_paper_record(db, paper_id, user)
    settings = get_settings()

    use_mock = body.use_mock or settings.use_mock_llm or settings.llm_provider == "mock"
    if not use_mock and settings.llm_provider == "local":
        ollama_up = await check_ollama_available(settings)
        if not ollama_up:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Ollama is not reachable at {settings.ollama_base_url}",
            )

    if start_job(paper_id, paper_updated_at=record.updated_at) is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generation already in progress for this paper",
        )

    task = asyncio.create_task(
        _run_generation(
            paper_id,
            body,
            user.id,
            x_byok_api_key,
            x_byok_base_url,
        )
    )
    _running_tasks[paper_id] = task

    def _done(t: asyncio.Task) -> None:
        _running_tasks.pop(paper_id, None)
        if not t.cancelled() and t.exception():
            logger.error("Background generation task crashed for %s", paper_id, exc_info=t.exception())

    task.add_done_callback(_done)
    return GenerationStartResponse(paper_id=paper_id)


@router.get("/{paper_id}/generation-status", response_model=GenerationStatusResponse)
async def generation_status(
    paper_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = _get_paper_record(db, paper_id, user)
    job = get_job(paper_id)

    if job is None:
        return GenerationStatusResponse(status="idle", paper_id=paper_id)

    if job.status == "failed":
        return GenerationStatusResponse(
            status="failed",
            paper_id=paper_id,
            error=job.error,
            elapsed_seconds=job.elapsed_seconds(),
        )

    if job.status == "complete" and job.result:
        response = _status_from_result(paper_id, job.result)
        response.elapsed_seconds = job.elapsed_seconds()
        return response

    if job.status == "generating":
        recovered = _try_recover_from_db(record, job, db)
        if recovered:
            recovered.elapsed_seconds = job.elapsed_seconds()
            return recovered

        elapsed = job.elapsed_seconds()
        if elapsed > 900:
            fail_job(paper_id, "Generation timed out after 15 minutes. Try a shorter prompt or switch to llama3.2:3b.")
            return GenerationStatusResponse(
                status="failed",
                paper_id=paper_id,
                error=get_job(paper_id).error if get_job(paper_id) else "Timed out",
                elapsed_seconds=elapsed,
            )

        return GenerationStatusResponse(
            status="generating",
            paper_id=paper_id,
            phase=job.phase,
            elapsed_seconds=elapsed,
        )

    return GenerationStatusResponse(status="idle", paper_id=paper_id)


@router.patch("/{paper_id}/questions/{q_id}", response_model=Question)
async def regenerate_question(
    paper_id: str,
    q_id: str,
    body: RegenerateQuestionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_byok_api_key: str | None = Header(default=None, alias="X-BYOK-API-Key"),
    x_byok_base_url: str | None = Header(default=None, alias="X-BYOK-Base-URL"),
):
    record = _get_paper_record(db, paper_id, user)
    paper = Paper.model_validate(record.data)
    paper.context_document_id = record.context_document_id
    question = paper.find_question(q_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    section_instructions = None
    for section in paper.sections:
        if any(q.q_id == q_id for q in section.questions):
            section_instructions = section.instructions
            break

    settings = get_settings()
    use_mock = body.use_mock or settings.use_mock_llm or settings.llm_provider == "mock"
    if not use_mock and settings.llm_provider == "local":
        if not await check_ollama_available(settings):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Ollama is not reachable at {settings.ollama_base_url}",
            )

    client = get_llm_client(
        settings,
        force_mock=use_mock,
        byok_api_key=x_byok_api_key,
        byok_base_url=x_byok_base_url,
    )

    context_chunks = await _retrieve_context_chunks(
        db, record.context_document_id, body.prompt, x_byok_api_key
    )
    context = "\n\n---\n\n".join(context_chunks) if context_chunks else ""

    try:
        updated_question = await regenerate_with_retry(
            client,
            question=question,
            prompt=body.prompt,
            context=context,
            subject=paper.metadata.subject,
            section_instructions=section_instructions,
            api_key=x_byok_api_key,
            force_mock_on_failure=use_mock,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    for section in paper.sections:
        for i, q in enumerate(section.questions):
            if q.q_id == q_id:
                section.questions[i] = updated_question
                break

    paper.updated_at = datetime.now(timezone.utc)
    record.data = paper.model_dump(mode="json")
    record.updated_at = paper.updated_at
    db.commit()

    return updated_question
