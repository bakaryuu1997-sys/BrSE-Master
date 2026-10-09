"""
Generate Comprehensive BrSE Chrome Extension Test Plan (Enterprise Standard).
Output: BrSE_Chrome_Extension_Test_Plan.xlsx
"""

import sys
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Styles & Colors
FONT_NAME = "Segoe UI"

FONT_HEADER = Font(name=FONT_NAME, size=11, bold=True, color="FFFFFF")
FONT_TITLE = Font(name=FONT_NAME, size=14, bold=True, color="1B365D")
FONT_SUBTITLE = Font(name=FONT_NAME, size=10, italic=True, color="595959")
FONT_SECTION = Font(name=FONT_NAME, size=11, bold=True, color="FFFFFF")
FONT_REGULAR = Font(name=FONT_NAME, size=10, color="1A1A1A")
FONT_BOLD = Font(name=FONT_NAME, size=10, bold=True, color="1A1A1A")
FONT_MUTED = Font(name=FONT_NAME, size=9, color="7F7F7F")

FILL_NAVY = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
FILL_BLUE_GROUP = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F9FAFC", end_color="F9FAFC", fill_type="solid")
FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

FILL_P1 = PatternFill(start_color="FFE0E0", end_color="FFE0E0", fill_type="solid")
FONT_P1 = Font(name=FONT_NAME, size=10, bold=True, color="900000")

FILL_P2 = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
FONT_P2 = Font(name=FONT_NAME, size=10, bold=True, color="A61C1C")

FILL_P3 = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
FONT_P3 = Font(name=FONT_NAME, size=10, bold=True, color="8C6500")

FILL_P4 = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
FONT_P4 = Font(name=FONT_NAME, size=10, color="595959")

FILL_GREEN_CHECK = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
FONT_GREEN_CHECK = Font(name=FONT_NAME, size=10, bold=True, color="276A3C")

FILL_YELLOW_WARN = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
FONT_YELLOW_WARN = Font(name=FONT_NAME, size=10, bold=True, color="8C6500")

FILL_RED_GAP = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
FONT_RED_GAP = Font(name=FONT_NAME, size=10, bold=True, color="C00000")

BORDER_THIN = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

BORDER_HEADER = Border(
    left=Side(style='thin', color='FFFFFF'),
    right=Side(style='thin', color='FFFFFF'),
    top=Side(style='medium', color='1B365D'),
    bottom=Side(style='medium', color='1B365D')
)

ALIGN_LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
ALIGN_CENTER = Alignment(horizontal='center', vertical='center')
ALIGN_RIGHT = Alignment(horizontal='right', vertical='center')

TC_COLUMNS = [
    ("Test ID", 15, ALIGN_CENTER),
    ("Requirement Ref", 16, ALIGN_CENTER),
    ("Module", 16, ALIGN_LEFT),
    ("Feature", 22, ALIGN_LEFT),
    ("Test Type", 10, ALIGN_CENTER),
    ("Priority", 12, ALIGN_CENTER),
    ("Precondition", 28, ALIGN_LEFT),
    ("Test Steps", 38, ALIGN_LEFT),
    ("Test Data", 24, ALIGN_LEFT),
    ("Expected Result", 34, ALIGN_LEFT),
    ("Linked API", 26, ALIGN_LEFT),
    ("Linked Storage", 20, ALIGN_LEFT),
    ("Automation?", 12, ALIGN_CENTER),
    ("Notes", 22, ALIGN_LEFT),
]

def apply_sheet_view(ws):
    ws.views.sheetView[0].showGridLines = True

def write_header_row(ws, columns, row_idx=1):
    for col_idx, (col_name, col_width, alignment) in enumerate(columns, start=1):
        cell = ws.cell(row=row_idx, column=col_idx, value=col_name)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = col_width
    ws.row_dimensions[row_idx].height = 26

def write_test_case_rows(ws, test_cases, start_row=2):
    for r_offset, tc in enumerate(test_cases):
        curr_row = start_row + r_offset
        is_zebra = (r_offset % 2 == 1)
        base_fill = FILL_ZEBRA if is_zebra else FILL_WHITE
        ws.row_dimensions[curr_row].height = 42

        for col_idx in range(1, 15):
            val = tc[col_idx - 1]
            cell = ws.cell(row=curr_row, column=col_idx, value=val)
            cell.font = FONT_REGULAR
            cell.fill = base_fill
            cell.border = BORDER_THIN
            align_default = TC_COLUMNS[col_idx - 1][2]
            cell.alignment = align_default

            # Special column styling
            if col_idx == 1:  # Test ID
                cell.font = FONT_BOLD
            elif col_idx == 6:  # Priority
                if "P1" in val:
                    cell.fill = FILL_P1
                    cell.font = FONT_P1
                elif "P2" in val:
                    cell.fill = FILL_P2
                    cell.font = FONT_P2
                elif "P3" in val:
                    cell.fill = FILL_P3
                    cell.font = FONT_P3
                else:
                    cell.fill = FILL_P4
                    cell.font = FONT_P4
            elif col_idx == 13:  # Automation?
                if val == "Y":
                    cell.font = Font(name=FONT_NAME, size=10, bold=True, color="1E7E34")
                elif val == "N":
                    cell.font = Font(name=FONT_NAME, size=10, color="7F7F7F")
                elif val == "Done":
                    cell.font = Font(name=FONT_NAME, size=10, bold=True, color="0070C0")

def build_test_strategy_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Test Strategy"
    
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 24
    ws.column_dimensions['C'].width = 75
    ws.column_dimensions['D'].width = 28

    # Title Banner
    ws.merge_cells("B2:D2")
    ws.cell(row=2, column=2, value="CHIẾN LƯỢC KIỂM THỬ TOÀN DIỆN — BRSE CHROME EXTENSION (MV3)").font = FONT_TITLE
    ws.row_dimensions[2].height = 32

    ws.merge_cells("B3:D3")
    ws.cell(row=3, column=2, value="Dự án: BrSE OS Extension | Phiên bản: v1.1.2 | Nền tảng: Manifest V3 (Chrome, Edge) | Tiêu chuẩn: Enterprise QA").font = FONT_SUBTITLE
    ws.row_dimensions[3].height = 20

    sections = [
        ("1. Mục tiêu kiểm thử", [
            ("Mục tiêu chính", "Đảm bảo Chrome Extension chạy ổn định, không xung đột DOM trên mọi trang web khách hàng (Jira, Chatwork, Gmail, Confluence); duy trì kết nối thời gian thực với AI Runtime và Backend."),
            ("Mục tiêu bảo mật", "Kiểm soát 100% việc làm sạch mã độc (DOMPurify Sanitization) chống XSS; bảo vệ dữ liệu nhạy cảm không bị lộ qua console log hoặc extension storage."),
            ("Mục tiêu hiệu năng", "Độ trễ chèn Content Script < 50ms, thời gian mở QuickBox < 100ms, tiêu thụ RAM của background service worker < 30MB khi nhàn rỗi.")
        ]),
        ("2. Phạm vi kiểm thử (Scope)", [
            ("In-Scope (Các module được test)", "1. Action Popup UI & Status Indicator\n2. Options & Settings Page\n3. Content Script & QuickBox Floating Widget\n4. Side Panel (AI Chat, Composer, Spec Preview)\n5. Background Service Worker & Storage Sync\n6. Phím tắt toàn cục Alt+Shift+B, Context Menus, Toast Notification\n7. Jira, Chatwork, Gmail Content Adapters"),
            ("Out-of-Scope (Ngoài phạm vi)", "Các trình duyệt không dùng nhân Chromium (Firefox Gecko, Safari WebKit); các tính năng mobile app."),
            ("Ràng buộc kỹ thuật", "Chrome Manifest V3 bắt buộc Service Worker không dùng DOM trực tiếp; content script phải chạy trong Shadow DOM đóng kín để tránh xung đột CSS.")
        ]),
        ("3. Môi trường & Thiết bị", [
            ("Trình duyệt mục tiêu", "Google Chrome v120+ (Windows 11, macOS Sonoma, Ubuntu 22.04), Microsoft Edge v120+."),
            ("Backend & AI Runtime", "FastAPI Backend (Port 8000), 9router AI Gateway (Port 20128), Ollama Local (Port 11434)."),
            ("Trang web kiểm thử tích hợp", "Jira Cloud/Data Center, Chatwork web, Gmail web, Confluence, Wikipedia Nhật Bản, Local test suite.")
        ]),
        ("4. Tiêu chí bắt đầu & Kết thúc (Entry / Exit Criteria)", [
            ("Entry Criteria (Bắt đầu)", "- Extension được build thành công, load được vào chrome://extensions ở chế độ Developer Mode không có lỗi manifest.\n- Backend API (Port 8000) và 9router (Port 20128) phản hồi HTTP 200 trên endpoint /api/ai/status."),
            ("Exit Criteria (Nghiệm thu)", "- 100% ca kiểm thử P1 (Critical) PASS.\n- ≥ 95% ca kiểm thử P2 (High) PASS, các lỗi còn lại có tài liệu giải pháp thay thế (workaround).\n- 0 lỗi bảo mật rò rỉ XSS hoặc crash Service Worker.")
        ]),
        ("5. Rủi ro & Biện pháp phòng ngừa (Risk & Mitigation)", [
            ("Rủi ro 1: Xung đột CSS/DOM trang ngoài", "Biện pháp: Toàn bộ QuickBox và Widget nổi bắt buộc đóng gói trong Shadow DOM (`mode: open`) và token CSS độc lập."),
            ("Rủi ro 2: Service Worker bị ngắt ngầm (MV3 Idle)", "Biện pháp: Áp dụng cơ chế message passing có ack và tự động wake-up khi người dùng bấm phím tắt hoặc mở popup."),
            ("Rủi ro 3: Backend hoặc 9router offline", "Biện pháp: Extension phải có chế độ Offline hiển thị Toast thân thiện và gợi ý kiểm tra cổng dịch vụ, không được treo UI.")
        ])
    ]

    curr_row = 5
    for sec_title, items in sections:
        ws.merge_cells(start_row=curr_row, start_column=2, end_row=curr_row, end_column=4)
        sec_cell = ws.cell(row=curr_row, column=2, value=sec_title)
        sec_cell.font = FONT_SECTION
        sec_cell.fill = FILL_NAVY
        sec_cell.alignment = Alignment(horizontal='left', vertical='center', indent=1)
        ws.row_dimensions[curr_row].height = 24
        curr_row += 1

        for label, desc in items:
            ws.cell(row=curr_row, column=2, value=label).font = FONT_BOLD
            ws.cell(row=curr_row, column=2).fill = FILL_WHITE
            ws.cell(row=curr_row, column=2).border = BORDER_THIN
            ws.cell(row=curr_row, column=2).alignment = ALIGN_LEFT

            ws.merge_cells(start_row=curr_row, start_column=3, end_row=curr_row, end_column=4)
            desc_cell = ws.cell(row=curr_row, column=3, value=desc)
            desc_cell.font = FONT_REGULAR
            desc_cell.fill = FILL_WHITE
            desc_cell.border = BORDER_THIN
            desc_cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

            ws.cell(row=curr_row, column=4).border = BORDER_THIN
            ws.row_dimensions[curr_row].height = max(26, len(desc.split('\n')) * 18)
            curr_row += 1
        curr_row += 1

