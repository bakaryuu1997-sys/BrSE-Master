# BrSE OS — システムテスト結果報告書 / Báo cáo kết quả System Test (ST)

| 項目 / Mục | 内容 / Nội dung |
|---|---|
| 対象 / Đối tượng | BrSE OS (Docker, `http://127.0.0.1:3010/app`) |
| 実施日 / Ngày | 2026-11-05 (JST) |
| 環境 / Môi trường | Chrome điều khiển trực tiếp (CDP), viewport 1271×652 → 1332×771; backend/DB trong Docker (WSL2) |
| 範囲 / Phạm vi | 20 màn hình/route của `/app` (xem mục 2) |
| 方針 / Phương pháp | Lượt 1: chỉ **đọc/điều hướng** trên `:3010`. Lượt 2: test tạo/sửa/xóa và mobile 375px trên stack **cô lập `:3011`** (DB riêng, Playwright MCP), không đụng dữ liệu thật |
| 成果物 / Tài liệu | `BrSE_OS_Test_Execution_ST_2026-11-05.xlsx` (sheet `ST`, `Defects`, `Dashboard`) |
| 証跡 / Bằng chứng | Chrome session `…\superpowers\browser\2026-11-05\session-1793842392712` (file `NNN-*.png/.md/.html`, ghi trong cột Evidence) |

## 1. 結果サマリ / Tóm tắt kết quả (tính từ dữ liệu thực)

| 指標 | 値 |
|---|---|
| Total test case | **78** (47 ở lượt 1 + 31 ở lượt 2: mobile 375px, tạo/sửa/xóa, AI, NFR, a11y, dữ liệu) |
| Pass | **65** |
| Fail | **6** (ST-AI-01/B-016, ST-NFR-03/B-017, ST-NFR-04/B-018, ST-A11Y-02/B-020, ST-DAT-01/B-021, ST-DAT-02/B-022 — đều đang mở) |
| Blocked | **1** (ST-AI-03 OCR: thiếu model local, xem mục 4) |
| N/A (loại khỏi phạm vi) | 1 (ST-PWT-02, B-006 bị Reject: đúng thiết kế) |
| Not Run | **5** (xem mục 4; NR-01, NR-03, NR-04 mới phủ một phần) |
| Execution rate ((Pass+Fail+Blocked)/(Total−N/A)) | **93.5 %** (72/77) |
| Pass rate (Pass/Run) | **90.3 %** (65/72) |
| Lần chạy đầu | 25 case Fail → 19 đã sửa và **re-test Pass**, 1 Reject, 6 còn mở |
| Lượt 2 (2026-11-05, :3011 cô lập) | Tìm thêm 13 bug (B-010…B-022): 7 đã sửa và re-test Pass; **6 còn mở: B-016, B-017 (Medium); B-018, B-020, B-021, B-022 (Low)** |

### 不具合 / Defect

