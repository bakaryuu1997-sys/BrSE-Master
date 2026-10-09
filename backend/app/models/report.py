import uuid
from datetime import UTC, datetime
from sqlalchemy import Column, String, DateTime, Text

from app.db.base_class import Base


class ReportRecord(Base):
    __tablename__ = "report_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    report_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    project_name = Column(String, index=True, nullable=True)
    owner = Column(String, nullable=True)

    # Daily report fields
    tasks_done = Column(Text, nullable=True)       # 本日完了したタスク (JSON array string)
    tasks_in_progress = Column(Text, nullable=True) # 現在進行中のタスク
    tasks_tomorrow = Column(Text, nullable=True)    # 明日の予定タスク
    blockers = Column(Text, nullable=True)          # 問題・ブロッカー
    progress_percent = Column(String(5), nullable=True)  # 進捗率 "70%"

    # Generated report text (cached)
    generated_jp = Column(Text, nullable=True)  # 生成された日本語レポート

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
