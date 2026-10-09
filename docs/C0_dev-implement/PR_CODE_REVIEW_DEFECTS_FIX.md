# Pull Request: Patch Code Review Defects (Zip Slip, Memory DoS, Query Optimization, Container Hardening)

- **Branch / Task:** `bugfix/c1-code-review-defects`
- **Fixes:**
  - `BUG-CR-01` (BLOCKER): CWE-22 Zip Slip / Path Traversal tại `POST /api/settings/restore`.
  - `BUG-CR-02` (CRITICAL): CWE-400 Uncontrolled Memory Consumption & Zip Bomb tại `POST /api/settings/restore`.
  - `BUG-CR-03` (CRITICAL): CWE-208 Timing Attack bảo mật token (`secrets.compare_digest`).
  - `BUG-CR-04` (MAJOR): CWE-290 IP Spoofing & Loose private IP checks (`ipaddress.ip_address`).
  - `BUG-CR-05` (MAJOR): CWE-400 In-Memory full-table scan trên Glossary role filter & unbounded page size.
  - `BUG-CR-06` (MAJOR): Docker CIS Benchmark - Ràng buộc localhost trên port 3010.
  - `BUG-CR-07` (MINOR): Xóa địa chỉ IP dev cứng trong Next.js `allowedDevOrigins`.
  - `BUG-CR-08` (MINOR): Chuẩn hóa mã phản hồi HTTP `201 Created` cho các endpoint tạo tài nguyên Operations.
  - `BUG-CR-09` (MINOR): Mã hóa an toàn `encodeURIComponent(jobId)` trên toàn bộ client gọi API Meeting.

---

## 1. Summary

- **Root Cause 1 (Zip Slip & DoS):** Endpoint `/api/settings/restore` nạp trực tiếp toàn bộ dữ liệu file tải lên vào bộ nhớ RAM không kiểm tra kích thước tối đa và lấy trực tiếp `zip_file.namelist()` làm đường dẫn ghi đĩa cục bộ, cho phép ghi đè file tùy ý ra ngoài thư mục dự án khi kẻ tấn công chèn `../../`.
  - **Khắc phục:** Giới hạn tải lên 100MB qua streaming chunked read, chặn Zip Bomb với giới hạn giải nén 500MB, và ép kiểm tra đường dẫn an toàn qua `ALLOWED_EXTRACT_ROOTS` (`upload_folder`, `memo_folder`, `transcript_folder`).
- **Root Cause 2 (Glossary In-Memory Scan):** Endpoint `/api/glossary/` sử dụng `query.all()` để tải toàn bộ bảng từ DB vào RAM trước khi duyệt mảng lọc `role`, đồng thời cho phép `size` tới 10,000.
  - **Khắc phục:** Hạ mức trần `size` về 200 và chuyển mệnh đề lọc `role` trực tiếp xuống tầng DB qua ép kiểu JSON/String matching tương thích cả SQLite và PostgreSQL.
- **Root Cause 3 (Container & Network Hardening):** Port frontend `3010` mở trên `0.0.0.0` trong `docker-compose.yml` làm lộ giao diện nội bộ ra toàn mạng LAN/Wi-Fi; Next.js dev server ghi cứng IP cục bộ cũ.
  - **Khắc phục:** Đổi bind port về `127.0.0.1:3010:3000` và chuyển `allowedDevOrigins` sang đọc linh hoạt từ `process.env.ALLOWED_DEV_ORIGINS`.
- **Root Cause 4 (API RESTful Standard & Client Encoding):** POST endpoint tại `operations.py` trả về `200 OK` thay vì `201 Created`; client `meetings.ts` thiếu `encodeURIComponent` ở một số hàm sinh URL.
  - **Khắc phục:** Bổ sung `status_code=status.HTTP_201_CREATED` cho 4 endpoint POST trong operations và chuẩn hóa 100% `encodeURIComponent(jobId)` trong `meetings.ts`.

---

## 2. Directory Tree of Changed Files

```text
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── settings.py           # Patched: Zip Slip guard, 100MB stream limit, 500MB zip bomb guard
│   │       ├── glossary.py           # Patched: size le=200, push role filter down to DB
│   │       └── operations.py         # Patched: status_code=201 for resource creation POST endpoints
│   └── core/
│       └── security.py               # Verified: secrets.compare_digest and ipaddress.ip_address compliant
└── tests/
    └── test_settings_restore_security.py # Added: Regression test suite for restore security guards

frontend/
├── lib/
│   └── meetings.ts                   # Patched: Unified encodeURIComponent(jobId) across all API calls
└── next.config.mjs                   # Patched: Dynamic allowedDevOrigins, removed hardcoded 192.168.157.120

docker-compose.yml                    # Patched: Frontend ports bound to 127.0.0.1:3010:3000
```

---

## 3. Spec Adherence Table

