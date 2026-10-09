import pytest

from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.migrate_glossary import seed_glossary_if_empty
from app.models.glossary import GlossaryTerm


@pytest.fixture(autouse=True)
def isolated_glossary_table():
    # Start from an empty table and leave it empty so seeded rows do not leak
    # into other tests that share the session-scoped test database.
    GlossaryTerm.__table__.drop(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    yield
    GlossaryTerm.__table__.drop(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)


def test_seed_glossary_if_empty_populates_empty_table():
    added = seed_glossary_if_empty()
    assert added > 100  # the bundled seed carries well over a thousand terms

    db = SessionLocal()
    try:
        assert db.query(GlossaryTerm).count() == added
        # Every seeded term must carry a Vietnamese translation so highlighting
        # can always show a meaning.
        assert db.query(GlossaryTerm).filter(GlossaryTerm.vietnamese == "").count() == 0
    finally:
        db.close()


def test_seed_glossary_if_empty_is_skipped_when_table_has_data():
    db = SessionLocal()
    try:
        db.add(
            GlossaryTerm(
                id="seed-guard-existing",
                english="existing term",
                japanese="既存用語",
                vietnamese="thuật ngữ có sẵn",
                roles=["BrSE"],
                category="Business",
            )
        )
        db.commit()
    finally:
        db.close()

    added = seed_glossary_if_empty()
    assert added == 0

    db = SessionLocal()
    try:
        # The guard must not touch a non-empty table.
        assert db.query(GlossaryTerm).count() == 1
    finally:
        db.close()
