"""
keigo.py — SQLAlchemy model for Keigo Check history records.
"""

from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db.base_class import Base


class KeigoCheckRecord(Base):
    __tablename__ = "keigo_checks"

    id = Column(Integer, primary_key=True, index=True)
    original_text = Column(Text, nullable=False)
    improved_text = Column(Text, nullable=True)
    level = Column(String(50), nullable=True)       # 丁寧語 / 敬語 / 謙譲語 / カジュアル
    score = Column(Integer, nullable=True)           # 0-100
    summary_vi = Column(Text, nullable=True)         # Summary in Vietnamese
    changes_json = Column(Text, nullable=True)       # JSON string of changes array
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
