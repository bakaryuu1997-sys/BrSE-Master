from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.schedule import PersonalScheduleRecord
from app.schemas.calendar import (
    PersonalScheduleCreate,
    PersonalScheduleRead,
    PersonalScheduleUpdate,
    ReleaseDateCheckRequest,
    ReleaseDateCheckResponse,
    TimezoneConvertRequest,
    TimezoneConvertResponse,
)

router = APIRouter()

HOLIDAYS_BY_YEAR = {
    2026: {
        "VN": {
            date(2026, 1, 1): "Tết Dương lịch",
            date(2026, 2, 16): "Tết Nguyên đán",
            date(2026, 2, 17): "Tết Nguyên đán",
            date(2026, 2, 18): "Tết Nguyên đán",
            date(2026, 4, 30): "Ngày Giải phóng miền Nam",
            date(2026, 5, 1): "Quốc tế Lao động",
            date(2026, 9, 2): "Quốc khánh",
        },
        "JP": {
            date(2026, 1, 1): "元日",
            date(2026, 1, 12): "成人の日",
            date(2026, 2, 11): "建国記念の日",
            date(2026, 2, 23): "天皇誕生日",
            date(2026, 4, 29): "昭和の日",
            date(2026, 5, 3): "憲法記念日",
            date(2026, 5, 4): "みどりの日",
            date(2026, 5, 5): "こどもの日",
            date(2026, 11, 3): "文化の日",
            date(2026, 11, 23): "勤労感謝の日",
        },
    },
    2027: {
        "VN": {
            date(2027, 1, 1): "Tết Dương lịch",
            date(2027, 2, 5): "Tết Nguyên đán (ước tính)",
            date(2027, 2, 6): "Tết Nguyên đán (ước tính)",
            date(2027, 2, 7): "Tết Nguyên đán (ước tính)",
            date(2027, 2, 8): "Tết Nguyên đán (ước tính)",
            date(2027, 2, 9): "Tết Nguyên đán (ước tính)",
            date(2027, 2, 10): "Tết Nguyên đán (ước tính)",
            date(2027, 4, 16): "Giỗ Tổ Hùng Vương (ước tính)",
            date(2027, 4, 30): "Ngày Giải phóng miền Nam",
            date(2027, 5, 1): "Quốc tế Lao động",
            date(2027, 5, 3): "Nghỉ bù Quốc tế Lao động (ước tính)",
            date(2027, 9, 2): "Quốc khánh",
        },
        "JP": {
            date(2027, 1, 1): "元日",
            date(2027, 1, 11): "成人の日",
            date(2027, 2, 11): "建国記念の日",
            date(2027, 2, 23): "天皇誕生日",
            date(2027, 3, 21): "春分の日",
            date(2027, 3, 22): "休日",
            date(2027, 4, 29): "昭和の日",
            date(2027, 5, 3): "憲法記念日",
            date(2027, 5, 4): "みどりの日",
            date(2027, 5, 5): "こどもの日",
            date(2027, 7, 19): "海の日",
            date(2027, 8, 11): "山の日",
            date(2027, 9, 20): "敬老の日",
            date(2027, 9, 23): "秋分の日",
            date(2027, 10, 11): "スポーツの日",
            date(2027, 11, 3): "文化の日",
            date(2027, 11, 23): "勤労感謝の日",
        },
    },
}


@router.get("/holidays")
def list_holidays(year: int = 2026) -> dict[str, list[dict[str, str]]]:
    yearly_holidays = HOLIDAYS_BY_YEAR.get(year, {"VN": {}, "JP": {}})
    return {
        country: [{"date": holiday.isoformat(), "name": name} for holiday, name in holidays.items()]
        for country, holidays in yearly_holidays.items()
    }


@router.get("/schedules", response_model=list[PersonalScheduleRead])
def list_schedules(db: Session = Depends(get_db)):
    return (
        db.query(PersonalScheduleRecord)
        .order_by(PersonalScheduleRecord.date.asc(), PersonalScheduleRecord.start_time.asc())
        .all()
    )


@router.post("/schedules", response_model=PersonalScheduleRead, status_code=201)
def create_schedule(payload: PersonalScheduleCreate, db: Session = Depends(get_db)):
    record = PersonalScheduleRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/schedules/{schedule_id}", response_model=PersonalScheduleRead)
def update_schedule(schedule_id: str, payload: PersonalScheduleUpdate, db: Session = Depends(get_db)):
    record = db.query(PersonalScheduleRecord).filter(PersonalScheduleRecord.id == schedule_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    record = db.query(PersonalScheduleRecord).filter(PersonalScheduleRecord.id == schedule_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(record)
    db.commit()
    return {"message": "Schedule deleted"}


@router.post("/check-release-date", response_model=ReleaseDateCheckResponse)
def check_release_date(payload: ReleaseDateCheckRequest) -> ReleaseDateCheckResponse:
    warnings: list[str] = []
    if payload.release_date.weekday() >= 5:
        warnings.append("Release date falls on a weekend.")

    yearly_holidays = HOLIDAYS_BY_YEAR.get(payload.release_date.year, {"VN": {}, "JP": {}})
    for country, holidays in yearly_holidays.items():
        if payload.release_date in holidays:
            warnings.append(f"{country} holiday: {holidays[payload.release_date]}")

    return ReleaseDateCheckResponse(release_date=payload.release_date, has_warning=bool(warnings), warnings=warnings)


@router.post("/convert-timezone", response_model=TimezoneConvertResponse)
def convert_timezone(payload: TimezoneConvertRequest) -> TimezoneConvertResponse:
    source = ZoneInfo(payload.source_timezone)
    target = ZoneInfo(payload.target_timezone)
    source_dt = datetime.combine(payload.date, payload.time, tzinfo=source)
    target_dt = source_dt.astimezone(target)
    return TimezoneConvertResponse(
        source_datetime=source_dt.isoformat(),
        target_datetime=target_dt.isoformat(),
        source_timezone=payload.source_timezone,
        target_timezone=payload.target_timezone,
    )
