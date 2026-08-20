"""In-memory generation job tracker (sufficient for local / single-worker dev)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

JobStatus = Literal["idle", "generating", "complete", "failed"]
JobPhase = Literal["starting", "llm", "saving", "done"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@dataclass
class GenerationJob:
    paper_id: str
    status: JobStatus = "generating"
    phase: JobPhase = "starting"
    started_at: datetime = field(default_factory=_utcnow)
    paper_updated_at_before: datetime = field(default_factory=_utcnow)
    finished_at: datetime | None = None
    error: str | None = None
    result: dict[str, Any] | None = None

    def elapsed_seconds(self) -> int:
        end = self.finished_at or _utcnow()
        return int((_as_utc(end) - _as_utc(self.started_at)).total_seconds())


_jobs: dict[str, GenerationJob] = {}


def start_job(paper_id: str, *, paper_updated_at: datetime) -> GenerationJob | None:
    """Return None if a job is already running for this paper."""
    existing = _jobs.get(paper_id)
    if existing and existing.status == "generating":
        return None
    job = GenerationJob(
        paper_id=paper_id,
        paper_updated_at_before=_as_utc(paper_updated_at),
    )
    _jobs[paper_id] = job
    return job


def get_job(paper_id: str) -> GenerationJob | None:
    return _jobs.get(paper_id)


def set_job_phase(paper_id: str, phase: JobPhase) -> None:
    job = _jobs.get(paper_id)
    if job and job.status == "generating":
        job.phase = phase


def complete_job(paper_id: str, result: dict[str, Any]) -> None:
    job = _jobs.get(paper_id)
    if job is None:
        return
    job.status = "complete"
    job.phase = "done"
    job.finished_at = _utcnow()
    job.result = result


def fail_job(paper_id: str, error: str) -> None:
    job = _jobs.get(paper_id)
    if job is None:
        return
    job.status = "failed"
    job.finished_at = _utcnow()
    job.error = error


def clear_job(paper_id: str) -> None:
    _jobs.pop(paper_id, None)
