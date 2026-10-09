# Kế Hoạch QA Testing - Chrome Extension (BrSE OS)

## 1. Mục Đích
Đảm bảo Extension luôn ổn định, không lỗi cú pháp, xử lý mượt mà các API dịch thuật (Google, AI) và tương tác UI trước khi Release.

## 2. Công Cụ & Framework
- **Unit Test / Integration Test:** `vitest`, `jsdom`, `@testing-library/dom`
- **Mocking:** Mock toàn bộ API của `chrome.*` (runtime, storage, tabs, contextMenus, tts).
- **CI/CD:** Có thể dễ dàng tích hợp chạy test `npm run test` trước khi build file ZIP.

## 3. Các Luồng Kiểm Thử (Test Cases) Cần Phủ Kín

### 3.1. Background Scripts (`background.js`)
- [x] **Setup Environment:** Đã thiết lập `vitest` và mock Chrome API cơ bản.
- [ ] **Google Translate API:** Mock `fetch` trả về JSON giả lập cấu trúc của Google API (có `dt=t, bd, md, ex, ss`). Kiểm tra hàm `googleTranslatePro` bóc tách đúng `translation`, `dictionary`, `definitions`, `synonyms`, và `sourceLang`.
- [ ] **AI Chat API:** Mock `fetch` gửi tới Backend BrSE (127.0.0.1:8000), kiểm tra luồng trả về thành công và luồng lỗi (ném Error).
- [ ] **Message Listener (`onMessage`):** Bắn thử `BRSE_GOOGLE_TRANSLATE` hoặc `BRSE_AI_REQUEST` xem script có gọi đúng API và trả về bằng `chrome.tabs.sendMessage` không.

### 3.2. Content Scripts (`content.js`)
- [ ] **UI Rendering:** Dùng JSDOM để nhúng `content.js`, kích hoạt event `mouseup` với vùng chọn văn bản. Kiểm tra xem Floating Toolbar có xuất hiện không.
- [ ] **Quick Box Rendering:** Gọi trực tiếp hàm `renderGoogleResult` với data mock từ Google. Kiểm tra xem HTML sinh ra có chứa nút `Đọc` (🔊) và các thẻ định nghĩa/ví dụ không.
- [ ] **Event Binding:** Kiểm tra nút Đọc (🔊) trong bản dịch đã được gán sự kiện gửi message `BRSE_SPEAK` kèm theo ngôn ngữ nguồn chưa.

### 3.3. Side Panel / Popup
- [ ] Kiểm tra tính năng Chat (chuyển đổi tab Chat/Viết).
- [ ] Kiểm tra kết nối tới Backend (Status Dot xanh/đỏ).

## 4. Quy Trình Chạy Test
1. Mở terminal, vào thư mục `chrome-extension`.
2. Chạy: `npm install` (nếu chưa cài).
3. Chạy: `npm run test`.
4. Nếu Test Passed -> Tiến hành đóng gói Extension.
5. Nếu Test Failed -> Không được build/commit.

## 5. Tiến Độ Hiện Tại
- ✅ Khởi tạo thư mục và cài đặt `vitest`.
- ✅ Khởi tạo file config `vitest.config.ts` và `tests/setup.js`.
- ✅ Viết bộ test tích hợp chi tiết cho logic bóc tách Google Translate API.
- ✅ Triển khai **Streaming (SSE)** cho AI Chat (Backend + Extension).
- ✅ Triển khai **Gmail & Jira & Backlog Deep-Injection** (Tích hợp nút hỗ trợ vào đa nền tảng).
- ✅ Triển khai tính năng **1-Click Sync** (Đồng bộ kiến thức vào BrSE OS Command Center).
- ✅ Kiểm tra tính tương thích và chạy QA Test (100% Passed).
- ✅ Đóng gói bản Release hoàn thiện.