def build_coverage_matrix_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Coverage Matrix"
    ws.views.sheetView[0].freezePanes = "C4"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 30
    for c in ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']:
        ws.column_dimensions[c].width = 14

    ws.merge_cells("B2:J2")
    ws.cell(row=2, column=2, value="MA TRẬN ĐỘ BAO PHỦ TÍNH NĂNG × LOẠI HÌNH KIỂM THỬ (COVERAGE MATRIX)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Feature / Capability", "UT (Unit)", "IT (Integ)", "API (Spec)", "E2E (User)", "PERF (Tải)", "SEC (B/mật)", "UAT (Duyệt)", "Coverage"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    features = [
        ("Popup Status & Badge Indicator", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
        ("Project Selector in Popup", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Options: Backend & AI Config", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
        ("Options: Test Ping Runtime Button", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Options: Theme & Locale Switcher", "✓", "✓", "-", "✓", "-", "-", "✓"),
        ("Content: Floating Trigger on Select", "✓", "✓", "-", "✓", "✓", "-", "✓"),
        ("Content: QuickBox Glossary Lookup", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("Content: QuickBox AI Chat Stream", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("Content: Keigo Checker on Selection", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Content: Inline Writer (Jira/Chatwork)", "✓", "✓", "-", "✓", "-", "✓", "✓"),
        ("Content: Screenshot & OCR Extract", "✓", "✓", "✓", "✓", "✓", "-", "✓"),
        ("Content: Command Palette (Alt+Shift+B)", "✓", "✓", "-", "✓", "-", "-", "✓"),
        ("SidePanel: Multi-turn Chat & History", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("SidePanel: Model Selector Switcher", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("SidePanel: Write Composer (Templates)", "✓", "✓", "-", "✓", "-", "-", "✓"),
        ("Background: Context Menu Handlers", "✓", "✓", "-", "✓", "-", "✓", "✓"),
        ("Background: Storage & Glossary Sync", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("Security: DOMPurify XSS Sanitizer", "✓", "✓", "-", "✓", "-", "✓", "✓"),
    ]

    for idx, f in enumerate(features, start=5):
        ws.row_dimensions[idx].height = 22
        ws.cell(row=idx, column=2, value=f[0]).font = FONT_BOLD
        ws.cell(row=idx, column=2).border = BORDER_THIN
        ws.cell(row=idx, column=2).fill = FILL_ZEBRA if idx % 2 == 1 else FILL_WHITE

        for c_idx in range(1, 8):
            val = f[c_idx]
            cell = ws.cell(row=idx, column=2 + c_idx, value=val)
            cell.alignment = ALIGN_CENTER
            cell.border = BORDER_THIN
            if val == "✓":
                cell.fill = FILL_GREEN_CHECK
                cell.font = FONT_GREEN_CHECK
            else:
                cell.fill = FILL_WHITE
                cell.font = FONT_MUTED
        
        # Coverage formula
        cov_cell = ws.cell(row=idx, column=10)
        cov_cell.value = f'=COUNTIF(C{idx}:I{idx}, "✓") & "/7 tests ✅"'
        cov_cell.alignment = ALIGN_CENTER
        cov_cell.font = FONT_BOLD
        cov_cell.fill = FILL_GREEN_CHECK
        cov_cell.border = BORDER_THIN

def build_popup_options_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Popup_Options"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Popup UI
        ("POP-UI-001", "FEAT-POPUP", "Popup", "Icon & Status Badge", "SMK", "P1-Critical",
         "Extension đã được nạp vào Chrome", "1. Nhìn icon extension trên toolbar\n2. Mở popup bằng cách click icon", "Backend: Online, 9router: Online",
         "Icon hiển thị chấm xanh (online). Popup mở ngay lập tức trong < 150ms.",
         "GET /api/ai/status", "chrome.storage.local", "Y", "Kiểm tra visual indicator"),
        
        ("POP-UI-002", "FEAT-POPUP", "Popup", "Offline Status Warning", "E2E", "P1-Critical",
         "Tắt Backend và 9router", "1. Click icon extension trên toolbar\n2. Quan sát badge và trạng thái trong popup", "Backend: Offline",
         "Badge hiện chấm đỏ/xám; popup hiển thị thông báo 'Backend offline' kèm nút Thử lại.",
         "GET /api/ai/status", "chrome.storage.local", "Y", "Kiểm tra graceful degradation"),

        ("POP-UI-003", "FEAT-POPUP", "Popup", "Project Context Selector", "E2E", "P2-High",
         "Backend có sẵn 2 dự án (Project A, Project B)", "1. Mở popup\n2. Bấm vào dropdown chọn dự án\n3. Chọn Project B", "activeProjectId: 'proj-b'",
         "Dự án chuyển sang Project B; lưu vào chrome.storage và broadcast cho content script.",
         "GET /api/settings/projects", "chrome.storage.local", "Y", "Đồng bộ đa màn hình"),

        ("POP-UI-004", "FEAT-POPUP", "Popup", "Quick Action: Open Side Panel", "E2E", "P2-High",
         "Popup đang mở", "1. Click nút 'Mở Side Panel'", "N/A",
         "Side panel của Chrome mở ra ở cạnh phải màn hình; popup tự đóng mượt mà.",
         "N/A", "chrome.sidePanel", "N", "Browser native API"),

        ("POP-UI-005", "FEAT-POPUP", "Popup", "Quick Action: Open Dashboard", "E2E", "P2-High",
         "Popup đang mở", "1. Click nút 'Mở BrSE Dashboard'", "target: 'http://127.0.0.1:3010/app'",
         "Trình duyệt mở tab mới dẫn đến http://127.0.0.1:3010/app hoặc focus vào tab đã có.",
         "N/A", "chrome.tabs", "Y", "Tab management"),

        ("POP-UI-006", "FEAT-POPUP", "Popup", "Quick Action: Open Options", "E2E", "P3-Medium",
         "Popup đang mở", "1. Click icon bánh răng Cài đặt", "N/A",
         "Mở trang Options (src/options/index.html) trong tab mới.",
         "N/A", "chrome.runtime", "Y", "Options routing"),

        # Options Page
        ("OPT-VAL-001", "FEAT-OPTIONS", "Options", "Backend URL - Rỗng", "VAL", "P2-High",
         "Đang ở trang Cài đặt", "1. Xóa trắng trường Backend URL\n2. Bấm nút 'Lưu cài đặt'", "backendUrl: ''",
         "Hiện thông báo lỗi đỏ: 'Backend URL không được để trống'. Không cho phép lưu giá trị rỗng.",
         "N/A", "chrome.storage.local", "Y", "Input validation"),

        ("OPT-VAL-002", "FEAT-OPTIONS", "Options", "Backend URL - Format hợp lệ", "VAL", "P1-Critical",
         "Đang ở trang Cài đặt", "1. Nhập URL http://127.0.0.1:8000\n2. Bấm 'Lưu cài đặt'", "backendUrl: 'http://127.0.0.1:8000'",
         "Hiện Toast xanh 'Đã lưu cấu hình thành công'. Storage lưu đúng giá trị chuẩn hóa (không trailing slash).",
         "GET /api/ai/status", "chrome.storage.local", "Y", "Happy path"),

        ("OPT-VAL-003", "FEAT-OPTIONS", "Options", "Backend URL - Có dấu gạch chéo cuối", "VAL", "P3-Medium",
         "Đang ở trang Cài đặt", "1. Nhập http://127.0.0.1:8000/\n2. Bấm 'Lưu cài đặt'", "backendUrl: 'http://127.0.0.1:8000/'",
         "Tự động trim dấu gạch chéo cuối thành 'http://127.0.0.1:8000' để tránh lỗi double slash.",
         "GET /api/ai/status", "chrome.storage.local", "Y", "Auto-normalization"),

        ("OPT-ACT-004", "FEAT-OPTIONS", "Options", "Nút Ping Test Runtime - Thành công", "API", "P1-Critical",
         "Backend và 9router đang chạy", "1. Nhập URL hợp lệ\n2. Bấm nút 'Kiểm tra kết nối'", "URL: http://127.0.0.1:8000",
         "Hiện nhãn xanh 'AI runtime reachable (200 OK)'. Hiển thị danh sách model khả dụng.",
         "GET /api/ai/status?check_runtime=true", "chrome.storage.local", "Y", "Health check API"),

        ("OPT-ACT-005", "FEAT-OPTIONS", "Options", "Nút Ping Test Runtime - Sai Port", "API", "P2-High",
         "Cổng 8999 không có dịch vụ nào chạy", "1. Nhập http://127.0.0.1:8999\n2. Bấm 'Kiểm tra kết nối'", "URL: http://127.0.0.1:8999",
         "Hiện nhãn đỏ cảnh báo 'Không thể kết nối đến máy chủ'. Có gợi ý kiểm tra tiến độ PM2.",
         "GET http://127.0.0.1:8999/api/ai/status", "N/A", "Y", "Negative test connection"),

        ("OPT-UI-006", "FEAT-OPTIONS", "Options", "Chọn Theme (Dark / Light / System)", "UI", "P3-Medium",
         "Đang ở trang Cài đặt", "1. Chuyển theme từ Dark sang Light\n2. Tải lại trang cài đặt", "theme: 'light'",
         "Giao diện đổi sang bảng màu sáng; khi F5 vẫn giữ nguyên theme Light đã chọn.",
         "N/A", "chrome.storage.local", "Y", "UI persistence"),

        ("OPT-UI-007", "FEAT-OPTIONS", "Options", "Chọn ngôn ngữ giao diện (Vi / Ja / En)", "UI", "P2-High",
         "Đang ở trang Cài đặt", "1. Chọn Ngôn ngữ = '日本語 (Japanese)'\n2. Quan sát toàn bộ nhãn giao diện", "lang: 'ja'",
         "Tất cả tiêu đề, mô tả và nút bấm chuyển sang tiếng Nhật chính xác theo file i18n messages.",
         "N/A", "chrome.storage.local", "Y", "i18n validation"),

        ("OPT-SEC-008", "FEAT-OPTIONS", "Options", "Bảo mật API Key trong ô nhập", "SEC", "P2-High",
         "Đang ở trang Cài đặt", "1. Nhập API Key vào ô mật khẩu\n2. Kiểm tra chế độ hiển thị", "apiKey: 'sk-proj-xyz123'",
         "Trường nhập là type='password' có nút ẩn/hiện mắt; không in key ra console log.",
         "N/A", "chrome.storage.local", "Y", "Credential masking"),
    ]
    write_test_case_rows(ws, tcs)

def build_quickbox_content_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_QuickBox_Content"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Floating Trigger & Selection
        ("QB-FLT-001", "FEAT-QUICKBOX", "QuickBox", "Bôi đen từ tiếng Nhật - Kích hoạt Trigger", "E2E", "P1-Critical",
         "Mở trang web tiếng Nhật (VD: Wikipedia Nhật)", "1. Bôi đen từ '要件定義'\n2. Thả chuột", "Selection: '要件定義'",
         "Nút Floating Trigger xuất hiện ngay gần con trỏ chuột trong vòng 50ms không làm giật trang.",
         "N/A", "DOM / Shadow DOM", "Y", "Selection event"),

        ("QB-FLT-002", "FEAT-QUICKBOX", "QuickBox", "Bôi đen khoảng trắng rỗng", "VAL", "P3-Medium",
         "Đang mở trang web bất kỳ", "1. Bôi đen chỉ chứa dấu cách hoặc xuống dòng\n2. Thả chuột", "Selection: '   \\n\\t'",
         "Floating Trigger KHÔNG xuất hiện.",
         "N/A", "DOM", "Y", "Whitespace filter"),

        ("QB-FLT-003", "FEAT-QUICKBOX", "QuickBox", "Bôi đen chuỗi siêu dài (> 5000 ký tự)", "BVA", "P2-High",
         "Đang mở bài viết dài", "1. Bôi đen 10 đoạn văn bản (> 5000 chars)\n2. Click Floating Trigger mở QuickBox", "Length: 5200 chars",
         "QuickBox mở bình thường; chuỗi được cắt gọn (truncate preview) và không làm đứng trình duyệt.",
         "N/A", "Shadow DOM", "Y", "Boundary string length"),

        ("QB-POS-004", "FEAT-QUICKBOX", "QuickBox", "Vị trí sát cạnh phải màn hình", "UI", "P2-High",
         "Trang web cuộn ngang hoặc ở mép phải", "1. Bôi đen từ ở sát mép phải viewport (x: 1850px)\n2. Mở QuickBox", "Pos: edge right",
         "QuickBox tự động đảo chiều hiển thị sang bên trái con trỏ để không bị tràn ra ngoài màn hình.",
         "N/A", "DOM calculation", "Y", "Viewport collision"),

        ("QB-POS-005", "FEAT-QUICKBOX", "QuickBox", "Vị trí sát đáy màn hình", "UI", "P2-High",
         "Trang web cuộn xuống cuối trang", "1. Bôi đen từ ở sát chân trang (bottom)\n2. Mở QuickBox", "Pos: edge bottom",
         "QuickBox tự động nhảy lên phía trên vùng bôi đen.",
         "N/A", "DOM calculation", "Y", "Bottom collision"),

        # QuickBox Tabs
        ("QB-GLS-006", "FEAT-GLOSSARY", "QuickBox", "Tab Glossary: Khớp từ vựng chính xác", "API", "P1-Critical",
         "Từ điển backend có từ '単体テスト'", "1. Bôi đen '単体テスト'\n2. Mở QuickBox tab Glossary", "Query: '単体テスト'",
         "Hiển thị card từ vựng: Kanji, Furigana (たんたいてすと), Nghĩa tiếng Việt (Kiểm thử đơn vị), Ví dụ minh họa.",
         "GET /api/glossary/search", "chrome.storage.local", "Y", "Glossary exact match"),

        ("QB-GLS-007", "FEAT-GLOSSARY", "QuickBox", "Tab Glossary: Từ không có trong từ điển", "API", "P2-High",
         "Bôi đen một từ mới lạ chưa có", "1. Bôi đen '超高速プロトタイピング'\n2. Mở tab Glossary", "Query: '超高速プロトタイピング'",
         "Hiển thị Empty State kèm nút CTA: 'Hỏi AI giải nghĩa từ này' hoặc 'Thêm vào từ điển BrSE'.",
         "GET /api/glossary/search", "chrome.storage.local", "Y", "Empty state fallback"),

        ("QB-CHT-008", "FEAT-AI-CHAT", "QuickBox", "Tab Quick Chat: Gửi câu hỏi nhanh", "API", "P1-Critical",
         "QuickBox đang mở", "1. Chuyển sang tab Chat\n2. Nhập 'Giải thích thuật ngữ này cho khách'\n3. Bấm Enter", "Prompt: 'Giải thích...'",
         "Phản hồi AI streaming hiển thị mượt mà từng từ; markdown render đúng cú pháp.",
         "POST /api/ai/chat/stream", "9router / Ollama", "Y", "Streaming response"),

        ("QB-CHT-009", "FEAT-AI-CHAT", "QuickBox", "Nút Dừng Stream (Stop Generation)", "UI", "P2-High",
         "AI đang trả lời câu dài", "1. Khi AI đang sinh text, bấm nút 'Dừng' (Stop)", "State: streaming",
         "Quá trình stream ngắt ngay lập tức; các chữ đã sinh trước đó vẫn được giữ nguyên đầy đủ.",
         "AbortController", "N/A", "Y", "Stream cancellation"),

        ("QB-CHT-010", "FEAT-AI-CHAT", "QuickBox", "Nút Sao chép câu trả lời (Copy)", "UI", "P2-High",
         "AI đã trả lời xong", "1. Click nút Copy góc dưới câu trả lời", "N/A",
         "Nội dung được chép vào clipboard máy tính; icon đổi thành dấu tick xanh 'Đã chép'.",
         "navigator.clipboard", "Clipboard API", "Y", "Clipboard action"),

        # Keigo Checker
        ("QB-KEI-011", "FEAT-KEIGO", "QuickBox", "Tab Keigo: Kiểm tra câu nói tiếng Nhật", "API", "P1-Critical",
         "Bôi đen đoạn email khách", "1. Bôi đen '明日行く'\n2. Mở tab Keigo Checker", "Input: '明日行く'",
         "Phát hiện văn phong Tameguchi (thô); gợi ý sửa sang Kenjougo: '明日伺います' hoặc '参ります'.",
         "POST /api/keigo/evaluate", "Backend / AI", "Y", "Keigo evaluation"),

        # Inline Writer & Adapters
        ("QB-INL-012", "FEAT-ADAPTERS", "QuickBox", "Inline Writer: Chèn vào ô comment Jira", "E2E", "P1-Critical",
         "Đang mở trang issue Jira, ô comment đang focus", "1. Tạo câu trả lời trong QuickBox\n2. Click nút 'Chèn vào ô nhập' (Insert)", "Text: '調査結果を報告します...'",
         "Văn bản tự động được điền thẳng vào trình soạn thảo Rich Text của Jira mà không làm mất con trỏ.",
         "N/A", "Jira DOM Adapter", "N", "Jira specific injection"),

        ("QB-INL-013", "FEAT-ADAPTERS", "QuickBox", "Inline Writer: Chèn vào Chatwork", "E2E", "P1-Critical",
         "Đang ở phòng chat Chatwork", "1. Soạn tin nhắn\n2. Bấm 'Chèn vào Chatwork'", "Text: '[to:12345] お疲れ様です'",
         "Điền chính xác vào thẻ textarea `#_chatText` của Chatwork.",
         "N/A", "Chatwork DOM Adapter", "N", "Chatwork injection"),

        ("QB-INL-014", "FEAT-ADAPTERS", "QuickBox", "Inline Writer: Chèn vào Gmail Compose", "E2E", "P1-Critical",
         "Đang mở hộp soạn mail Gmail", "1. Click nút 'Chèn vào Gmail'", "Text: '件名: 進捗確認...'",
         "Nội dung chèn đúng vào vùng contenteditable của Gmail.",
         "N/A", "Gmail DOM Adapter", "N", "Gmail injection"),

        # Screenshot & OCR
        ("QB-OCR-015", "FEAT-OCR", "QuickBox", "Screenshot Annotator: Chụp vùng màn hình", "E2E", "P2-High",
         "Đang ở trang web có hình ảnh hoặc bảng tiếng Nhật", "1. Kích hoạt công cụ chụp ảnh màn hình\n2. Kéo chọn 1 vùng chữ", "Region: 400x200px",
         "Vùng chụp được vẽ khung đỏ; ảnh được đưa vào pipeline OCR nhận diện chữ Kanji.",
         "POST /api/tools/ocr", "Tesseract / Backend", "Y", "Screenshot capture"),

        # Command Palette
        ("QB-CMD-016", "FEAT-COMMANDS", "QuickBox", "Phím tắt toàn cục Alt+Shift+B", "E2E", "P1-Critical",
         "Đang duyệt web ở bất kỳ tab nào", "1. Nhấn tổ hợp phím Alt + Shift + B", "Shortcut: Alt+Shift+B",
         "Command Palette trung tâm mở ra ngay lập tức; ô tìm kiếm được tự động focus sẵn sàng gõ.",
         "chrome.commands", "Shadow DOM", "Y", "Global shortcut"),

        ("QB-CMD-017", "FEAT-COMMANDS", "QuickBox", "Đóng QuickBox bằng phím Escape", "UI", "P2-High",
         "QuickBox đang hiển thị", "1. Nhấn phím Escape (ESC)", "Key: Escape",
         "QuickBox biến mất ngay lập tức và giải phóng focus trả lại cho trang web.",
         "N/A", "Keyboard event", "Y", "Keyboard dismiss"),
    ]
    write_test_case_rows(ws, tcs)

def build_sidepanel_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_SidePanel_AI"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        ("SP-UI-001", "FEAT-SIDEPANEL", "SidePanel", "Mở SidePanel từ Toolbar", "SMK", "P1-Critical",
         "Đang ở bất kỳ trang web nào", "1. Click icon extension hoặc menu chuột phải 'Mở SidePanel'", "Action: open",
         "SidePanel mở ra ở khung bên phải trình duyệt; trạng thái và lịch sử chat trước đó được giữ nguyên.",
         "chrome.sidePanel.open", "chrome.storage.local", "Y", "Panel opening"),

        ("SP-MOD-002", "FEAT-AI-MODELS", "SidePanel", "Model Selector: Tự động tải danh sách Model", "API", "P1-Critical",
         "9router và Ollama đang online", "1. Mở SidePanel\n2. Kiểm tra dropdown chọn Model ở header", "N/A",
         "Dropdown hiển thị đầy đủ các model: Gemma 4, Qwen 2.5 Coder, ChatGPT 5.5, Llama 3.",
         "GET /v1/models (qua 9router)", "Runtime state", "Y", "Dynamic model list"),

        ("SP-MOD-003", "FEAT-AI-MODELS", "SidePanel", "Model Selector: Chuyển đổi Model AI", "E2E", "P2-High",
         "Đang chọn model A", "1. Chọn sang model Qwen 2.5 Coder\n2. Gửi 1 câu hỏi prompt", "Model: 'qwen2.5-coder'",
         "Request gửi đến backend/9router mang đúng tham số model; câu trả lời được xử lý bởi model mới.",
         "POST /api/ai/chat/stream", "9router", "Y", "Model switching"),

        ("SP-CHT-004", "FEAT-AI-CHAT", "SidePanel", "Multi-turn Chat: Ghi nhớ ngữ cảnh hội thoại", "E2E", "P1-Critical",
         "Hội thoại mới", "1. Gửi 'Tôi tên là An, làm BrSE'\n2. Gửi tiếp 'Tôi tên là gì và làm nghề gì?'", "Context retention",
         "AI trả lời chính xác: 'Bạn tên là An và đang làm Kỹ sư Cầu nối (BrSE)'.",
         "POST /api/ai/chat/stream", "Local state / Backend", "Y", "Multi-turn context"),

        ("SP-CHT-005", "FEAT-AI-CHAT", "SidePanel", "Markdown Code Block: Highlight cú pháp & Copy", "UI", "P2-High",
         "Yêu cầu AI viết code", "1. Prompt: 'Viết cho tôi hàm regex check email bằng JS'\n2. Quan sát code block", "Language: javascript",
         "Code block có syntax highlighting màu sắc; có header hiển thị 'javascript' và nút 'Copy code'.",
         "N/A", "Prism / Highlight.js", "Y", "Code rendering"),

        ("SP-WRI-006", "FEAT-COMPOSER", "SidePanel", "Write Composer: Template Báo cáo tiến độ", "E2E", "P1-Critical",
         "Mở tab Write Composer", "1. Chọn mẫu '進捗報告 (Báo cáo tiến độ)'\n2. Điền thông số task\n3. Bấm 'Tạo văn bản'", "Template: Progress Report",
         "Sinh ra bản email tiếng Nhật chuẩn thương mại (Kính ngữ, お疲れ様です, mục tiêu, kết quả, kế hoạch).",
         "POST /api/ai/chat/stream", "Prompt template", "Y", "Template generator"),

        ("SP-WRI-007", "FEAT-COMPOSER", "SidePanel", "Write Composer: Template Xin lỗi khách hàng", "E2E", "P1-Critical",
         "Mở tab Write Composer", "1. Chọn mẫu 'お詫び・障害報告 (Báo cáo sự cố & Xin lỗi)'\n2. Bấm 'Tạo văn bản'", "Template: Apology",
         "Sinh văn bản mang phong cách cực kỳ lịch sự, đúng cấu trúc Sonkeigo/Kenjougo của doanh nghiệp Nhật.",
         "POST /api/ai/chat/stream", "Prompt template", "Y", "Critical business tone"),

        ("SP-JIR-008", "FEAT-JIRA-SYNC", "SidePanel", "Jira Context Auto-Detect", "E2E", "P2-High",
         "Tab đang mở là trang Jira Issue (VD: BRSE-1234)", "1. Mở SidePanel\n2. Quan sát khung Context Banner", "URL: jira.atlassian.net/browse/BRSE-1234",
         "Banner hiển thị 'Đang phát hiện Issue: BRSE-1234 - Tiêu đề ticket'; AI tự động nạp context này vào hội thoại.",
         "chrome.tabs.query", "Jira Content Parser", "N", "Contextual awareness"),

        ("SP-FLS-009", "FEAT-FLASHCARD", "SidePanel", "Flashcard Tool: Luyện từ vựng IT Nhật", "UI", "P3-Medium",
         "Mở tab Flashcard", "1. Xem mặt trước Kanji\n2. Click lật thẻ xem Furigana và nghĩa\n3. Bấm 'Đã nhớ'", "Term: '単体テスト'",
         "Thẻ lật mượt mà; bấm 'Đã nhớ' cập nhật điểm Spaced Repetition vào storage.",
         "N/A", "chrome.storage.local", "Y", "Flashcard loop"),

        ("SP-CLR-010", "FEAT-AI-CHAT", "SidePanel", "Xóa lịch sử chat (Clear Chat)", "ACT", "P2-High",
         "SidePanel đang có 5 lượt hỏi đáp", "1. Bấm nút 'Xóa lịch sử'\n2. Xác nhận hộp thoại Modal", "Action: clear",
         "Toàn bộ tin nhắn cũ bị xóa sạch; màn hình trở về Empty State sẵn sàng cho phiên làm việc mới.",
         "N/A", "Local state", "Y", "History clearing"),
    ]
    write_test_case_rows(ws, tcs)

def build_background_sync_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Background_Sync"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        ("BG-SW-001", "FEAT-BACKGROUND", "Background", "Service Worker Khởi động khi mở trình duyệt", "SMK", "P1-Critical",
         "Cài đặt extension và mở Chrome", "1. Kiểm tra chrome://serviceworker-internals\n2. Quan sát trạng thái worker", "Status: RUNNING",
         "Service worker 'src/background/background.js' khởi động thành công không có lỗi console.",
         "N/A", "Browser Worker Lifecycle", "Y", "Worker boot"),

        ("BG-SW-002", "FEAT-BACKGROUND", "Background", "Service Worker Tự ngắt khi nhàn rỗi (Idle)", "PERF", "P2-High",
         "Không thao tác extension trong 30 giây", "1. Quan sát Task Manager của Chrome\n2. Chờ 30s", "Idle: 30s",
         "Worker chuyển sang trạng thái 'STOPPED' để tiết kiệm RAM máy tính.",
         "N/A", "Chrome Engine", "Y", "Resource optimization"),

        ("BG-SW-003", "FEAT-BACKGROUND", "Background", "Wake-up Worker khi nhận Message từ Content", "IT", "P1-Critical",
         "Worker đang STOPPED", "1. Trên trang web, bôi đen từ mở QuickBox\n2. QuickBox gửi message tra từ", "Message: { type: 'SEARCH_GLOSSARY' }",
         "Worker tự động đánh thức ngay lập tức (< 30ms) và trả về kết quả tra từ chính xác.",
         "chrome.runtime.onMessage", "chrome.storage", "Y", "Worker wake-up"),

        ("BG-CTX-004", "FEAT-CONTEXT-MENU", "Background", "Tạo Context Menu khi cài đặt", "SMK", "P1-Critical",
         "Cài đặt hoặc cập nhật extension", "1. Click chuột phải trên văn bản bất kỳ\n2. Quan sát menu ngữ cảnh", "chrome.contextMenus",
         "Menu 'BrSE Assistant' xuất hiện đầy đủ các mục con: Tra từ điển BrSE, Dịch Keigo, Mở SidePanel.",
         "chrome.contextMenus.create", "Browser Context", "Y", "Context menu registration"),

        ("BG-CTX-005", "FEAT-CONTEXT-MENU", "Background", "Click Context Menu 'Tra từ điển BrSE'", "E2E", "P1-Critical",
         "Bôi đen từ '結合テスト' trên web", "1. Click chuột phải\n2. Chọn 'BrSE Assistant' -> 'Tra từ điển BrSE'", "Selection: '結合テスト'",
         "SidePanel tự động mở ra và hiển thị ngay kết quả tra từ của '結合テスト'.",
         "chrome.contextMenus.onClicked", "chrome.sidePanel", "Y", "Context menu action"),

        ("BG-CTX-006", "FEAT-CONTEXT-MENU", "Background", "Click Context Menu trên trang cấm (chrome://)", "SEC", "P2-High",
         "Đang mở trang chrome://settings", "1. Click chuột phải\n2. Chọn tra từ", "URL: chrome://settings",
         "Không ném lỗi unhandled exception; hiển thị Toast thông báo 'Không thể thao tác trên trang hệ thống'.",
         "N/A", "URL permission filter", "Y", "Restricted URL safety"),

        ("BG-SYN-007", "FEAT-SYNC", "Background", "Đồng bộ Glossary từ Backend SQLite về Storage", "API", "P1-Critical",
         "Backend có 1,787 thuật ngữ trong brse.db", "1. Service Worker chạy định kỳ hoặc khi mở cài đặt\n2. Kiểm tra chrome.storage.local", "Data: 1,787 terms",
         "Dữ liệu thuật ngữ được lưu trữ offline trong chrome.storage.local để tra tức thì không cần đợi API.",
         "GET /api/glossary", "chrome.storage.local", "Y", "Offline cache sync"),

        ("BG-SYN-008", "FEAT-SYNC", "Background", "Xử lý đứt mạng khi đồng bộ", "NET", "P2-High",
         "Tắt kết nối mạng", "1. Bật cờ force sync\n2. Quan sát cách xử lý lỗi", "Network: Disconnected",
         "Bảo lưu nguyên vẹn dữ liệu cache cũ; không xóa storage và hẹn lịch thử lại sau 5 phút.",
         "N/A", "chrome.alarms", "Y", "Network failure resilience"),
    ]
    write_test_case_rows(ws, tcs)

def build_security_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Security & Integrity"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        ("SEC-XSS-001", "FEAT-SECURITY", "Security", "DOMPurify: Chặn thẻ <script> độc hại", "SEC", "P1-Critical",
         "AI trả lời hoặc web chứa nội dung độc", "1. Đưa chuỗi '<script>alert(\"XSS\")</script>' vào bộ render\n2. Hiển thị trên QuickBox", "Payload: <script>",
         "Thẻ script bị tước bỏ hoàn toàn bởi DOMPurify; không có alert nào xuất hiện trên màn hình.",
         "N/A", "Shadow DOM / DOMPurify", "Y", "Script injection check"),

        ("SEC-XSS-002", "FEAT-SECURITY", "Security", "DOMPurify: Chặn sự kiện onload/onerror", "SEC", "P1-Critical",
         "Render nội dung markdown", "1. Đưa chuỗi '<img src=x onerror=\"alert(1)\">' vào", "Payload: <img onerror>",
         "Thuộc tính onerror bị loại bỏ hoàn toàn; chỉ còn lại thẻ img an toàn.",
         "N/A", "DOMPurify", "Y", "Event handler sanitization"),

        ("SEC-XSS-003", "FEAT-SECURITY", "Security", "DOMPurify: Chặn link javascript: pseudo protocol", "SEC", "P1-Critical",
         "Render markdown link", "1. Render link [Click me](javascript:alert(document.cookie))\n2. Click vào link", "Protocol: javascript:",
         "Link bị lọc bỏ hoặc vô hiệu hóa thành href='#' / rel='noopener noreferrer'.",
         "N/A", "DOMPurify / Safe Links", "Y", "Protocol sanitization"),

        ("SEC-ISL-004", "FEAT-SECURITY", "Security", "Shadow DOM: Cô lập Style và Biến toàn cục", "SEC", "P1-Critical",
         "Trang web mẹ có CSS toàn cục (VD: * { color: red !important; })", "1. Mở QuickBox\n2. Kiểm tra màu sắc và style của QuickBox", "Global CSS override",
         "QuickBox giữ nguyên thiết kế chuẩn (dark glassmorphism); không bị ảnh hưởng bởi CSS của trang web.",
         "N/A", "Shadow Root (mode: open)", "Y", "Style encapsulation"),

        ("SEC-KEY-005", "FEAT-SECURITY", "Security", "Bảo mật Storage: Không rò rỉ API Key vào window", "SEC", "P1-Critical",
         "Người dùng đã lưu API Key trong Options", "1. Mở DevTools Console của trang web\n2. Thử truy cập window.localStorage, chrome.storage", "Window scope",
         "Script của trang web không có quyền đọc chrome.storage của extension; không đọc được API Key.",
         "N/A", "Isolated World Context", "Y", "Credential isolation"),

        ("SEC-CSP-006", "FEAT-SECURITY", "Security", "Tuân thủ Content Security Policy (MV3 CSP)", "SEC", "P1-Critical",
         "Kiểm tra toàn bộ mã nguồn extension", "1. Audit code không dùng eval(), new Function(), inline event (onclick=...)", "Source audit",
         "0 vi phạm CSP; extension tuân thủ 100% chính sách bảo mật Manifest V3 của Google.",
         "N/A", "Manifest V3 CSP", "Y", "CSP audit"),
    ]
    write_test_case_rows(ws, tcs)

def build_performance_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Performance Plan"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 16
    ws.column_dimensions['C'].width = 32
    ws.column_dimensions['D'].width = 14
    ws.column_dimensions['E'].width = 14
    ws.column_dimensions['F'].width = 14
    ws.column_dimensions['G'].width = 16
    ws.column_dimensions['H'].width = 18
    ws.column_dimensions['I'].width = 24

    ws.merge_cells("B2:I2")
    ws.cell(row=2, column=2, value="KẾ HOẠCH KIỂM THỬ HIỆU NĂNG & BENCHMARK TẢI (PERFORMANCE PLAN)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Test ID", "Scenario / Mục tiêu", "Tool", "Target Users", "Duration", "Ramp-up", "Target SLA", "Pass Criteria", "Notes"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    scenarios = [
        ("PERF-EXT-001", "Content Script Bootloader Injection", "Chrome DevTools", "1 User / Tab", "Tức thì", "0s", "T < 50ms", "Không gây giật lag trang web khi load", "Đo trên trang nặng (Jira/Gmail)"),
        ("PERF-EXT-002", "QuickBox Render Latency", "Performance API", "1 User", "Tức thì", "0s", "T < 100ms", "QuickBox mở mượt mà ngay sau khi thả chuột", "Đo thời gian từ click đến DOM mounted"),
        ("PERF-EXT-003", "Time To First Token (TTFT) AI Stream", "Network Tab", "1 User", "5 phút", "10s", "TTFT < 800ms", "Từ khi bấm gửi đến chữ đầu tiên xuất hiện", "Đo với model cục bộ Ollama/9router"),
        ("PERF-EXT-004", "Service Worker Idle Memory Usage", "Chrome Task Mgr", "Background", "30 phút", "0s", "RAM < 30 MB", "Worker tự terminate giải phóng RAM khi idle", "Tránh memory leak khi dùng cả ngày"),
        ("PERF-API-005", "Backend Glossary Sync Concurrency", "k6 Load Test", "50 concurrent QA", "5 phút", "1m", "p95 < 200ms", "Error rate < 0.1%, throughput > 100 rps", "Mô phỏng cả team BrSE cùng mở máy"),
        ("PERF-API-006", "AI Proxy Streaming Spike Test", "k6 Load Test", "20 concurrent", "3 phút", "15s", "p95 < 1500ms", "0 timeout 504, kết nối giữ vững qua SSE", "Đo tải 9router gateway"),
    ]

    for idx, s in enumerate(scenarios, start=5):
        ws.row_dimensions[idx].height = 24
        is_zebra = (idx % 2 == 1)
        base_fill = FILL_ZEBRA if is_zebra else FILL_WHITE
        for col_offset, val in enumerate(s):
            cell = ws.cell(row=idx, column=2 + col_offset, value=val)
            cell.font = FONT_REGULAR
            cell.fill = base_fill
            cell.border = BORDER_THIN
            cell.alignment = ALIGN_CENTER if col_offset in [0, 2, 3, 4, 5, 6] else ALIGN_LEFT
            if col_offset == 0:
                cell.font = FONT_BOLD

    # K6 Script sample block
    k6_row = 13
    ws.merge_cells(start_row=k6_row, start_column=2, end_row=k6_row, end_column=9)
    k6_header = ws.cell(row=k6_row, column=2, value="K6 LOAD TEST SCRIPT MẪU — KIỂM THỬ ĐỒNG BỘ BACKEND & 9ROUTER")
    k6_header.font = FONT_SECTION
    k6_header.fill = FILL_BLUE_GROUP
    k6_header.alignment = ALIGN_LEFT
    ws.row_dimensions[k6_row].height = 24

    k6_script_content = (
        "// scripts/k6_extension_backend_load.js\n"
        "import http from 'k6/http';\n"
        "import { check, sleep } from 'k6';\n\n"
        "export const options = {\n"
        "  stages: [\n"
        "    { duration: '30s', target: 20 }, // Ramp-up 20 extension clients\n"
        "    { duration: '2m', target: 50 },  // Duy trì tải 50 clients\n"
        "    { duration: '30s', target: 0 },  // Ramp-down\n"
        "  ],\n"
        "  thresholds: {\n"
        "    http_req_duration: ['p(95)<300'], // 95% request đồng bộ dưới 300ms\n"
        "    http_req_failed: ['rate<0.01'],    // Tỷ lệ lỗi dưới 1%\n"
        "  },\n"
        "};\n\n"
        "export default function () {\n"
        "  const baseUrl = 'http://127.0.0.1:8000';\n"
        "  // 1. Kiểm tra health check\n"
        "  const resHealth = http.get(`${baseUrl}/api/ai/status?check_runtime=true`);\n"
        "  check(resHealth, { 'Status 200': (r) => r.status === 200 });\n\n"
        "  // 2. Tra cứu từ vựng Glossary\n"
        "  const resGlossary = http.get(`${baseUrl}/api/glossary/search?q=テスト`);\n"
        "  check(resGlossary, { 'Glossary search 200': (r) => r.status === 200 });\n"
        "  sleep(1);\n"
        "}"
    )
    ws.merge_cells(start_row=k6_row + 1, start_column=2, end_row=k6_row + 20, end_column=9)
    k6_box = ws.cell(row=k6_row + 1, column=2, value=k6_script_content)
    k6_box.font = Font(name="Consolas", size=9, color="1F2937")
    k6_box.fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
    k6_box.alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
    k6_box.border = BORDER_THIN

def build_uat_checklist_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "UAT Checklist"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 8
    ws.column_dimensions['C'].width = 28
    ws.column_dimensions['D'].width = 46
    ws.column_dimensions['E'].width = 18
    ws.column_dimensions['F'].width = 14
    ws.column_dimensions['G'].width = 22

    ws.merge_cells("B2:G2")
    ws.cell(row=2, column=2, value="UAT CHECKLIST — NGHIỆM THU NGHIỆP VỤ BRSE (USER ACCEPTANCE TESTING)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["#", "User Story / Nghiệp vụ", "Tiêu chuẩn nghiệm thu (Acceptance Criteria)", "Vai trò test", "Trạng thái", "Người duyệt / Ghi chú"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    uat_items = [
        (1, "US-01: Kiểm tra kết nối AI", "Mở popup thấy biểu tượng xanh, bấm 'Kiểm tra' phản hồi ngay model khả dụng.", "Kỹ sư BrSE / PO", "⬜ Chờ test", "Chạy trên Chrome Windows"),
        (2, "US-02: Bôi đen tra từ trên Jira", "Bôi đen từ IT tiếng Nhật trên ticket Jira hiện nghĩa tiếng Việt và cách đọc Furigana trong 1 click.", "Kỹ sư BrSE", "⬜ Chờ test", "Trang Jira Cloud"),
        (3, "US-03: Soạn Keigo trả lời khách", "Soạn câu hỏi Tameguchi, QuickBox tự động đề xuất câu chuẩn Kính ngữ Sonkeigo / Kenjougo.", "BrSE / Comtor", "⬜ Chờ test", "Kiểm tra độ tự nhiên câu văn"),
        (4, "US-04: Chèn văn bản vào Chatwork", "Bấm nút 'Chèn vào Chatwork' điền thẳng nội dung vào khung chat không cần copy-paste thủ công.", "Kỹ sư BrSE", "⬜ Chờ test", "Phòng chat dự án"),
        (5, "US-05: Chụp ảnh OCR tài liệu", "Chụp ảnh vùng bảng thông số tiếng Nhật, nhận diện chính xác > 98% chữ Kanji và cho copy text.", "Kỹ sư BrSE", "⬜ Chờ test", "Ảnh chụp màn hình thực tế"),
        (6, "US-06: Đổi model AI khi offline", "Khi mất mạng ngoài, chuyển sang model Ollama cục bộ vẫn tra từ và tóm tắt được nội dung.", "Kỹ sư BrSE", "⬜ Chờ test", "Rút cáp mạng / Tắt wifi"),
        (7, "US-07: Phím tắt Alt+Shift+B", "Bấm Alt+Shift+B mở ngay Command Palette tìm kiếm tài liệu từ bất kỳ tab nào.", "Kỹ sư BrSE", "⬜ Chờ test", "Kiểm tra độ tiện dụng"),
        (8, "US-08: SidePanel đa tab", "Mở SidePanel xem tài liệu đặc tả, chuyển tab khác SidePanel vẫn giữ nguyên vị trí và nội dung.", "Kỹ sư BrSE / PO", "⬜ Chờ test", "Cross-tab persistence"),
        (9, "US-09: An toàn thông tin khách", "Không gửi dữ liệu bôi đen lên server ngoài; toàn bộ prompt đi qua 9router/Ollama nội bộ của công ty.", "Security Lead", "⬜ Chờ test", "Kiểm tra Network logs"),
        (10, "US-10: Cài đặt và cập nhật dễ dàng", "Load unpack extension hoặc cập nhật phiên bản mới không bị mất cài đặt và từ điển cá nhân.", "Tech Lead", "⬜ Chờ test", "chrome://extensions"),
    ]

    for idx, item in enumerate(uat_items, start=5):
        ws.row_dimensions[idx].height = 28
        is_zebra = (idx % 2 == 1)
        base_fill = FILL_ZEBRA if is_zebra else FILL_WHITE
        for col_offset, val in enumerate(item):
            cell = ws.cell(row=idx, column=2 + col_offset, value=val)
            cell.font = FONT_REGULAR
            cell.fill = base_fill
            cell.border = BORDER_THIN
            cell.alignment = ALIGN_CENTER if col_offset in [0, 3, 4] else ALIGN_LEFT
            if col_offset == 0:
                cell.font = FONT_BOLD

def build_traceability_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Traceability Matrix"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 14
    ws.column_dimensions['C'].width = 34
    ws.column_dimensions['D'].width = 45
    ws.column_dimensions['E'].width = 16
    ws.column_dimensions['F'].width = 18

    ws.merge_cells("B2:F2")
    ws.cell(row=2, column=2, value="MA TRẬN TRUY XUẤT YÊU CẦU ↔ TEST CASES (TRACEABILITY MATRIX)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Req ID", "Tên yêu cầu / Tính năng", "Danh sách Test Case IDs bao phủ", "Số lượng TCs", "Độ bao phủ"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    reqs = [
        ("FEAT-POPUP", "Action Popup: Trạng thái kết nối & Tác vụ nhanh", "POP-UI-001, POP-UI-002, POP-UI-003, POP-UI-004, POP-UI-005, POP-UI-006", 6),
        ("FEAT-OPTIONS", "Options Page: Cấu hình Backend, AI, Theme, Ngôn ngữ", "OPT-VAL-001, OPT-VAL-002, OPT-VAL-003, OPT-ACT-004, OPT-ACT-005, OPT-UI-006, OPT-UI-007, OPT-SEC-008", 8),
        ("FEAT-QUICKBOX", "QuickBox: Floating Trigger, Vị trí neo, Giao diện nổi", "QB-FLT-001, QB-FLT-002, QB-FLT-003, QB-POS-004, QB-POS-005, QB-CMD-017", 6),
        ("FEAT-GLOSSARY", "QuickBox: Tra cứu thuật ngữ BrSE & Furigana", "QB-GLS-006, QB-GLS-007, BG-SYN-007", 3),
        ("FEAT-AI-CHAT", "QuickBox & SidePanel: AI Chat Stream thời gian thực", "QB-CHT-008, QB-CHT-009, QB-CHT-010, SP-CHT-004, SP-CHT-005, SP-CLR-010", 6),
        ("FEAT-KEIGO", "Keigo Checker: Đánh giá và gợi ý chuẩn Kính ngữ", "QB-KEI-011, SP-WRI-007", 2),
        ("FEAT-ADAPTERS", "Inline Writer: Tương thích Jira, Chatwork, Gmail", "QB-INL-012, QB-INL-013, QB-INL-014, SP-JIR-008", 4),
        ("FEAT-OCR", "Chụp ảnh màn hình và nhận diện văn bản OCR", "QB-OCR-015", 1),
        ("FEAT-COMMANDS", "Phím tắt toàn cục và Command Palette", "QB-CMD-016, QB-CMD-017, BG-CTX-004", 3),
        ("FEAT-SIDEPANEL", "SidePanel: Mở bảng cạnh, Model Selector, Flashcard", "SP-UI-001, SP-MOD-002, SP-MOD-003, SP-WRI-006, SP-FLS-009", 5),
        ("FEAT-BACKGROUND", "Background Worker: Vòng đời MV3, Context Menus", "BG-SW-001, BG-SW-002, BG-SW-003, BG-CTX-004, BG-CTX-005, BG-CTX-006", 6),
        ("FEAT-SYNC", "Đồng bộ dữ liệu Glossary và Storage cache", "BG-SYN-007, BG-SYN-008", 2),
        ("FEAT-SECURITY", "Bảo mật: DOMPurify XSS, Shadow DOM, CSP MV3", "SEC-XSS-001, SEC-XSS-002, SEC-XSS-003, SEC-ISL-004, SEC-KEY-005, SEC-CSP-006", 6),
    ]

    for idx, r in enumerate(reqs, start=5):
        ws.row_dimensions[idx].height = 24
        is_zebra = (idx % 2 == 1)
        base_fill = FILL_ZEBRA if is_zebra else FILL_WHITE

        ws.cell(row=idx, column=2, value=r[0]).font = FONT_BOLD
        ws.cell(row=idx, column=2).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=2).fill = base_fill
        ws.cell(row=idx, column=2).border = BORDER_THIN

        ws.cell(row=idx, column=3, value=r[1]).font = FONT_REGULAR
        ws.cell(row=idx, column=3).alignment = ALIGN_LEFT
        ws.cell(row=idx, column=3).fill = base_fill
        ws.cell(row=idx, column=3).border = BORDER_THIN

        ws.cell(row=idx, column=4, value=r[2]).font = Font(name="Consolas", size=9)
        ws.cell(row=idx, column=4).alignment = ALIGN_LEFT
        ws.cell(row=idx, column=4).fill = base_fill
        ws.cell(row=idx, column=4).border = BORDER_THIN

        ws.cell(row=idx, column=5, value=r[3]).font = FONT_BOLD
        ws.cell(row=idx, column=5).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=5).fill = base_fill
        ws.cell(row=idx, column=5).border = BORDER_THIN

        cov_cell = ws.cell(row=idx, column=6)
        if r[3] >= 2:
            cov_cell.value = "Covered (≥2 tests) ✅"
            cov_cell.fill = FILL_GREEN_CHECK
            cov_cell.font = FONT_GREEN_CHECK
        elif r[3] == 1:
            cov_cell.value = "Single test ⚠️"
            cov_cell.fill = FILL_YELLOW_WARN
            cov_cell.font = FONT_YELLOW_WARN
        else:
            cov_cell.value = "Gap (0 tests) ❌"
            cov_cell.fill = FILL_RED_GAP
            cov_cell.font = FONT_RED_GAP
        cov_cell.alignment = ALIGN_CENTER
        cov_cell.border = BORDER_THIN

    # Summary Row
    sum_row = len(reqs) + 5
    ws.cell(row=sum_row, column=2, value="TỔNG CỘNG").font = FONT_BOLD
    ws.cell(row=sum_row, column=2).alignment = ALIGN_CENTER
    ws.cell(row=sum_row, column=2).fill = FILL_NAVY
    ws.cell(row=sum_row, column=2).font = FONT_HEADER

    ws.cell(row=sum_row, column=3, value=f"{len(reqs)} Yêu cầu cốt lõi").font = FONT_BOLD
    ws.cell(row=sum_row, column=3).fill = FILL_NAVY
    ws.cell(row=sum_row, column=3).font = FONT_HEADER

    ws.cell(row=sum_row, column=4, value="Toàn bộ 13 module").font = FONT_BOLD
    ws.cell(row=sum_row, column=4).fill = FILL_NAVY
    ws.cell(row=sum_row, column=4).font = FONT_HEADER

    ws.cell(row=sum_row, column=5, value=f"=SUM(E5:E{sum_row-1})").font = FONT_HEADER
    ws.cell(row=sum_row, column=5).alignment = ALIGN_CENTER
    ws.cell(row=sum_row, column=5).fill = FILL_NAVY

    ws.cell(row=sum_row, column=6, value="100% Bao phủ ✅").font = FONT_HEADER
    ws.cell(row=sum_row, column=6).alignment = ALIGN_CENTER
    ws.cell(row=sum_row, column=6).fill = FILL_NAVY
    ws.row_dimensions[sum_row].height = 26

def build_summary_dashboard_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Summary Dashboard"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 24
    ws.column_dimensions['C'].width = 14
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 12
    ws.column_dimensions['H'].width = 18
    ws.column_dimensions['I'].width = 20

    ws.merge_cells("B2:I2")
    ws.cell(row=2, column=2, value="BẢNG TỔNG HỢP KẾ HOẠCH KIỂM THỬ — KPI & ĐỘ BAO PHỦ EXTENSION").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Module Kiểm thử", "Tổng TC", "P1 (Critical)", "P2 (High)", "P3 (Medium)", "P4 (Low)", "Tỷ lệ Auto Y (%)", "Requirement Coverage"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    modules = [
        ("TC_Popup_Options", 14, 4, 7, 3, 0, "85%", "100% (2/2 Req)"),
        ("TC_QuickBox_Content", 17, 7, 7, 3, 0, "88%", "100% (5/5 Req)"),
        ("TC_SidePanel_AI", 10, 4, 4, 2, 0, "90%", "100% (2/2 Req)"),
        ("TC_Background_Sync", 8, 5, 3, 0, 0, "87%", "100% (2/2 Req)"),
        ("Security & Integrity", 6, 6, 0, 0, 0, "100%", "100% (1/1 Req)"),
        ("Performance Plan", 6, 3, 3, 0, 0, "66%", "100% (NFR)"),
        ("UAT Checklist", 10, 5, 5, 0, 0, "Manual UAT", "100% (10 User Stories)"),
    ]

    for idx, m in enumerate(modules, start=5):
        ws.row_dimensions[idx].height = 24
        is_zebra = (idx % 2 == 1)
        base_fill = FILL_ZEBRA if is_zebra else FILL_WHITE

        ws.cell(row=idx, column=2, value=m[0]).font = FONT_BOLD
        ws.cell(row=idx, column=2).fill = base_fill
        ws.cell(row=idx, column=2).border = BORDER_THIN

        for c_offset in range(1, 8):
            val = m[c_offset]
            cell = ws.cell(row=idx, column=2 + c_offset, value=val)
            cell.font = FONT_REGULAR
            cell.fill = base_fill
            cell.border = BORDER_THIN
            cell.alignment = ALIGN_CENTER
            if c_offset == 1:
                cell.font = FONT_BOLD

    # Total row
    tot_row = len(modules) + 5
    ws.cell(row=tot_row, column=2, value="TỔNG CỘNG").font = FONT_HEADER
    ws.cell(row=tot_row, column=2).fill = FILL_NAVY
    ws.cell(row=tot_row, column=2).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=3, value=f"=SUM(C5:C{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=3).fill = FILL_NAVY
    ws.cell(row=tot_row, column=3).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=4, value=f"=SUM(D5:D{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=4).fill = FILL_NAVY
    ws.cell(row=tot_row, column=4).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=5, value=f"=SUM(E5:E{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=5).fill = FILL_NAVY
    ws.cell(row=tot_row, column=5).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=6, value=f"=SUM(F5:F{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=6).fill = FILL_NAVY
    ws.cell(row=tot_row, column=6).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=7, value=f"=SUM(G5:G{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=7).fill = FILL_NAVY
    ws.cell(row=tot_row, column=7).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=8, value="~ 86.5%").font = FONT_HEADER
    ws.cell(row=tot_row, column=8).fill = FILL_NAVY
    ws.cell(row=tot_row, column=8).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=9, value="100% Bao phủ ✅").font = FONT_HEADER
    ws.cell(row=tot_row, column=9).fill = FILL_NAVY
    ws.cell(row=tot_row, column=9).alignment = ALIGN_CENTER
    ws.row_dimensions[tot_row].height = 26

