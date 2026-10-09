from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sql_injection_on_search():
    """
    Test xem endpoint search có bị lỗi SQL Injection khi nhập các ký tự đặc biệt không.
    """
    malicious_queries = [
        "' OR '1'='1",
        "'; DROP TABLE universal_notes; --",
        "admin'--",
        "'); SELECT * FROM pg_sleep(5); --"
    ]
    for q in malicious_queries:
        response = client.get(f"/note-index/search?q={q}")
        # Hệ thống phải trả về 200 OK (với kết quả rỗng) hoặc lỗi 422/400
        # NHƯNG tuyệt đối không được sập (500) hoặc rò rỉ dữ liệu.
        assert response.status_code != 500, f"System crashed with query: {q}"

def test_cors_security_policy():
    """
    Kiểm tra xem hệ thống có chặn các request từ domain không được phép không.
    """
    origin = "http://malicious-site.com"
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    # Nếu server cấu hình chặt chẽ, nó sẽ không trả về Allow-Origin cho site lạ
    if "access-control-allow-origin" in response.headers:
        allowed_origin = response.headers["access-control-allow-origin"]
        assert allowed_origin != "*", "CRITICAL: CORS is wide open! (Allow-Origin: *)"

def test_sensitive_files_exposure():
    """
    Đảm bảo các file nhạy cảm như .env không bị lộ qua API.
    """
    response = client.get("/.env")
    assert response.status_code == 404

def test_directory_traversal():
    """
    Kiểm tra lỗi Directory Traversal qua endpoint download media.
    """
    # Thử truy cập file hệ thống qua path giả lập
    fake_job_id = "../../../etc/passwd"
    response = client.get(f"/meetings/{fake_job_id}/media")
    assert response.status_code in [404, 400, 422]
