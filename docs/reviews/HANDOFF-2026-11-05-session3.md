# HANDOFF 2026-11-05 (phiên 3) — BrSE OS

Nhánh: `fix/project-scope-weather-report` (không có remote). Trả lời người dùng bằng **tiếng Việt**.
Đọc kèm `HANDOFF-2026-11-05.md` (cạm bẫy WSL, lệnh gate) và `BrSE_OS_Test_Report_ST_2026-11-05.md`.

## 1. Trạng thái ST (tracker `.xlsx` + báo cáo `.md` đã cập nhật, đã commit)
78 case: **66 Pass, 5 Fail (đều đang mở), 1 Blocked, 5 Not Run, 1 N/A**. Execution 93.5 %, pass rate 91.7 %.
Chưa đạt exit criteria ST. Không có bug Critical/High mở.

| Bug | Mức | Trạng thái |
|---|---|---|
| B-010 Kanban reload, B-011 Reports mất bản sửa tay, B-012 Glossary mobile, B-015 Minutes tự tạo bản ghi rỗng, B-019 drawer không focus trap, B-022 mergeSavedItems crash | Low/Medium | **Closed** (đã commit, đã đo lại trên :3011) |
| B-013 Calendar mobile, B-014 Minutes mobile | Medium | Đã sửa + đo lại nhưng **CHƯA COMMIT** (nằm lẫn trong thay đổi cũ chưa commit của cùng file) |
| B-016 AI chat chập chờn | Medium | **Open** — combo 9router `free-logic` có member hỏng `gh/gemini-3.1-pro-preview` (400, không fallback); có lần treo 97 s. Cần gỡ member khỏi combo trong 9router |
| B-017 bật `BRSE_API_SECRET` làm UI web hỏng im lặng | Medium | **Open** — cần quyết định thiết kế (Cloudflare Access / đăng nhập). KHÔNG để Next tự gắn token cho mọi request (secret mất tác dụng). Hiện chỉ an toàn khi dùng thuần localhost |
| B-018 `/api/ai/status` công khai lộ base_url nội bộ | Low | Open |
| B-020 a11y tĩnh: 2 thẻ `<main>` lồng, ô nhập chỉ có placeholder, vài nút không tên | Low | Open |
| B-021 glossary tĩnh trùng 10 id (257 thuật ngữ / 247 id) | Low | Open (đã khoá trong `glossaryData.golden.test.ts`) |

## 2. Commit của phiên này (mỗi commit đã qua `verify-brse.sh --quick` EXIT=0)
`1829db4` B-010/B-011 · `743c1ad` B-012 · `1403263` B-015 · `15bb90b` B-019 · `352c9a2` sync Project Settings không còn nuốt lỗi ·
`146bfec` tách `lib/glossary.ts` (2271→77 dòng, dữ liệu ở `lib/glossaryCore/`, có golden test) ·
`ce676ff` tách `useTodoProjectSync.ts` (1291→873 dòng; `todoWorkflowModel.ts`, `todoWorkflowHelpers.ts`) · `027947a` B-022 · các commit `docs(st)`.

## 3. Việc còn lại
1. **`frontend/app/app/notes/page.tsx` (983 dòng) CHƯA tách**: file có ~650 dòng thay đổi chưa commit của người dùng. Hỏi người dùng commit/stash trước, hoặc xác nhận tách trên bản đang sửa dở.
2. Commit B-013 (`calendar/page.tsx`) và B-014 (`minutes/new/page.tsx`): chỉ khi người dùng đã commit phần việc dở trong hai file đó (hoặc dùng `git add -p` tay).
3. ST chưa test: Todo tạo/archive dự án, Reports đổi dự án; mobile cho meeting-note, history, power-tools, specs-mindmap, validation, Kanban; tablet 768px; các modal khác ngoài drawer Operations; screen reader thật.
4. **OCR đang Blocked**: không có `GEMINI_API_KEY` nên backend dùng model local `qwen3.5:9b`, Ollama chưa có model (404). Cần `ollama pull qwen3.5:9b` (nhiều GB, hỏi người dùng) hoặc đặt `GEMINI_API_KEY`. `PROJECT_SOURCE_OF_TRUTH.md` ghi OCR mặc định là Gemini nhưng thực tế khi không có key rơi về local.
5. Hook `useTodoProjectSync.ts` vẫn 873 dòng; `Drawer.tsx` dùng chung chưa có focus trap (đã có hook `lib/useDialogFocus.ts` dùng được).
6. Chỗ còn nuốt lỗi nhỏ: `fetchProjectSettings` đẩy dòng cục bộ mới hơn lên server có `catch` im lặng.
7. Quan sát hiệu năng (chưa ghi bug): mỗi trang gọi 9–19 API; `ai/status?check_runtime=true` chạy ở mọi trang (tới 2 s); `/operations` tải cả ở Glossary/Knowledge (3.3 s ở Glossary).

## 4. Cạm bẫy mới (ngoài file handoff trước)
- Sau khi **reset WSL**: stack `brse-*` (:3010) tự lên; stack test và **9router không tự chạy**. Dựng lại: `docker compose -p brse-test -f docker-compose.test.yml up -d` (thêm `--build frontend` khi vừa sửa frontend) và `bash scripts/start-brse-stack.sh` (bật 9router bằng pm2; HTTP 401 ở `:20128` là bình thường).
- Người dùng đã cho phép **tự reset WSL** (`wsl.exe --shutdown`) khi treo rồi làm tiếp.
- Rebuild frontend làm backend test khởi động lại: đợi ~15 s trước khi đo, nếu không sẽ thấy 500 giả.
- Playwright MCP: `browser_run_code_unsafe` chạy được nhiều phím Tab; `javascript_tool` của pane Browser tích hợp bị treo khi pane ẩn. Playwright tạo `.playwright-mcp/` ở gốc repo — xoá trước khi commit.
- `innerText` trả chữ HOA khi CSS `text-transform: uppercase`; dùng `textContent` + regex không phân biệt hoa/thường.
- Bật `BRSE_API_SECRET` chỉ cho backend test: dùng compose override đặt ngoài repo, rồi `up -d backend` lại không có override để gỡ.
- Quoting: `\$var` trong `wsl.exe -d Ubuntu bash -c "..."` hay hỏng; ghi script ra file rồi chạy.
- Python có openpyxl là bản **Windows** (`python`, không dùng `-I`); WSL python không có. Script cập nhật tracker nằm trong scratchpad phiên cũ — viết lại nếu mất (tracker: sheet `ST` hàng 43 làm mẫu style, `Defects`, `Dashboard` dùng công thức theo dải ô).
- Không `git add -A`: còn ~70 file thay đổi cũ chưa commit.
