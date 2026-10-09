# Pull Request: Security Remediations (URL Scheme Validation & HTTP Security Headers)

- **Branch / Task:** `security/sec-remediations-audit`
- **Fixes:**
  - `SEC-01` (MEDIUM): URL Scheme Validation & SSRF Prevention tại `ProcessURLRequest` và `URLProcessor`.
  - `SEC-02` (LOW): Bổ sung các HTTP Security Headers phòng vệ (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) trong middleware FastAPI.

---

## 1. Summary

- **Root Cause (SEC-01 - URL Scheme Validation & SSRF):**
  - Endpoint xử lý URL ngoại vi (`/api/meetings/process-url`) nhận tham số `url` dạng chuỗi tự do không xác thực giao thức (scheme). Mặc dù hệ thống chạy localhost cá nhân, việc truyền trực tiếp URL không qua kiểm tra vào công cụ `yt-dlp` có nguy cơ cho phép các giao thức cục bộ nguy hiểm như `file:///`, `ftp://`, hoặc các URI schema bất thường.
  - **Khắc phục:**
    1. Bổ sung Pydantic `@field_validator("url")` vào schema [`ProcessURLRequest`](file:///z:/home/bakaryuu/Desktop/MyApp/brse/backend/app/schemas/meeting.py), chỉ chấp nhận schema `http` hoặc `https` và bắt buộc có domain (`netloc`).
    2. Bổ sung kiểm tra phòng vệ đa tầng (defense-in-depth) ngay tại đầu hàm [`URLProcessor.download_audio`](file:///z:/home/bakaryuu/Desktop/MyApp/brse/backend/app/services/url_processor.py) trước khi chuyển URL cho tiến trình trích xuất âm thanh.
- **Root Cause (SEC-02 - Missing Defensive Security Headers):**
  - Các phản hồi HTTP từ FastAPI chưa thiết lập các header bảo vệ tiêu chuẩn của OWASP/CWE nhằm chống MIME-sniffing, Clickjacking và rò rỉ referrer khi trình duyệt truy cập ứng dụng.
  - **Khắc phục:**
    - Cấu hình bổ sung trực tiếp trong middleware xử lý HTTP tại [`backend/app/main.py`](file:///z:/home/bakaryuu/Desktop/MyApp/brse/backend/app/main.py):
      - `X-Content-Type-Options: nosniff` (chống ép kiểu MIME)
      - `X-Frame-Options: SAMEORIGIN` (chống Clickjacking)
      - `Referrer-Policy: strict-origin-when-cross-origin` (bảo vệ quyền riêng tư đường dẫn)

---

## 2. Directory Tree of Changed Files

```text
backend/
├── app/
│   ├── main.py                           # Patched: Added defensive security headers in HTTP middleware
│   ├── schemas/
│   │   └── meeting.py                    # Patched: Added URL scheme & netloc field validator in ProcessURLRequest
│   └── services/
│       └── url_processor.py              # Patched: Added defense-in-depth scheme check before yt-dlp
└── tests/
    └── test_meeting_url_security.py      # Added: 5 regression tests covering valid URLs, scheme rejections & headers
```

---

## 3. Spec Adherence Table

| ID | Yêu cầu kiểm toán / Spec | Hiện trạng trước fix | Giải pháp khắc phục | Kết quả |
|---|---|---|---|---|
| `SEC-01` | Chặn các URL schema nguy hiểm (`file://`, `ftp://`, `data:`) gửi tới yt-dlp | `url: str` nhận chuỗi tùy ý | Pydantic validator + service check bắt buộc `http`/`https` + valid host | PASS |
| `SEC-02` | Thiết lập HTTP Security Headers theo khuyến nghị bảo mật OWASP API | Thiếu nosniff, SAMEORIGIN, strict-origin | Bổ sung trong middleware của `main.py` | PASS |

---

## 4. Test Verification (Regression Tests)

File test: [`backend/tests/test_meeting_url_security.py`](file:///z:/home/bakaryuu/Desktop/MyApp/brse/backend/tests/test_meeting_url_security.py)

1. `test_process_url_request_valid_urls`:
   - Xác thực schema chấp nhận các URL hợp lệ `http://` và `https://`.
2. `test_process_url_request_rejects_dangerous_schemes`:
   - Xác thực chặn ngay lập tức các URI nguy hiểm: `file:///etc/passwd`, `file:///C:/Windows/win.ini`, `ftp://...`, `gopher://...`, `data:...`, `javascript:...`.
3. `test_process_url_request_rejects_empty_or_missing_host`:
   - Xác thực chặn chuỗi rỗng, khoảng trắng hoặc URL thiếu host như `https:///just/a/path`.
4. `test_url_processor_download_audio_rejects_non_http`:
   - Xác thực `URLProcessor` ném ngoại lệ `ValueError` nếu nhận scheme không hợp lệ trước khi tải audio.
5. `test_api_security_headers_present`:
   - Xác thực request đến API phản hồi đầy đủ `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, cùng `X-Request-ID`.

---

## 5. Security Checklist

- [x] Không làm ảnh hưởng đến luồng localhost cá nhân hoặc cơ chế tải audio hợp lệ (YouTube, Vimeo...).
- [x] Áp dụng nguyên tắc Defense-in-Depth: kiểm tra ở cả tầng Pydantic Schema (API entry) và Service Layer (`URLProcessor`).
- [x] Header bảo mật không gây xung đột với CORS Middleware hoặc proxy Next.js.
- [x] Không thêm bất kỳ secret, hardcoded credential hay mock giả lập nào vào codebase.

---

## 6. Local Run Guide

Chạy bộ kiểm thử bảo mật bằng lệnh:
```bash
cd backend
venv/bin/pytest tests/test_meeting_url_security.py
```

Kiểm tra tiêu đề bảo mật trực tiếp:
```bash
curl -I http://127.0.0.1:8000/api/health
```

---

## 7. Reviewer Notes & Definition of Done

- Toàn bộ mã nguồn tuân thủ nghiêm ngặt `AGENTS.md` và `docs/PROJECT_SOURCE_OF_TRUTH.md`.
- Sẵn sàng chuyển giao sang bước tiếp theo trong quy trình: **/c5-test-execution** (Quản lý và thực thi kiểm thử tích hợp toàn diện).