| Severity | Tổng | Open |
|---|---|---|
| Critical | 1 | 0 |
| High | 2 | 0 |
| Medium | 10 | **2** (B-016, B-017) |
| Low | 9 (4 Closed, 1 Reject, 4 Open) | **4** (B-018, B-020, B-021, B-022) |

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
| B-010 | Operations Kanban: kéo thả/mũi tên đổi trạng thái đều `window.location.reload()` cả trang | Low | Closed | Dùng `useSaveOperationMutation` (tự invalidate query) + helper `nextKanbanStatus`/`buildStatusChangeInput` (commit `1829db4`, +2 test) |
| B-011 | Reports: sửa tay Preview rồi Lưu → server lưu bản tự sinh, mất bản sửa tay | Medium | Closed | `resolveReportTextToSave(preview, live)` (commit `1829db4`, +3 test). Bản ghi cũ lưu trước khi sửa **không** được phục hồi |
| B-012 | Glossary ở 375px: nút Dự án/Toàn cục/CSV/Anki bị cắt, không bấm được | Medium | Closed | `shrink-0` → `max-w-full sm:shrink-0` (commit `743c1ad`) |
| B-013 | Calendar ở 375px: select múi giờ vượt mép phải (426px) | Medium | Closed | `min-w-0` + `w-full`. **Chưa commit**: nằm trong khối form mới chưa commit của chính trang Calendar |
| B-014 | Minutes mới ở 375px: cuộn ngang 450px | Medium | Closed | `min-w-0` cho 2 cột lưới. **Chưa commit**: cùng file có thay đổi cũ chưa commit |
| B-021 | Glossary tĩnh (`lib/glossary`): 257 thuật ngữ nhưng chỉ 247 id duy nhất — 10 id trùng với nội dung khác nhau (rollback, deployment, dependency, hotfix, unit-test, integration-test, migration, asynchronous, authentication, authorization); gây kết quả trùng ở command palette/live search | Low | **Open** | Chưa sửa. Đã khoá trong `glossaryData.golden.test.ts` để việc khử trùng sau này là thay đổi có chủ đích |
| B-022 | `mergeSavedItems()` ném `TypeError` (`localeCompare`) với mục tuỳ biến thiếu `title` khi không truyền hàm dịch `t`; `readProjectState` gọi đúng kiểu đó | Low | **Open** | Chưa sửa (giữ nguyên hành vi khi tách file). Hướng sửa: mặc định `title` về "Linked operation todo" khi không có `t` |
| B-019 | a11y — drawer "Tạo mới" của Operations: không `role="dialog"`/`aria-modal`, focus không vào drawer, Tab ra trang nền (42/60 lần), Escape không đóng | Medium | Closed | Hook dùng chung `useDialogFocus` (focus vào, giữ Tab, Escape, trả focus) + `role/aria-modal/aria-label` (+5 test). Đo lại: 0/60 ra ngoài, Escape đóng, focus về nút mở. `Drawer.tsx` dùng chung chưa có focus trap, chưa sửa |
| B-020 | a11y tĩnh: 2 thẻ `<main>` lồng nhau ở mọi màn; ô nhập chỉ có placeholder (Reports 9, Todo 3, Glossary 3, Operations 2); nút không tên (Operations 2, Reports 1) | Low | **Open** | Chưa sửa: bỏ `<main>` thừa ở layout hoặc ở page, thêm `aria-label`/`<label>` |
| B-017 | Bật `BRSE_API_SECRET` (cách bảo vệ khi mở tunnel) làm giao diện web hỏng toàn bộ và **im lặng**: 13/15 API của trang Operations trả 401, frontend không có mã gửi `X-BrSE-Token` (chỉ Chrome Extension có `getAuthHeaders`) | Medium | **Open** | Cần quyết định thiết kế: nếu Next tự gắn token cho mọi request thì secret mất tác dụng với tunnel. Hướng đúng: Cloudflare Access hoặc đăng nhập; tối thiểu UI nên báo lỗi 401 rõ ràng. Hiện chỉ an toàn khi dùng thuần localhost (secret rỗng) |
| B-018 | `/api/ai/status` (route công khai) lộ `base_url` nội bộ (172.21.x.x:20128) và danh sách model; `?check_runtime=true` cho phép kích hoạt gọi ra ngoài không cần token | Low | **Open** | Trả bản rút gọn khi chưa xác thực |
| B-016 | AI chat `/api/ai/chat` chập chờn: combo 9router `free-logic` có member hỏng (`gh/gemini-3.1-pro-preview` → 400 `model_not_available_for_integrator`, không fallback); 3 lần gọi cho 400 / 200 (1.2s) / 503 sau **97s**. Trường `model` trong request bị bỏ qua (luôn `free-logic`) | Medium | **Open** | Gốc ở cấu hình combo 9router (ngoài mã BrSE): gỡ member hỏng khỏi combo. Phía BrSE nên cân nhắc timeout ngắn hơn và retry khi 503 |
| B-015 | Mở `/minutes/new` → sau ~10s tự tạo bản ghi rỗng trong DB (và hộp thoại `beforeunload` ở trang trống) | Medium | Closed | `hasMinutesDraftChanged` so với snapshot đầu (commit `1403263`, +2 test). Sửa thật vẫn tự lưu sau ~10s |

