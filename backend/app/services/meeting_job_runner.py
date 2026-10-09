import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from fastapi import BackgroundTasks

from app.services.meeting_artifacts import update_status_meta

logger = logging.getLogger(__name__)


class JobScheduler(Protocol):
    def add_task(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any: ...


@dataclass(frozen=True)
class MeetingJob:
    job_id: str
    kind: str
    target: Callable[..., Any]
    args: tuple[Any, ...] = ()
    kwargs: dict[str, Any] | None = None


def _queue_meeting_job(
    *,
    job_id: str,
    kind: str,
    runner: str,
    status_message: str | None,
    progress_percent: int | None,
    metadata: dict[str, Any] | None,
) -> None:
    recovery_metadata = {"runner": runner, "job_kind": kind}
    if metadata:
        recovery_metadata.update(metadata)

    status_fields: dict[str, Any] = {
        "status": "queued",
        "current_step": "queued",
        "status_message": status_message or f"Queued {kind} job.",
        "recovery_metadata": recovery_metadata,
    }
    if progress_percent is not None:
        status_fields["progress_percent"] = progress_percent

    update_status_meta(job_id, **status_fields)


def run_meeting_job(job: MeetingJob) -> None:
    update_status_meta(
        job.job_id,
        status="processing",
        current_step="running",
        status_message=f"Running {job.kind} job.",
        recovery_metadata={"runner": "local", "job_kind": job.kind},
    )
    try:
        job.target(*job.args, **(job.kwargs or {}))
    except Exception as exc:
        logger.exception("Meeting job failed: %s", job.job_id)
        update_status_meta(
            job.job_id,
            status="failed",
            current_step="failed",
            progress_percent=100,
            status_message=str(exc),
            failure_reason=str(exc),
            recovery_metadata={"runner": "local", "job_kind": job.kind, "retryable": True},
        )
        raise


def enqueue_meeting_job(
    scheduler: JobScheduler,
    *,
    job_id: str,
    kind: str,
    target: Callable[..., Any],
    args: tuple[Any, ...] = (),
    kwargs: dict[str, Any] | None = None,
    status_message: str | None = None,
    progress_percent: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> MeetingJob:
    job = MeetingJob(job_id=job_id, kind=kind, target=target, args=args, kwargs=kwargs)
    _queue_meeting_job(
        job_id=job_id,
        kind=kind,
        runner="local",
        status_message=status_message,
        progress_percent=progress_percent,
        metadata=metadata,
    )
    scheduler.add_task(run_meeting_job, job)
    return job


def start_meeting_job_thread(
    *,
    job_id: str,
    kind: str,
    target: Callable[..., Any],
    args: tuple[Any, ...] = (),
    kwargs: dict[str, Any] | None = None,
    status_message: str | None = None,
    progress_percent: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> threading.Thread:
    job = MeetingJob(job_id=job_id, kind=kind, target=target, args=args, kwargs=kwargs)
    _queue_meeting_job(
        job_id=job_id,
        kind=kind,
        runner="local-thread",
        status_message=status_message,
        progress_percent=progress_percent,
        metadata=metadata,
    )
    thread = threading.Thread(target=run_meeting_job, args=(job,), daemon=True)
    thread.start()
    return thread


def enqueue_background_meeting_job(
    background_tasks: BackgroundTasks,
    *,
    job_id: str,
    kind: str,
    target: Callable[..., Any],
    args: tuple[Any, ...] = (),
    kwargs: dict[str, Any] | None = None,
    status_message: str | None = None,
    progress_percent: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> MeetingJob:
    return enqueue_meeting_job(
        background_tasks,
        job_id=job_id,
        kind=kind,
        target=target,
        args=args,
        kwargs=kwargs,
        status_message=status_message,
        progress_percent=progress_percent,
        metadata=metadata,
    )