| Finding ID | Severity | File | Before | After | Trạng thái |
|---|---|---|---|---|:---:|
| `BUG-CR-01` | 🔴 BLOCKER | `backend/app/api/routes/settings.py` | `dest_path = name` ghi file không kiểm tra | Kiểm tra `ALLOWED_EXTRACT_ROOTS`, ném HTTP 400 nếu path traversal | ✅ FIXED |
| `BUG-CR-02` | 🟠 CRITICAL | `backend/app/api/routes/settings.py` | `await file.read()` nạp toàn bộ vào RAM | Stream read tối đa 100MB (HTTP 413), chặn Zip Bomb > 500MB (HTTP 400) | ✅ FIXED |
| `BUG-CR-03` | 🟠 CRITICAL | `backend/app/core/security.py` | N/A (đã kiểm tra) | Dùng `secrets.compare_digest(token, secret_key)` chuẩn constant-time | ✅ PASS |
| `BUG-CR-04` | 🟡 MAJOR | `backend/app/core/security.py` | N/A (đã kiểm tra) | Dùng `ipaddress.ip_address` xác thực private / loopback RFC 1918 | ✅ PASS |
| `BUG-CR-05` | 🟡 MAJOR | `backend/app/api/routes/glossary.py` | `query.all()` kéo toàn bộ bảng vào RAM | `cast(roles, String).like(...)` lọc trên DB; `size <= 200` | ✅ FIXED |
| `BUG-CR-06` | 🟡 MAJOR | `docker-compose.yml` | `3010:3000` bind 0.0.0.0 | `127.0.0.1:3010:3000` chỉ bind loopback máy host | ✅ FIXED |
| `BUG-CR-07` | 🔵 MINOR | `frontend/next.config.mjs` | Hardcode IP `192.168.157.120` | Đọc `ALLOWED_DEV_ORIGINS` linh hoạt từ biến môi trường | ✅ FIXED |
| `BUG-CR-08` | 🔵 MINOR | `backend/app/api/routes/operations.py` | Trả về 200 OK mặc định | Bổ sung `status_code=status.HTTP_201_CREATED` cho các POST routes | ✅ FIXED |
| `BUG-CR-09` | 🔵 MINOR | `frontend/lib/meetings.ts` | Một số hàm gọi `${jobId}` trực tiếp | Đồng bộ `encodeURIComponent(jobId)` trên toàn bộ 11 hàm liên quan | ✅ FIXED |

---

## 4. Test Verification

- **Bộ kiểm thử hồi quy mới:** `backend/tests/test_settings_restore_security.py`
  - `test_restore_rejects_missing_database_dump`: Kiểm tra tính toàn vẹn định dạng sao lưu (HTTP 400).
  - `test_restore_rejects_zip_slip_path_traversal`: Kiểm tra phát hiện và ngăn chặn tấn công Path Traversal `../../evil.txt` (HTTP 400).
  - `test_restore_rejects_zip_slip_absolute_path`: Kiểm tra ngăn chặn đường dẫn tuyệt đối độc hại `/etc/...` (HTTP 400).
  - `test_restore_accepts_valid_archive`: Khôi phục thành công với archive hợp lệ (HTTP 200).
- **Bộ kiểm thử hiện hữu:** `backend/tests/test_glossary.py` đảm bảo lọc theo role vẫn hoạt động chính xác khi chuyển sang truy vấn tầng cơ sở dữ liệu.

---

## 5. Security Checklist

- [x] Không còn nguy cơ Zip Slip Arbitrary File Overwrite (Path Traversal).
- [x] Đã có giới hạn dung lượng tải lên 100MB và giới hạn giải nén 500MB (chống DoS / Zip Bomb).
- [x] So sánh token xác thực bằng thuật toán Constant-Time (`secrets.compare_digest`).
- [x] Nhận diện IP nội bộ chuẩn xác bằng thư viện `ipaddress`.
- [x] Giới hạn phơi bày cổng dịch vụ web (`127.0.0.1` loopback only).
- [x] Không để lộ thông tin IP cá nhân trong mã nguồn tĩnh.

---

## 6. Local Run Guide

1. **Khởi động backend & frontend:**
   ```bash
   bash scripts/start-brse-stack.sh
   ```
2. **Chạy kiểm thử an toàn & hồi quy:**
   ```bash
   cd backend && venv/bin/python -m pytest tests/test_settings_restore_security.py tests/test_glossary.py
   ```
3. **Chạy kiểm tra toàn diện chất lượng dự án:**
   ```bash
   bash scripts/verify-brse.sh --quick
   ```

---

## 7. Reviewer Notes & Tracker Update

> [!NOTE]
> Sau khi PR này được hợp nhất (merge):
> - Cập nhật trạng thái các lỗi từ `OPEN` sang `FIXED` trong báo cáo audit/tracker của `/c5-test-execution`.
> - Sẵn sàng cho phiên chạy `/c5-test-execution` tiếp theo để xác nhận kết quả kiểm thử toàn diện trên pipeline.
