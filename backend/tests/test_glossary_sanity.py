import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal, engine
from app.db.base_class import Base
from app.models.glossary import GlossaryTerm


@pytest.fixture(autouse=True)
def setup_db():
    GlossaryTerm.__table__.drop(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    yield


def test_glossary_unique_constraint():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:8]
    english = f"Redundancy-{suffix}"
    japanese = f"冗長化-{suffix}"
    try:
        term1 = GlossaryTerm(
            id=f"test-{uuid.uuid4().hex[:8]}",
            english=english,
            japanese=japanese,
            vietnamese="Dự phòng",
            category="System Design",
            roles=["BrSE"],
        )
        db.add(term1)
        db.commit()

        term2 = GlossaryTerm(
            id=f"test-{uuid.uuid4().hex[:8]}",
            english=english,
            japanese=japanese,
            vietnamese="Dự phòng (duplicate)",
            category="System Design",
            roles=["BrSE"],
        )
        db.add(term2)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()
    finally:
        db.query(GlossaryTerm).filter(GlossaryTerm.english == english).delete()
        db.commit()
        db.close()


def test_glossary_case_sensitivity_duplicates():
    db = SessionLocal()
    term_id = f"id-{uuid.uuid4().hex[:8]}"
    try:
        db.add(
            GlossaryTerm(
                id=term_id,
                english=f"A-{uuid.uuid4().hex[:8]}",
                japanese=f"あ-{uuid.uuid4().hex[:8]}",
                vietnamese="A",
                category="Agile",
                roles=[],
            )
        )
        db.commit()

        db.add(GlossaryTerm(id=term_id, english="B", japanese="い", vietnamese="B", category="Agile", roles=[]))
        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()
    finally:
        db.query(GlossaryTerm).filter(GlossaryTerm.id == term_id).delete()
        db.commit()
        db.close()
