from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_list_2026_holidays_contains_vn_and_jp() -> None:
    response = client.get("/api/calendar/holidays?year=2026")

    assert response.status_code == 200
    data = response.json()
    assert {"VN", "JP"} == set(data.keys())
    assert {"date": "2026-04-30", "name": "Ngày Giải phóng miền Nam"} in data["VN"]
    assert {"date": "2026-04-29", "name": "昭和の日"} in data["JP"]


def test_list_2027_holidays_supports_next_year_block() -> None:
    response = client.get("/api/calendar/holidays?year=2027")

    assert response.status_code == 200
    data = response.json()
    assert {"date": "2027-04-30", "name": "Ngày Giải phóng miền Nam"} in data["VN"]
    assert {"date": "2027-05-03", "name": "憲法記念日"} in data["JP"]


def test_check_release_date_warns_on_holiday() -> None:
    response = client.post("/api/calendar/check-release-date", json={"release_date": "2026-04-30"})

    assert response.status_code == 200
    data = response.json()
    assert data["has_warning"] is True
    assert "VN holiday: Ngày Giải phóng miền Nam" in data["warnings"]


def test_check_release_date_uses_payload_year_holidays() -> None:
    response = client.post("/api/calendar/check-release-date", json={"release_date": "2027-05-03"})

    assert response.status_code == 200
    data = response.json()
    assert data["has_warning"] is True
    assert "JP holiday: 憲法記念日" in data["warnings"]


def test_convert_timezone_from_jst_to_ict() -> None:
    response = client.post(
        "/api/calendar/convert-timezone",
        json={
            "date": "2026-04-30",
            "time": "10:00",
            "source_timezone": "Asia/Tokyo",
            "target_timezone": "Asia/Ho_Chi_Minh",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["source_datetime"] == "2026-04-30T10:00:00+09:00"
    assert data["target_datetime"] == "2026-04-30T08:00:00+07:00"