## 4. 未実施項目 / Hạng mục chưa test (và lý do)

| ID | Hạng mục | Lý do |
|---|---|---|
| ST-NR-01 | Mobile/tablet (≤768px) | **Một phần.** Đã test 12 màn ở 375px (ST-MOB-01…12). Chưa test: meeting-note, history, power-tools, specs-mindmap, validation, Kanban, drawer/modal, tablet 768px |
| ST-NR-02 | Bàn phím/screen-reader (a11y) | **Một phần** (ST-A11Y-01/02): drawer Operations bằng bàn phím thật + kiểm tra tĩnh 4 màn. Chưa test: các modal khác, thứ tự Tab từng trang, screen reader thật |
| ST-NR-03 | Tạo/sửa/xóa dữ liệu | **Một phần**, chạy trên stack cô lập `:3011` (ST-CRD-01…08). Chưa test: Todo tạo/archive dự án, Reports đổi dự án. Glossary không có nút thêm thuật ngữ thủ công (chỉ CSV/trích từ họp) |
| ST-NR-04 | Tính năng AI (chat, Keigo check, OCR) | **Một phần, chỉ gọi API** (ST-AI-01..03). Chat: Fail (B-016). Keigo: Pass (14.1s). OCR: **Blocked** — không có `GEMINI_API_KEY` nên backend dùng model local `qwen3.5:9b`, Ollama chưa có model nào (404). Cần `ollama pull qwen3.5:9b` hoặc đặt `GEMINI_API_KEY`. Lưu ý: `PROJECT_SOURCE_OF_TRUTH.md` ghi OCR mặc định là Gemini, nhưng khi không có key thực tế rơi về local. Môi trường: 9router không tự chạy sau khi restart WSL, phải chạy `scripts/start-brse-stack.sh` |
| ST-NR-05 | Chrome Extension | Sản phẩm riêng, ngoài phạm vi |

Quan sát chưa ghi thành bug: Dashboard cho thấy 24 nút/link nhỏ hơn 32px ở 375px (chưa đánh giá theo chuẩn vùng chạm).

## 5. 分析 / Phân tích

- **Nhóm lỗi lớn nhất là layout ở viewport ~1300px**: header/thanh cố định/drawer ẩn gây tràn và che nút (B-002, B-004). Cùng một nguyên nhân gốc (thanh cố định + hàng nút không wrap).
- **Lỗi dữ liệu** (mất task Todo, ghi nhầm Glossary giữa các dự án) đã được sửa ở các lượt trước và có test tự động.
- Các lỗi còn lại đều thuộc loại **hiển thị/quy ước**, không chặn nghiệp vụ.

## 6. Exit Criteria (ST) — 判定

| Tiêu chí | Ngưỡng | Thực tế | Kết quả |
|---|---|---|---|
| Đã chạy 100% | 100 % | 93.5 % (72/77) | ❌ |
| Pass rate (Pass/Run) | ≥ 98 % | 90.3 % (65/72) | ❌ |
| Critical/High còn Open | 0 | 0 (còn 2 Medium: B-016, B-017; 4 Low: B-018, B-020, B-021, B-022) | ✅ |
| NFR hiệu năng | Đạt | Đạt (ST-NFR-01) | ✅ |
| NFR bảo mật | Đạt | Một phần: API được bảo vệ đúng (ST-NFR-02 Pass) nhưng UI không dùng được khi có secret (B-017) và `ai/status` lộ cấu hình (B-018) | ❌ |

