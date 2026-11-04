# Product Teardown — BrSE OS (2026-11-04)

Phạm vi: cockpit cá nhân cho BrSE (1 người dùng, localhost-first). Dựa trên quét code + số liệu thực tế, không phải ý kiến chung chung.

## 1. Tóm tắt

**Điểm trưởng thành: 6.5 / 10.** Nền tảng kỹ thuật tốt (ruff sạch, 32 file test, i18n 3 ngôn ngữ, 1 eslint-disable). Yếu ở độ tin cậy dữ liệu và độ hoàn thiện luồng làm việc hằng ngày.

### 3 tử huyệt
1. **Dữ liệu Todo nằm chủ yếu ở `localStorage`** (24 module ghi `localStorage`). Xóa cache = mất việc; hai trình duyệt = hai bộ dữ liệu khác nhau. Trái định hướng "backend-backed" trong `PROJECT_SOURCE_OF_TRUTH.md`.
2. **Phạm vi dự án không nhất quán giữa các màn hình.** Lỗi Todo drawer vừa sửa là một ví dụ: sidebar, dashboard và Todo mỗi nơi giữ một ID dự án riêng. Cần một nguồn duy nhất.
3. **Pipeline meeting (Whisper/AV) hỏng âm thầm.** Lỗi `metadata_errors` do thiếu pin phụ thuộc, tới khi người dùng thấy ảnh "Failed" mới biết. Chưa có health-check cho pipeline media.

### 3 cơ hội
1. Vòng lặp **meeting → action item → Todo → báo cáo ngày** đã có từng mảnh; nối liền thành 1 click là giá trị lõi cho BrSE.
2. **Aisatsu/Keigo co-pilot** là điểm khác biệt thật cho BrSE Việt–Nhật; đối thủ chung (Notion, Linear) không có.
3. **Chrome Extension** có thể thành kênh nhập liệu nhanh (Q&A, glossary) nếu đồng bộ ổn định.

## 2. Hiện trạng vs chuẩn Tier-1

| Hạng mục | Hiện tại | Chuẩn (Linear/Notion/Superhuman) | Khoảng cách |
|---|---|---|---|
| Command palette | Có (`Ctrl+K`) | Có, kèm hành động theo ngữ cảnh | Nhỏ |
| Undo | Có toast undo ở triage | Undo cho mọi thao tác xóa/hoàn thành | Trung bình |
| Hộp thoại gốc `alert/confirm/prompt` | **30 chỗ** | Dialog thống nhất, có undo | Lớn (UX không đồng nhất) |
| Chỉnh sửa tại chỗ | Report vừa sửa xong | Mọi trường văn bản | Trung bình |
| Phạm vi dự án | Mỗi màn hình tự xử lý | Một context toàn cục | Lớn |
| Đồng bộ dữ liệu | localStorage + DB lai | Server là nguồn chính, cache có version | Lớn |
| Trạng thái rỗng | Có ở nhiều nơi | Gợi ý hành động tiếp theo | Nhỏ |
| File quá lớn | `glossary.ts` 2271 dòng, `useTodoProjectSync.ts` 1291, `notes/page.tsx` 983 | < 400 dòng | Lớn (khó bảo trì) |
| Accessibility | 4 `div onClick`, 2 `<img>` cần kiểm alt | Phím và screen-reader đầy đủ | Nhỏ |

## 3. Đề xuất

### Tầng 1 — Quick wins (1–2 ngày)
- Thay 30 `alert/confirm/prompt` bằng dialog dùng chung + toast undo (`ToastProvider` đã có).
- Badge tên dự án trên mọi danh sách đa dự án (Todo drawer đã làm).
- Thanh trạng thái pipeline meeting: thông báo ngay khi Whisper/ffmpeg lỗi, kèm nút "Thử lại".
- Nút sao chép nhanh + "Gửi Gmail" cho báo cáo ngày không cần mở rộng form.
- Chọn thành phố thủ công cho thời tiết (khi GPS bị từ chối hoặc sai).

### Tầng 2 — Strategic (3–5 ngày mỗi mục)
- **Một ProjectContext toàn cục** (provider + hook) thay cho ID rải rác ở sidebar/dashboard/todo.
- **Chuyển Todo sang server-first**: đọc từ `/todos/projects`, `localStorage` chỉ là cache có version.
- Tách `glossary.ts`, `useTodoProjectSync.ts`, `notes/page.tsx` theo ranh giới domain.
- Test E2E cho 3 luồng: meeting → Todo, chuyển dự án, báo cáo ngày.
- Xuất báo cáo tuần/tháng ra PDF/CSV.

### Tầng 3 — Moats
- **Meeting → Todo → Report tự động**: sau cuộc họp, AI đề xuất action item, bạn duyệt 1 click, báo cáo ngày tự điền.
- **Horenso Coach** (報連相): nhắc báo cáo/liên lạc/xin ý kiến đúng lúc theo deadline và Q&A đang chờ.
- **Glossary flashcard SRS** (spaced repetition) gắn với thuật ngữ gặp trong meeting thật.

## 4. Lộ trình gợi ý
1. Tuần 1: ProjectContext toàn cục + dialog thống nhất + cảnh báo pipeline.
2. Tuần 2: Todo server-first + test E2E cho luồng chuyển dự án.
3. Tuần 3: Tách file lớn, rồi Flashcard SRS.

## 5. Tự đánh giá (self-improvement)
- Đề xuất bám Schema/Stack hiện có (FastAPI + Next.js + Postgres), không cần đập đi xây lại.
- Chưa đo được: hiệu năng thực tế, độ phủ test theo dòng, và kiểm thử trực quan từng màn hình. Cần phiên sau.
- Mẫu UX mới đáng ghi vào benchmark: "Scope badge" trên mọi danh sách đa ngữ cảnh.
