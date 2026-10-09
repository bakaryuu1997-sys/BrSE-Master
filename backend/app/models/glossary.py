from sqlalchemy import Column, String, Text, JSON, UniqueConstraint
from app.db.base_class import Base

class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id = Column(String, primary_key=True, index=True)
    english = Column(String, index=True, nullable=False, unique=False)
    japanese = Column(String, index=True, nullable=False, unique=False)
    kana = Column(String, index=True, nullable=True)
    vietnamese = Column(Text, nullable=False)
    roles = Column(JSON, nullable=False, default=list)  # List of strings
    category = Column(String, index=True, nullable=False)
    note = Column(Text, nullable=True)
    example = Column(Text, nullable=True)

    # Added unique constraint for term pair to prevent noise
    __table_args__ = (
        UniqueConstraint("japanese", "english", name="uq_glossary_term_pair"),
    )
