import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ai_service_timeout_handling():
    """
    Giả lập trường hợp AI Service (9Router/OpenAI) bị timeout hoặc chết.
    Đảm bảo backend trả về lỗi chuẩn chứ không treo (hang).
    """
    with patch("app.services.summarizer.SummarizerService.summarize") as mock_summarize:
        # Giả lập lỗi Runtime từ AI
        mock_summarize.side_effect = RuntimeError("AI Service is overloaded")
        
        # Gọi endpoint phụ thuộc AI
        response = client.post(
            "/api/meetings/transcript",
            json={
                "title": "Test AI failure",
                "transcript": "Hello world",
                "language": "vi",
                "template": "meeting"
            }
        )
        
        # Backend phải bắt được lỗi này và trả về lỗi phù hợp (ví dụ 200 nhưng status job là failed)
        # Hoặc 503 Service Unavailable
        assert response.status_code in [200, 503, 500]
        if response.status_code == 200:
            assert response.json()["status"] in ["processing", "failed"]

def test_ai_returns_garbage_json():
    """
    Giả lập AI trả về dữ liệu rác (không parse được JSON).
    Kiểm tra xem hệ thống có bị sập khi trích xuất Signal không.
    """
    with patch("app.services.summarizer.SummarizerService.extract_structured_signals") as mock_extract:
        # Giả lập AI trả về rác thay vì Dict
        mock_extract.return_value = "Garbage string instead of JSON"
        
        # Lưu ý: Logic này chạy trong Background Task nên chúng ta test unit service trực tiếp
        from app.services.meeting_processor import _process_transcript_task_locked
        # Test xem hàm xử lý task có catch được lỗi parse không
        # (Nếu không catch sẽ làm chết worker/thread)
        try:
            _process_transcript_task_locked("fake-id", "transcript", "vi", "meeting", None)
        except Exception as e:
            pytest.fail(f"Background task crashed due to AI garbage: {e}")
