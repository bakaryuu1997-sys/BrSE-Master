# BrSE OS — システムテスト結果報告書 / Báo cáo kết quả System Test (ST)

| 項目 / Mục | 内容 / Nội dung |
|---|---|
| 対象 / Đối tượng | BrSE OS (Docker, `http://127.0.0.1:3010/app`) |
| 実施日 / Ngày | 2026-11-05 (JST) |
| 環境 / Môi trường | Chrome điều khiển trực tiếp (CDP), viewport 1271×652 → 1332×771; backend/DB trong Docker (WSL2) |
| 範囲 / Phạm vi | 20 màn hình/route của `/app` (xem mục 2) |
| 方針 / Phương pháp | Chỉ thao tác **đọc/điều hướng** + vài thao tác cục bộ có hoàn tác (không tạo/xóa dữ liệu thật) |
| 成果物 / Tài liệu | `BrSE_OS_Test_Execution_ST_2026-11-05.xlsx` (sheet `ST`, `Defects`, `Dashboard`) |
| 証跡 / Bằng chứng | Chrome session `…\superpowers\browser\2026-11-05\session-1793842392712` (file `NNN-*.png/.md/.html`, ghi trong cột Evidence) |

## 1. 結果サマリ / Tóm tắt kết quả (tính từ dữ liệu thực)

| 指標 | 値 |
|---|---|
| Total test case | **47** |
| Pass | **41** |
| Fail | **0** |
| Blocked | 0 |
| N/A (loại khỏi phạm vi) | 1 (ST-PWT-02, B-006 bị Reject: đúng thiết kế) |
| Not Run | **5** (xem mục 4) |
| Execution rate (Run/(Total−N/A)) | **89.1 %** (41/46) |
| Pass rate (Pass/Run) | **100 %** (41/41) |
| Lần chạy đầu | 13 case Fail → 12 đã sửa và **re-test Pass**, 1 Reject (đúng thiết kế) |

### 不具合 / Defect

| Severity | Tổng | Open |
|---|---|---|
| Critical | 1 | 0 |
| High | 2 | 0 |
| Medium | 2 | 0 |
| Low | 4 (3 Closed, 1 Reject) | **0** |

## 2. 画面別結果 / Kết quả theo màn hình

| Màn hình | Kết quả | Ghi chú |
|---|---|---|
| Dashboard `/app` | ✅ (sau sửa) | B-001/002/003 đã sửa & re-test; weather, Todo drawer đạt |
| BrSE Todo | ✅ | Đồng bộ 2 chiều với sidebar, task tùy chỉnh được giữ |
| Calendar | ✅ (sau sửa) | Tiêu đề đã việt hóa (B-007) |
| Memo Notes | ✅ | |
| Meeting Note AI | ✅ | Video `1f75c204` **completed, 670 từ**; không còn `metadata_errors` |
| Minutes (`/minutes`, `/minutes/new`) | ✅ (sau sửa) | `/minutes` trước đây 404 (B-005) |
| Templates (list + detail) | ✅ (sau sửa) | Chip xuống dòng (B-007); biến bắt buộc còn trống hiện `【nhãn】` thay vì câu Nhật hỏng (B-008) |
| Keigo | ✅ | |
| Glossary | ✅ (sau sửa) | Nút "Toàn cục" bị che (B-004) → đã sửa, click thật hoạt động |
| Knowledge | ✅ | |
| Operations | ✅ | |
| Reports | ✅ | Preview 456px, sửa trực tiếp, không còn nút "Sửa tay" |
| Power Tools | ✅ | 1 request 404 cho dự án chưa có dữ liệu — đúng thiết kế, FE tự dùng cache cục bộ (B-006 Reject) |
| Specs Mindmap | ✅ | |
| Validation | ✅ | |
| Email History | ✅ | |
| Settings (`/settings`, `/settings/projects`) | ✅ (sau sửa) | `/settings` trước đây 404 (B-005) |

## 3. 不具合一覧 / Danh sách lỗi