**結論 / Kết luận: ❌ CHƯA ĐẠT exit criteria ST.** Lý do: còn 5 hạng mục Not Run (NR-01, NR-03, NR-04 mới phủ một phần), 1 case Fail (AI chat, B-016), 1 case Blocked (OCR) 6 case Fail (B-016/B-017/B-018/B-020/B-021/B-022) và NFR bảo mật chưa đạt. Không có bug Critical/High mở; còn 2 Medium (B-016, B-017) và 4 Low (B-018, B-020, B-021, B-022).

## 7. Go / No-Go

- **Dùng nội bộ hằng ngày (single-user, localhost): GO có điều kiện** — không còn lỗi chặn nghiệp vụ.
- **Release/nghiệm thu chính thức: NO-GO** cho tới khi: (1) xử lý B-016, B-017, B-018 và thông OCR (model local hoặc `GEMINI_API_KEY`), (2) test xong phần còn lại của ST-NR-01..04 trên dữ liệu thử cô lập, (3) quyết định cách bảo vệ khi mở ra ngoài localhost (hiện **không nên mở tunnel** với `BRSE_API_SECRET` vì UI sẽ hỏng; dùng Cloudflare Access hoặc không mở).

## 7b. NFR đã đo (lượt 2, `:3011`, build production, 1 lần đo, backend ấm)

| Màn hình | FCP | LCP | Số API khi tải | API chậm nhất |
|---|---|---|---|---|
| `/app` | 1236 ms | 1964 ms | 17 | `projects` 1159 ms |
| `/app/brse-todo` | 264 ms | 568 ms | 19 | `ai/status?check_runtime=true` 426 ms |
| `/app/operations` | 208 ms | 208 ms | 17 | `ai/status?check_runtime=true` 2049 ms |
| `/app/reports` | 276 ms | 1492 ms | 14 | `operations` 601 ms |
| `/app/glossary` | 568 ms | 568 ms | 9 | `operations` 3328 ms |
| `/app/knowledge` | 428 ms | 428 ms | 13 | `operations` 866 ms |

Tất cả trong ngưỡng Web Vitals "good" (FCP ≤ 1.8 s, LCP ≤ 2.5 s). Quan sát (chưa ghi bug): mỗi trang gọi 9–19 API; `ai/status?check_runtime=true` chạy ở mọi trang và có lúc mất 2 s; `/operations` được tải cả ở Glossary/Knowledge dù không dùng (3.3 s ở Glossary). Một lần đo, chưa lặp lại, chưa đo dưới tải.

**Bảo mật (có `BRSE_API_SECRET`, đo bằng curl):** middleware `check_api_auth` bảo vệ mọi `/api/*` trừ `/api/health*` và `/api/ai/status`. Không token hoặc sai token → 401 cho projects, operations, glossary, reports, meeting-minutes, client-state, todos, calendar, knowledge, meetings, `POST ai/chat|ocr`, `DELETE`, `openapi.json`, `docs`. Token đúng → 200. `X-Forwarded-For: 127.0.0.1` giả mạo vẫn 401. CORS từ origin lạ không có `access-control-allow-origin`. `/uploads`, `/docs` ngoài `/api` → 404. Phát hiện: B-017, B-018 ở trên.
- **Việc dở dang cần chú ý:** sửa B-013 (Calendar) và B-014 (Minutes) đã được xác nhận trên giao diện nhưng **chưa commit**, vì nằm lẫn với thay đổi cũ chưa commit trong cùng file.

## 8. 推奨 / Khuyến nghị

1. Dựng **DB/profile thử riêng** (không dùng dữ liệu thật) để test được thao tác tạo/sửa/xóa và AI.
2. Thêm test E2E tự động (Playwright) cho: đổi dự án, Glossary scope, báo cáo sửa tay.
3. Ghi nhận: thao tác đổi dự án trong test **ghi lên server** (dự án đang chọn, bản nháp template) — test sau nên chạy trên môi trường cô lập.

## 承認 / Phê duyệt

| Vai trò | Họ tên | Ngày | Ký |
|---|---|---|---|
| QA | | | |
| PM / Owner | | | |