def main():
    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    print("Building Sheet 1: Test Strategy...")
    ws1 = wb.create_sheet("Test Strategy")
    build_test_strategy_sheet(ws1)

    print("Building Sheet 2: Coverage Matrix...")
    ws2 = wb.create_sheet("Coverage Matrix")
    build_coverage_matrix_sheet(ws2)

    print("Building Sheet 3: TC_Popup_Options...")
    ws3 = wb.create_sheet("TC_Popup_Options")
    build_popup_options_sheet(ws3)

    print("Building Sheet 4: TC_QuickBox_Content...")
    ws4 = wb.create_sheet("TC_QuickBox_Content")
    build_quickbox_content_sheet(ws4)

    print("Building Sheet 5: TC_SidePanel_AI...")
    ws5 = wb.create_sheet("TC_SidePanel_AI")
    build_sidepanel_sheet(ws5)

    print("Building Sheet 6: TC_Background_Sync...")
    ws6 = wb.create_sheet("TC_Background_Sync")
    build_background_sync_sheet(ws6)

    print("Building Sheet 7: Security & Integrity...")
    ws7 = wb.create_sheet("Security & Integrity")
    build_security_sheet(ws7)

    print("Building Sheet 8: Performance Plan...")
    ws8 = wb.create_sheet("Performance Plan")
    build_performance_sheet(ws8)

    print("Building Sheet 9: UAT Checklist...")
    ws9 = wb.create_sheet("UAT Checklist")
    build_uat_checklist_sheet(ws9)

    print("Building Sheet 10: Traceability Matrix...")
    ws10 = wb.create_sheet("Traceability Matrix")
    build_traceability_sheet(ws10)

    print("Building Sheet 11: Summary Dashboard...")
    ws11 = wb.create_sheet("Summary Dashboard")
    build_summary_dashboard_sheet(ws11)

    output_path = Path("/home/bakaryuu/Desktop/MyApp/brse/BrSE_Chrome_Extension_Test_Plan.xlsx")
    wb.save(output_path)
    print(f"Successfully generated Test Plan at: {output_path}")

if __name__ == "__main__":
    main()
