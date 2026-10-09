def import_all_models() -> None:
    """Register every SQLAlchemy model with Base.metadata for migrations."""
    import app.models.ai_prompt_profile  # noqa: F401
    import app.models.client_state  # noqa: F401
    import app.models.email_history  # noqa: F401
    import app.models.glossary  # noqa: F401
    import app.models.keigo  # noqa: F401
    import app.models.knowledge  # noqa: F401
    import app.models.meeting  # noqa: F401
    import app.models.meeting_minutes  # noqa: F401
    import app.models.meeting_task_status  # noqa: F401
    import app.models.memo  # noqa: F401
    import app.models.note  # noqa: F401
    import app.models.operation  # noqa: F401
    import app.models.power_tool  # noqa: F401
    import app.models.project  # noqa: F401
    import app.models.report  # noqa: F401
    import app.models.schedule  # noqa: F401
    import app.models.todo  # noqa: F401