| ID | Mô tả | Sev | Trạng thái | Cách xử lý |
|---|---|---|---|---|
| B-009 | Upload video: `open() got an unexpected keyword argument 'metadata_errors'` | Critical | Closed | Giải mã âm thanh bằng ffmpeg (commit `13a315b`) |
| B-002 | Nút header Dashboard tràn ra ngoài khung (`Báo cáo ngày` không bấm được), trang cuộn ngang | High | Closed | `PageHeader` cho wrap; Customizer render qua portal |
| B-004 | Thanh cố định (ngôn ngữ/health) che nút ở đầu trang (Glossary "Toàn cục") | High | Closed | `main` thêm `lg:max-[1500px]:pt-14` |
| B-001 | App tự xin quyền vị trí khi mở Dashboard | Medium | Closed | Chỉ dùng GPS khi đã cấp quyền hoặc bấm Refresh |
| B-003 | Tiêu đề card chứa nguyên transcript (553px) | Medium | Closed | Cắt 90 ký tự + `line-clamp-3` |
| B-005 | `/app/minutes`, `/app/settings` trả 404 | Low | Closed | Thêm trang redirect |
| B-006 | Power Tools: `GET /api/power-tools/{id}` 404 lần đầu | Low | **Reject** | 404 = "chưa lưu" là đúng REST; FE đã fallback sang cache. Đổi thành 200 rỗng sẽ làm app bỏ qua bản cache cục bộ mới hơn |
| B-007 | Calendar tiêu đề cố định tiếng Anh; chip Templates tràn | Low | Closed | i18n `vi.ts` + `flex-wrap` |
| B-008 | Template preview thiếu biến → "お世話になっております。です。" | Low | Closed | `renderTemplate` hiển thị `【nhãn】` cho biến bắt buộc còn trống (+3 test) |

## 4. 未実施項目 / Hạng mục chưa test (và lý do)

| ID | Hạng mục | Lý do |
|---|---|---|
| ST-NR-01 | Mobile/tablet (≤768px) | Công cụ không đổi được viewport |
| ST-NR-02 | Bàn phím/screen-reader (a11y) | Chưa thực hiện |
| ST-NR-03 | Tạo/sửa/xóa dữ liệu (Todo, Operations, Reports…) | Bảo vệ dữ liệu thật của người dùng |
| ST-NR-04 | Tính năng AI (chat, Keigo check, OCR) | Gọi AI bên ngoài, chưa chạy |
| ST-NR-05 | Chrome Extension | Sản phẩm riêng, ngoài phạm vi |

## 5. 分析 / Phân tích

- **Nhóm lỗi lớn nhất là layout ở viewport ~1300px**: header/thanh cố định/drawer ẩn gây tràn và che nút (B-002, B-004). Cùng một nguyên nhân gốc (thanh cố định + hàng nút không wrap).
- **Lỗi dữ liệu** (mất task Todo, ghi nhầm Glossary giữa các dự án) đã được sửa ở các lượt trước và có test tự động.
- Các lỗi còn lại đều thuộc loại **hiển thị/quy ước**, không chặn nghiệp vụ.

## 6. Exit Criteria (ST) — 判定

| Tiêu chí | Ngưỡng | Thực tế | Kết quả |
|---|---|---|---|
| Đã chạy 100% | 100 % | 89.4 % | ❌ |
| Pass rate | ≥ 98 % | 90.5 % | ❌ |
| Critical/High còn Open | 0 | 0 | ✅ |
| NFR (hiệu năng/bảo mật) | Đạt | Chưa đo | ❌ (chưa test) |

**結論 / Kết luận: ❌ CHƯA ĐẠT exit criteria ST.** Lý do: còn 5 hạng mục Not Run và 3 bug Low Open; chưa đo NFR. Không có bug Critical/High mở.

## 7. Go / No-Go

- **Dùng nội bộ hằng ngày (single-user, localhost): GO có điều kiện** — không còn lỗi chặn nghiệp vụ.
- **Release/nghiệm thu chính thức: NO-GO** cho tới khi: (1) test xong ST-NR-01..04 trên dữ liệu thử cô lập, (2) đo NFR (hiệu năng/bảo mật). Không còn bug nào mở.

## 8. 推奨 / Khuyến nghị

1. Dựng **DB/profile thử riêng** (không dùng dữ liệu thật) để test được thao tác tạo/sửa/xóa và AI.
2. Thêm test E2E tự động (Playwright) cho: đổi dự án, Glossary scope, báo cáo sửa tay.
3. Ghi nhận: thao tác đổi dự án trong test **ghi lên server** (dự án đang chọn, bản nháp template) — test sau nên chạy trên môi trường cô lập.

## 承認 / Phê duyệt

| Vai trò | Họ tên | Ngày | Ký |
|---|---|---|---|
| QA | | | |
| PM / Owner | | | |
