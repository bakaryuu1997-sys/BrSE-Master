import os
from pathlib import Path

TEST_DATABASE_PATH = Path(__file__).resolve().parents[1] / f"test-{os.getpid()}.db"
USING_DEFAULT_TEST_DB = "DATABASE_URL" not in os.environ

os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DATABASE_PATH}")


def pytest_sessionstart(session) -> None:  # noqa: ARG001
    from app.db.base_class import Base
    from app.db.model_registry import import_all_models
    from app.db.session import engine

    import_all_models()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def pytest_sessionfinish(session, exitstatus) -> None:  # noqa: ARG001
    if USING_DEFAULT_TEST_DB:
        TEST_DATABASE_PATH.unlink(missing_ok=True)
