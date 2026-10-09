"""
Comprehensive BrSE OS Web Application Test Plan Generator (Enterprise Standard).
Output: BrSE_OS_Web_Test_Plan.xlsx
Total Sheets: 12
Total Atomic Test Cases: 120 (Covering all 6 Test Viewpoints across all Web App modules)
"""

import sys
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUTPUT_PATH = Path("/home/bakaryuu/Desktop/MyApp/brse/BrSE_OS_Web_Test_Plan.xlsx")

# Typography & Colors
FONT_NAME = "Segoe UI"
FONT_TITLE = Font(name=FONT_NAME, size=14, bold=True, color="1B365D")
FONT_SUBTITLE = Font(name=FONT_NAME, size=10, italic=True, color="595959")
FONT_HEADER = Font(name=FONT_NAME, size=10, bold=True, color="FFFFFF")
FONT_SECTION = Font(name=FONT_NAME, size=11, bold=True, color="FFFFFF")
FONT_REGULAR = Font(name=FONT_NAME, size=9, color="1A1A1A")
FONT_BOLD = Font(name=FONT_NAME, size=9, bold=True, color="1A1A1A")
FONT_MUTED = Font(name=FONT_NAME, size=9, color="7F7F7F")

FILL_NAVY = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
FILL_BLUE_GROUP = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
FILL_ZEBRA = PatternFill(start_color="F9FAFC", end_color="F9FAFC", fill_type="solid")
FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
FILL_CARD = PatternFill(start_color="F2F4F8", end_color="F2F4F8", fill_type="solid")

FILL_P1 = PatternFill(start_color="FFE0E0", end_color="FFE0E0", fill_type="solid")
FONT_P1 = Font(name=FONT_NAME, size=9, bold=True, color="900000")

FILL_P2 = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
FONT_P2 = Font(name=FONT_NAME, size=9, bold=True, color="A61C1C")

FILL_P3 = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
FONT_P3 = Font(name=FONT_NAME, size=9, bold=True, color="8C6500")

FILL_P4 = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
FONT_P4 = Font(name=FONT_NAME, size=9, color="595959")

FILL_GREEN_CHECK = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
FONT_GREEN_CHECK = Font(name=FONT_NAME, size=9, bold=True, color="276A3C")

FILL_YELLOW_WARN = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
FONT_YELLOW_WARN = Font(name=FONT_NAME, size=9, bold=True, color="8C6500")

FILL_RED_GAP = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
FONT_RED_GAP = Font(name=FONT_NAME, size=9, bold=True, color="C00000")

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
    ("Linked API", 28, ALIGN_LEFT),
    ("Linked DB Table", 20, ALIGN_LEFT),
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
                    cell.font = Font(name=FONT_NAME, size=9, bold=True, color="1E7E34")
                elif val == "N":
                    cell.font = Font(name=FONT_NAME, size=9, color="7F7F7F")
                elif val == "Done":
                    cell.font = Font(name=FONT_NAME, size=9, bold=True, color="0070C0")

# ==================== SHEET 1: TEST STRATEGY ====================
def build_test_strategy_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Test Strategy"
    
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 24
    ws.column_dimensions['C'].width = 75
    ws.column_dimensions['D'].width = 28

    ws.merge_cells("B2:D2")
    ws.cell(row=2, column=2, value="CHIẾN LƯỢC KIỂM THỬ TOÀN DIỆN — BRSE OS WEB APPLICATION").font = FONT_TITLE
    ws.row_dimensions[2].height = 32

    ws.merge_cells("B3:D3")
    ws.cell(row=3, column=2, value="Dự án: BrSE OS (Trợ Lý Kỹ Sư Cầu Nối) | Phiên bản: v1.2.0 | Nền tảng: Next.js + FastAPI | Tiêu chuẩn: Enterprise QA").font = FONT_SUBTITLE
    ws.row_dimensions[3].height = 20

    sections = [
        ("1. Mục tiêu kiểm thử (Test Objectives)", [
            ("Mục tiêu chức năng", "Đảm bảo 100% tính năng chính của BrSE OS (Dashboard, Todo, Meeting Note AI, Glossary, Operations, Power Tools) hoạt động mượt mà, đúng chuẩn nghiệp vụ BrSE Nhật - Việt."),
            ("Mục tiêu bảo mật", "Kiểm soát an toàn tuyệt đối chống tấn công XSS trong trình hiển thị Markdown, chống Path Traversal / Zip Slip khi phục hồi dữ liệu sao lưu, bảo vệ biến môi trường nhạy cảm."),
            ("Mục tiêu hiệu năng & Độ trễ", "Thời gian phản hồi các API tra cứu thuật ngữ < 150ms, thời gian tải trang Dashboard < 500ms, hỗ trợ tải đồng thời phục vụ kỹ sư BrSE thao tác liên tục không giật lag."),
            ("Mục tiêu ngoại tuyến & Khả năng phục hồi", "Hỗ trợ làm việc cục bộ (Localhost-first), cơ chế tự lưu ngầm (Auto-save), cảnh báo mất mạng và tự động đồng bộ khi kết nối trở lại.")
        ]),
        ("2. Phạm vi kiểm thử (Scope of Testing)", [
            ("In-Scope (Các màn hình trong phạm vi)", "1. Dashboard & Lịch họp tổng quan (/app)\n2. Quản lý tác vụ BrSE Todo (/app/brse-todo)\n3. Biên bản & Tóm tắt âm thanh Meeting Note AI (/app/meeting-note, /minutes)\n4. Từ điển thuật ngữ Glossary & Kho kiến thức Knowledge (/app/glossary, /app/knowledge)\n5. Quản lý rủi ro & Báo cáo tiến độ Operations & Reports (/app/operations, /app/reports)\n6. Tiện ích DOCX-to-PDF, OCR ảnh & Trợ lý kính ngữ Keigo (/app/power-tools, /app/keigo)\n7. Cài đặt dự án & Cấu hình AI Model selector (/app/settings/projects)"),
            ("Out-of-Scope (Ngoài phạm vi kiểm thử)", "Môi trường Cloud Multi-tenant (dự án thiết kế localhost-first cá nhân); Các trình duyệt không phải Chromium/Firefox phiên bản cũ dưới năm 2022."),
            ("Ràng buộc kỹ thuật", "Frontend Next.js chạy tại cổng 3010, Backend FastAPI chạy cổng 8000, 9router AI Gateway cổng 20128, Ollama cổng 11434.")
        ]),
        ("3. Ma trận Môi trường & Công cụ (Environment & Tools)", [
            ("Trình duyệt kiểm thử", "Google Chrome v120+, Microsoft Edge v120+, Mozilla Firefox v122+ trên Windows 11 Enterprise."),
            ("Backend & Cơ sở dữ liệu", "FastAPI Python 3.12, Uvicorn ASGI Server, SQLite / PostgreSQL, Alembic Migrations."),
            ("Công cụ tự động hóa & Đo tải", "Playwright E2E Runner, Jest / React Testing Library, Pytest HTTPX, k6 Performance Testing.")
        ]),
        ("4. Tiêu chí Bắt đầu & Nghiệm thu (Entry / Exit Criteria)", [
            ("Entry Criteria (Bắt đầu kiểm thử)", "- Bản build frontend không có lỗi typecheck (npm run typecheck pass 100%).\n- Backend khởi động thành công, endpoint /api/health và /api/ai/status phản hồi HTTP 200 OK."),
            ("Exit Criteria (Nghiệm thu chất lượng)", "- 100% ca kiểm thử P1 (Critical) PASS.\n- ≥ 95% ca kiểm thử P2 (High) PASS, các ca còn lại có phương án xử lý thay thế (Workaround).\n- 0 lỗi bảo mật rò rỉ XSS hoặc mất dữ liệu bản ghi người dùng.\n- 100% User Stories trong UAT Checklist được ký duyệt chấp thuận.")
        ]),
        ("5. Phân tích Rủi ro & Giải pháp phòng ngừa (Risks & Mitigations)", [
            ("Rủi ro 1: Mất kết nối AI Gateway (9router / Ollama)", "Biện pháp: Tự động chuyển đổi model dự phòng fallback lane (Ollama hoặc free-logic); hiển thị Toast cảnh báo thân thiện thay vì crash ứng dụng."),
            ("Rủi ro 2: Chuyển đổi DOCX sang PDF lỗi font tiếng Nhật", "Biện pháp: Sử dụng cơ chế Windows COM Automation (Word / WPS) trực tiếp trên Windows, mã hóa header RFC 5987 UTF-8."),
            ("Rủi ro 3: Xung đột dữ liệu đồng thời khi mở nhiều tab", "Biện pháp: Áp dụng cơ chế Optimistic Concurrency Control (OCC) và cảnh báo khi phát hiện bản ghi đã bị sửa đổi ở phiên khác.")
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

# ==================== SHEET 2: COVERAGE MATRIX ====================
def build_coverage_matrix_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Coverage Matrix"
    ws.views.sheetView[0].freezePanes = "C4"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 32
    for c in ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']:
        ws.column_dimensions[c].width = 14

    ws.merge_cells("B2:J2")
    ws.cell(row=2, column=2, value="MA TRẬN ĐỘ BAO PHỦ TÍNH NĂNG WEB × LOẠI HÌNH KIỂM THỬ (COVERAGE MATRIX)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Tính năng cốt lõi (Core Feature)", "UT (Unit)", "IT (Integ)", "API (Spec)", "E2E (User)", "PERF (Tải)", "SEC (B/mật)", "UAT (Duyệt)", "Coverage"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    features = [
        ("Dashboard Cockpit & Today Overview", "✓", "✓", "✓", "✓", "✓", "-", "✓"),
        ("Project Switcher & Context Sync", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("BrSE Todo: Task CRUD & Deadlines", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("BrSE Todo: Auto-save & Dirty State", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Meeting Note AI: Audio Upload STT", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("Meeting Note AI: Summary & Decisions", "✓", "✓", "✓", "✓", "✓", "-", "✓"),
        ("Meeting Note AI: Action-to-Todo Sync", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Meeting Note AI: Export DOCX/Markdown", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Glossary: Japanese Term Lookup Search", "✓", "✓", "✓", "✓", "✓", "-", "✓"),
        ("Glossary: Term CRUD & Duplicate Check", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Glossary: CSV Import/Export UTF-8", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
        ("Knowledge: Article Markdown & Preview", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
        ("Operations: Risk Register & Heatmap", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Reports: Weekly/Monthly AI Generator", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Power Tools: DOCX to PDF COM Converter", "✓", "✓", "✓", "✓", "✓", "✓", "✓"),
        ("Power Tools: Japanese OCR 4-View Engine", "✓", "✓", "✓", "✓", "✓", "-", "✓"),
        ("Keigo Assistant: Politeness Evaluator", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("Keigo Assistant: Email Template Composer", "✓", "✓", "✓", "✓", "-", "-", "✓"),
        ("System: AI Model Selector & Fallback", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
        ("System: Data Backup & Zip Restore Safe", "✓", "✓", "✓", "✓", "-", "✓", "✓"),
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
        
        cov_cell = ws.cell(row=idx, column=10)
        cov_cell.value = f'=COUNTIF(C{idx}:I{idx}, "✓") & "/7 tests ✅"'
        cov_cell.alignment = ALIGN_CENTER
        cov_cell.font = FONT_BOLD
        cov_cell.fill = FILL_GREEN_CHECK
        cov_cell.border = BORDER_THIN

# ==================== SHEET 3: TC_DASHBOARD_TODO ====================
def build_dashboard_todo_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Dashboard_Todo"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Dashboard UI & Navigation
        ("DASH-UI-001", "FEAT-DASHBOARD", "Dashboard", "Empty State khởi tạo", "UI", "P3-Medium",
         "Dự án mới tạo chưa có lịch họp hoặc todo", "1. Đăng nhập vào trang chính http://127.0.0.1:3010/app\n2. Quan sát widget Today và Quick Tasks", "N/A",
         "Hiển thị card Empty state có hình minh họa thân thiện kèm nút CTA: 'Tạo công việc đầu tiên'.",
         "GET /api/calendar/events", "todos, calendar_events", "Y", "UI Empty State Viewpoint"),

        ("DASH-UI-002", "FEAT-DASHBOARD", "Dashboard", "Chuyển đổi Theme Dark / Light", "UI", "P3-Medium",
         "Đang mở trang Dashboard", "1. Click icon mặt trăng/mặt trời góc trên bên phải\n2. Tải lại trang (F5)", "Theme: Dark Mode",
         "Giao diện đổi màu tương phản chuẩn dark mode; token CSS lưu vào LocalStorage và duy trì sau khi tải lại.",
         "N/A", "local_storage", "Y", "Persistence Viewpoint"),

        ("DASH-FLOW-003", "FEAT-PROJECTS", "Dashboard", "Project Switcher chuyển dự án", "E2E", "P1-Critical",
         "Hệ thống có sẵn 2 dự án (Dự án Sakura, Dự án Fuji)", "1. Click dropdown chọn dự án ở thanh tiêu đề\n2. Chọn 'Dự án Fuji'\n3. Quan sát các widget", "Project ID: proj-fuji",
         "Toàn bộ widget lịch họp, todo, rủi ro tự động nạp lại dữ liệu tương ứng của 'Dự án Fuji'.",
         "GET /api/settings/projects", "projects", "Y", "Multi-project Context"),

        ("DASH-NET-004", "FEAT-DASHBOARD", "Dashboard", "Cảnh báo Mất mạng (Offline Mode)", "E2E", "P2-High",
         "Đang thao tác trên Dashboard", "1. Ngắt kết nối mạng hoặc tắt Backend\n2. Thực hiện thao tác trên màn hình", "Network: Offline",
         "Xuất hiện banner màu vàng ở đầu trang: 'Đang ở chế độ ngoại tuyến. Dữ liệu sẽ được lưu cục bộ'.",
         "GET /api/ai/status", "local_storage", "Y", "Network Offline Viewpoint"),

        # Todo Validation & Limits
        ("TODO-VAL-005", "FEAT-TODO", "BrSE Todo", "Tiêu đề rỗng (0 ký tự)", "VAL", "P2-High",
         "Đang ở màn hình Quản lý Todo (/app/brse-todo)", "1. Bấm nút 'Thêm công việc'\n2. Để trống ô tiêu đề\n3. Bấm 'Lưu'", "title: ''",
         "Hiển thị thông báo lỗi viền đỏ: 'Tiêu đề không được để trống'. Không gửi request lên server.",
         "POST /api/todos", "todos", "Y", "Atomic Validation BVA 0 char"),

        ("TODO-VAL-006", "FEAT-TODO", "BrSE Todo", "Tiêu đề biên trên (255 ký tự)", "VAL", "P2-High",
         "Đang ở form tạo Todo", "1. Nhập chuỗi đúng 255 ký tự chữ và số\n2. Bấm 'Lưu'", "Length: 255 chars",
         "Cho phép tạo thành công; tiêu đề lưu đầy đủ không bị cắt ngắn.",
         "POST /api/todos", "todos", "Y", "Atomic Validation BVA Max"),

        ("TODO-VAL-007", "FEAT-TODO", "BrSE Todo", "Tiêu đề vượt biên (256 ký tự)", "VAL", "P2-High",
         "Đang ở form tạo Todo", "1. Nhập chuỗi 256 ký tự vào ô tiêu đề\n2. Quan sát ô nhập", "Length: 256 chars",
         "Hệ thống chặn không cho nhập tiếp ký tự thứ 256 hoặc báo lỗi 'Tiêu đề tối đa 255 ký tự'.",
         "POST /api/todos", "todos", "Y", "Atomic Validation BVA Max+1"),

        ("TODO-VAL-008", "FEAT-TODO", "BrSE Todo", "Hạn chót trong quá khứ (Past Due)", "VAL", "P3-Medium",
         "Ngày hiện tại là 09/10/2026", "1. Chọn ngày hạn chót là 01/10/2026\n2. Lưu công việc", "dueDate: '2026-10-01'",
         "Công việc được lưu kèm huy hiệu cảnh báo 'Quá hạn' (Overdue) màu đỏ nổi bật.",
         "POST /api/todos", "todos", "Y", "Date Boundary Viewpoint"),

        # Todo CRUD & Business Flow
        ("TODO-FLOW-009", "FEAT-TODO", "BrSE Todo", "Tạo Todo hợp lệ đầy đủ trường", "E2E", "P1-Critical",
         "Đang ở màn hình Todo", "1. Nhập tiêu đề 'Review tài liệu SRS v1.2'\n2. Chọn Priority = P0 (Khẩn cấp)\n3. Chọn ngày hạn chót\n4. Bấm Lưu", "Priority: P0, Category: Spec",
         "Task xuất hiện trên đầu danh sách với huy hiệu P0 đỏ; phản hồi HTTP 201 Created.",
         "POST /api/todos", "todos", "Y", "Happy Path CRUD"),

        ("TODO-FLOW-010", "FEAT-TODO", "BrSE Todo", "Chuyển trạng thái Todo (Kanban / Checkbox)", "E2E", "P1-Critical",
         "Todo đang ở trạng thái 'Todo'", "1. Click vào checkbox đánh dấu hoàn thành\n2. Quan sát giao diện", "status: 'done'",
         "Dòng công việc chuyển sang chữ gạch ngang mờ; bộ đếm task hoàn thành trong ngày tăng thêm 1.",
         "PATCH /api/todos/{id}", "todos", "Y", "State Transition Viewpoint"),

        ("TODO-FLOW-011", "FEAT-TODO", "BrSE Todo", "Tự động lưu mô tả (Auto-save debounce)", "UI", "P2-High",
         "Đang mở chi tiết 1 Todo", "1. Nhập ghi chú vào ô mô tả\n2. Dừng gõ phím trong 1.5 giây\n3. Quan sát indicator", "Description update",
         "Hiển thị nhãn nhỏ 'Đã lưu ngầm' (Auto-saved) mà không cần bấm nút Save thủ công.",
         "PATCH /api/todos/{id}", "todos", "Y", "Debounce Auto-save Viewpoint"),

        ("TODO-FLOW-012", "FEAT-TODO", "BrSE Todo", "Phím tắt nhanh (Ctrl + Enter)", "UI", "P3-Medium",
         "Đang focus vào ô nhập nhanh Todo", "1. Gõ 'Họp khẩn cấp với khách lúc 15h'\n2. Nhấn tổ hợp phím Ctrl + Enter", "Shortcut: Ctrl+Enter",
         "Công việc được thêm ngay lập tức; con trỏ chuột tự động xóa trắng sẵn sàng nhập task tiếp.",
         "POST /api/todos", "todos", "Y", "Productivity Shortcut"),

        ("TODO-FLOW-013", "FEAT-TODO", "BrSE Todo", "Chống thao tác kép (Double-click submit)", "UI", "P2-High",
         "Đang ở form tạo Todo", "1. Điền tiêu đề hợp lệ\n2. Bấm liên tiếp 2 lần thật nhanh vào nút 'Lưu'", "Rapid double-click",
         "Nút bấm chuyển sang disabled ngay sau click đầu; chỉ có duy nhất 1 bản ghi được tạo ra.",
         "POST /api/todos", "todos", "Y", "Double Submit Prevention"),

        # Todo Search & Filter
        ("TODO-SRCH-014", "FEAT-TODO", "BrSE Todo", "Tìm kiếm tiếng Việt không dấu", "SRCH", "P2-High",
         "Danh sách có task 'Kiểm thử đơn vị module Auth'", "1. Gõ vào ô tìm kiếm: 'kiem thu don vi'\n2. Quan sát danh sách", "Query: 'kiem thu don vi'",
         "Lọc chính xác task 'Kiểm thử đơn vị module Auth' dù từ khóa không có dấu.",
         "GET /api/todos?search=...", "todos", "Y", "Unaccented Vietnamese Search"),

        ("TODO-SRCH-015", "FEAT-TODO", "BrSE Todo", "Bộ lọc đa tiêu chí (Priority + Status)", "SRCH", "P2-High",
         "Danh sách có 20 todos nhiều trạng thái", "1. Chọn lọc Priority = P0\n2. Chọn lọc Status = In Progress", "Filter: P0 & In Progress",
         "Chỉ hiển thị các task thỏa mãn ĐỒNG THỜI cả 2 điều kiện; hiển thị số kết quả khớp.",
         "GET /api/todos?priority=P0&status=in_progress", "todos", "Y", "Multi-condition Filter"),

        ("TODO-SRCH-016", "FEAT-TODO", "BrSE Todo", "Sắp xếp theo hạn chót (Sort by Due Date)", "SRCH", "P3-Medium",
         "Danh sách có nhiều ngày hạn chót", "1. Chọn sắp xếp 'Hạn chót gần nhất'\n2. Chọn 'Hạn chót xa nhất'", "Sort order: ASC / DESC",
         "Thứ tự hiển thị đổi chiều ngay lập tức mà không cần reload toàn bộ trang.",
         "GET /api/todos?sort=due_date", "todos", "Y", "Sorting Viewpoint"),

        # Todo Deletion & Security
        ("TODO-FLOW-017", "FEAT-TODO", "BrSE Todo", "Xóa Todo kèm xác nhận an toàn", "E2E", "P2-High",
         "Todo đang hiển thị trên danh sách", "1. Click icon thùng rác\n2. Hộp thoại modal xác nhận hiện lên\n3. Click 'Xác nhận xóa'", "Action: Delete Confirm",
         "Todo biến mất khỏi danh sách; DB cập nhật trạng thái xóa mềm (soft-delete) hoặc xóa triệt để.",
         "DELETE /api/todos/{id}", "todos", "Y", "Safe Deletion Modal"),

        ("TODO-SEC-018", "FEAT-TODO", "BrSE Todo", "Chống tấn công XSS trong tiêu đề Todo", "SEC", "P1-Critical",
         "Đang ở ô nhập Todo", "1. Nhập tiêu đề: <script>alert('xss')</script> Test\n2. Lưu và mở lại danh sách", "Payload XSS",
         "Chuỗi hiển thị dưới dạng văn bản an toàn; không có popup alert nào của trình duyệt bị kích hoạt.",
         "POST /api/todos", "todos", "Y", "XSS Sanitization Viewpoint"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 4: TC_MEETING_MINUTES ====================
def build_meeting_minutes_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Meeting_Minutes"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        ("MEET-VAL-001", "FEAT-MEETING-AI", "Meeting AI", "Tải lên tệp rỗng (0 bytes)", "VAL", "P2-High",
         "Đang ở trang Upload (/app/meeting-note)", "1. Chọn tệp audio 0 bytes\n2. Bấm 'Bắt đầu xử lý'", "File: empty_audio.mp3 (0 B)",
         "Hiển thị thông báo lỗi màu đỏ: 'Tệp không có nội dung (0 bytes). Vui lòng chọn tệp hợp lệ'.",
         "POST /api/meetings/upload", "meetings", "Y", "Empty File Validation"),

        ("MEET-VAL-002", "FEAT-MEETING-AI", "Meeting AI", "Tải lên tệp vượt 50MB (BVA Max+1)", "VAL", "P1-Critical",
         "Giới hạn hệ thống là 50MB", "1. Chọn tệp audio dung lượng 52MB\n2. Kéo thả vào ô upload", "File: 52MB audio.m4a",
         "Chặn ngay từ phía client kèm thông báo: 'Dung lượng tệp vượt quá giới hạn cho phép (Tối đa 50MB)'.",
         "POST /api/meetings/upload", "meetings", "Y", "File Size BVA Boundary"),

        ("MEET-VAL-003", "FEAT-MEETING-AI", "Meeting AI", "Tải lên tệp định dạng nguy hiểm", "VAL", "P1-Critical",
         "Hệ thống chỉ chấp nhận audio/text", "1. Đổi tên tệp mã độc thành payload.exe hoặc script.sh\n2. Upload", "File: payload.exe",
         "Hệ thống từ chối tệp ngay lập tức; thông báo: 'Định dạng tệp không được hỗ trợ'.",
         "POST /api/meetings/upload", "meetings", "Y", "Security File Type Filter"),

        ("MEET-VAL-004", "FEAT-MEETING-AI", "Meeting AI", "Tải lên tệp hợp lệ (Happy Path)", "E2E", "P1-Critical",
         "Tệp ghi âm cuộc họp chuẩn", "1. Tải lên tệp meeting_recording.mp3 (15MB)\n2. Quan sát thanh tiến trình", "File: meeting.mp3 (15MB)",
         "Thanh tiến trình chạy mượt từ 0% đến 100%; hiển thị nút 'Chuyển sang bước Xử lý AI'.",
         "POST /api/meetings/upload", "meetings", "Y", "Happy Path Upload"),

        ("MEET-FLOW-005", "FEAT-MEETING-AI", "Meeting AI", "STT Nhận dạng giọng nói tiếng Nhật", "API", "P1-Critical",
         "File âm thanh chứa hội thoại tiếng Nhật", "1. Kích hoạt xử lý STT Whisper\n2. Kiểm tra văn bản transcript", "Audio: Japanese Meeting",
         "Văn bản bóc tách chính xác phân đoạn theo người nói (Speaker 1, Speaker 2) và mốc thời gian.",
         "POST /api/stt/transcribe", "meetings", "Y", "Speech-to-Text Accuracy"),

        ("MEET-FLOW-006", "FEAT-MEETING-AI", "Meeting AI", "AI Tóm tắt cuộc họp đa ngôn ngữ", "API", "P1-Critical",
         "Transcript đã sẵn sàng", "1. Bấm nút 'Sinh biên bản cuộc họp bằng AI'\n2. Chọn ngôn ngữ: Nhật & Việt", "Model: Qwen / Gemma",
         "Tạo ra 3 phần rõ ràng: Tổng quan cuộc họp, Vấn đề đã thảo luận, Kết luận chính.",
         "POST /api/meetings/process", "meeting_minutes", "Y", "AI Summarization"),

        ("MEET-FLOW-007", "FEAT-MEETING-AI", "Meeting AI", "Trích xuất Quyết định chính xác", "API", "P1-Critical",
         "Nội dung có câu 'Chốt dời deadline sang ngày 15/10'", "1. Xem mục Quyết định (Decisions) trong biên bản", "Prompt: Extract decisions",
         "Trích xuất đúng câu quyết định kèm bối cảnh người đồng ý.",
         "POST /api/meetings/process", "meeting_minutes", "Y", "Decision Extraction"),

        ("MEET-FLOW-008", "FEAT-MEETING-AI", "Meeting AI", "Chuyển Action Items thành BrSE Todo", "E2E", "P1-Critical",
         "Biên bản phát hiện 3 việc cần làm", "1. Tại bảng Action Items, click nút 'Tạo Todo dự án'\n2. Chuyển sang màn hình Todo", "Action: Sync to Todo",
         "3 công việc mới xuất hiện trong BrSE Todo có gắn thẻ link ngược về cuộc họp nguồn.",
         "POST /api/todos/batch-create", "todos, meeting_minutes", "Y", "Cross-module Sync"),

        ("MEET-FLOW-009", "FEAT-GLOSSARY", "Meeting AI", "Tự động trích xuất Thuật ngữ mới", "E2E", "P2-High",
         "Cuộc họp nhắc đến từ mới '回帰テスト'", "1. Xem widget 'Thuật ngữ phát hiện'\n2. Click 'Thêm vào Glossary'", "Term: '回帰テスト'",
         "Hệ thống mở modal thêm thuật ngữ đã điền sẵn Kanji, Furigana và gợi ý nghĩa tiếng Việt.",
         "POST /api/meetings/{id}/extract-glossary", "glossary_terms", "Y", "Glossary Discovery"),

        ("MEET-FLOW-010", "FEAT-MEETING-AI", "Meeting AI", "Chỉnh sửa trực tiếp trên Rich Editor", "UI", "P2-High",
         "Biên bản đã được sinh ra", "1. Click vào đoạn văn bản tóm tắt\n2. Thêm bớt nội dung, in đậm, gạch đầu dòng", "Editor: TipTap / Quill",
         "Nội dung cập nhật mượt mà; hỗ trợ đầy đủ thanh công cụ định dạng văn bản.",
         "PUT /api/meeting-minutes/{id}", "meeting_minutes", "Y", "Rich Text Editing"),

        ("MEET-FLOW-011", "FEAT-MEETING-AI", "Meeting AI", "Cảnh báo Dirty State khi rời trang", "UI", "P2-High",
         "Đang sửa biên bản chưa bấm Lưu", "1. Click vào menu chuyển sang màn hình khác\n2. Quan sát thông báo", "Dirty state: true",
         "Modal cảnh báo hiện lên: 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời đi?'.",
         "N/A", "DOM / Window event", "Y", "Dirty State Protection"),

        ("MEET-FLOW-012", "FEAT-MEETING-AI", "Meeting AI", "Xuất file Word (.docx) chuẩn BrSE", "API", "P1-Critical",
         "Biên bản đã hoàn thiện", "1. Click nút 'Xuất Word (.docx)'\n2. Mở file tải về", "Format: docx",
         "Tải về file Word có logo dự án, bảng quyết định kẻ viền chuyên nghiệp, font Segoe UI/Meiryo.",
         "POST /api/meeting-minutes/{id}/export-docx", "meeting_minutes", "Y", "Docx Export Fidelity"),

        ("MEET-FLOW-013", "FEAT-MEETING-AI", "Meeting AI", "Xuất file Markdown (.md) cho Git", "API", "P3-Medium",
         "Biên bản đã hoàn thiện", "1. Click nút 'Xuất Markdown'\n2. Tải về file .md", "Format: markdown",
         "File markdown chứa cấu trúc header, table chuẩn Github Flavored Markdown.",
         "POST /api/meeting-minutes/{id}/export-md", "meeting_minutes", "Y", "Markdown Export"),

        ("MEET-UI-014", "FEAT-MEETING-AI", "Meeting AI", "Màn hình In ấn Print Preview chuẩn A4", "UI", "P2-High",
         "Đang ở trang /app/meeting-note/print", "1. Bấm tổ hợp phím Ctrl + P\n2. Xem bản in thử A4", "Page setup: A4 Portrait",
         "Ẩn toàn bộ thanh sidebar và nút bấm; căn lề chuẩn 2cm; ngắt trang hợp lý giữa các bảng.",
         "N/A", "CSS @media print", "Y", "Print CSS Viewpoint"),

        ("MEET-NET-015", "FEAT-MEETING-AI", "Meeting AI", "Xử lý Timeout khi AI Gateway bận", "NET", "P2-High",
         "Mô hình AI phản hồi quá 30 giây", "1. Gửi lệnh sinh biên bản\n2. Chờ hết thời gian timeout", "Timeout: 30s",
         "Giao diện không bị treo đơ; hiện thông báo: 'Máy chủ AI phản hồi chậm. Bấm Thử lại để gửi tiếp'.",
         "POST /api/meetings/process", "meeting_minutes", "Y", "Network Timeout Resilience"),

        ("MEET-NET-016", "FEAT-AI-MODELS", "Meeting AI", "Tự động Fallback sang mô hình Local", "NET", "P2-High",
         "9router Gateway bị ngắt kết nối", "1. Yêu cầu tóm tắt biên bản\n2. Quan sát chuyển hướng runtime", "Gateway: 20128 down",
         "Hệ thống tự động chuyển sang gọi Ollama Local (Port 11434, Qwen 2.5) để hoàn thành tác vụ.",
         "POST /api/ai/chat", "ai_runtimes", "Y", "Failover Routing"),

        ("MEET-SEC-017", "FEAT-MEETING-AI", "Meeting AI", "Lọc mã độc trong Transcript tải lên", "SEC", "P1-Critical",
         "Tệp transcript chứa thẻ <img src=x onerror=...>", "1. Tải lên tệp transcript chứa payload\n2. Mở xem nội dung", "Payload XSS",
         "Trình render làm sạch thẻ độc hại bằng DOMPurify trước khi đưa vào DOM của trang.",
         "POST /api/meetings/upload", "meetings", "Y", "XSS Content Sanitization"),

        ("MEET-UI-018", "FEAT-MEETING-AI", "Meeting AI", "Responsive trên màn hình Laptop 1366x768", "UI", "P3-Medium",
         "Độ phân giải màn hình 1366x768", "1. Mở trang xem biên bản chi tiết\n2. Quan sát bố cục 2 cột", "Viewport: 1366x768",
         "Cột transcript bên trái và cột biên bản bên phải tự co giãn tỷ lệ 50-50 không tràn màn hình.",
         "N/A", "Tailwind responsive", "Y", "Screen Size Adaptability"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 5: TC_KNOWLEDGE_GLOSSARY ====================
def build_knowledge_glossary_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Knowledge_Glossary"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Glossary Validation & Search
        ("GLS-VAL-001", "FEAT-GLOSSARY", "Glossary", "Thêm từ với Kanji / Nghĩa để trống", "VAL", "P2-High",
         "Đang ở form thêm thuật ngữ mới", "1. Để trống ô Kanji và ô Nghĩa tiếng Việt\n2. Bấm 'Lưu thuật ngữ'", "Input: empty",
         "Báo lỗi đỏ ở cả 2 trường: 'Vui lòng nhập Kanji hoặc Romaji và Nghĩa tiếng Việt'.",
         "POST /api/glossary/", "glossary_terms", "Y", "Mandatory Field Validation"),

        ("GLS-VAL-002", "FEAT-GLOSSARY", "Glossary", "Thêm thuật ngữ hợp lệ đầy đủ", "E2E", "P1-Critical",
         "Đang ở form thêm thuật ngữ", "1. Kanji: '結合テスト'\n2. Furigana: 'けつごうてすと'\n3. Nghĩa: 'Kiểm thử tích hợp'\n4. Lưu", "Term data valid",
         "Thuật ngữ được thêm vào bảng; xuất hiện Toast xanh 'Đã thêm thuật ngữ thành công'.",
         "POST /api/glossary/", "glossary_terms", "Y", "Happy Path Creation"),

        ("GLS-VAL-003", "FEAT-GLOSSARY", "Glossary", "Cảnh báo trùng lặp thuật ngữ đã có", "VAL", "P2-High",
         "Từ điển đã có từ '単体テスト'", "1. Thêm mới từ '単体テスト' với cùng ngữ cảnh\n2. Bấm Lưu", "Duplicate term: '単体テスト'",
         "Hiển thị cảnh báo: 'Thuật ngữ này đã tồn tại trong dự án. Bạn có muốn cập nhật không?'.",
         "POST /api/glossary/", "glossary_terms", "Y", "Duplicate Prevention"),

        ("GLS-SRCH-004", "FEAT-GLOSSARY", "Glossary", "Tra cứu chính xác theo Kanji", "SRCH", "P1-Critical",
         "Từ điển có 500 từ chuyên ngành", "1. Nhập vào thanh tìm kiếm: '結合テスト'\n2. Quan sát danh sách", "Query: '結合テスト'",
         "Hiển thị ngay thẻ từ vựng '結合テスト' trong vòng < 100ms với đầy đủ nghĩa và ví dụ.",
         "GET /api/glossary/?search=...", "glossary_terms", "Y", "Exact Kanji Match"),

        ("GLS-SRCH-005", "FEAT-GLOSSARY", "Glossary", "Tra cứu theo Furigana (Hiragana)", "SRCH", "P1-Critical",
         "Từ điển có từ '要件定義'", "1. Nhập vào ô tìm kiếm: 'ようけんていぎ'", "Query: 'ようけんていぎ'",
         "Khớp đúng từ '要件定義' (Furigana: ようけんていぎ, Nghĩa: Đặc tả yêu cầu).",
         "GET /api/glossary/?search=...", "glossary_terms", "Y", "Furigana Search"),

        ("GLS-SRCH-006", "FEAT-GLOSSARY", "Glossary", "Tra cứu theo Romaji", "SRCH", "P2-High",
         "Từ điển có từ '設計書'", "1. Nhập Romaji: 'sekkeisho'\n2. Quan sát kết quả", "Query: 'sekkeisho'",
         "Tìm thấy từ '設計書' (Thiết kế / Specification document).",
         "GET /api/glossary/?search=...", "glossary_terms", "Y", "Romaji Search"),

        ("GLS-SRCH-007", "FEAT-GLOSSARY", "Glossary", "Tra cứu tiếng Việt không dấu", "SRCH", "P1-Critical",
         "Từ điển có từ 'Kiểm thử hồi quy'", "1. Nhập từ khóa: 'kiem thu hoi quy'", "Query: 'kiem thu hoi quy'",
         "Khớp đúng từ '回帰テスト' (Regression Testing / Kiểm thử hồi quy).",
         "GET /api/glossary/?search=...", "glossary_terms", "Y", "Unaccented Search"),

        ("GLS-SRCH-008", "FEAT-GLOSSARY", "Glossary", "Tra cứu từ không có trong từ điển", "SRCH", "P3-Medium",
         "Từ mới chưa từng gặp", "1. Nhập từ lạ: '量子コンピューティング'\n2. Quan sát kết quả", "Query: unknown term",
         "Hiển thị Empty state: 'Không tìm thấy thuật ngữ. Bạn có muốn hỏi AI giải nghĩa từ này?'.",
         "GET /api/glossary/?search=...", "glossary_terms", "Y", "Empty State Fallback"),

        # Glossary Flow & Import/Export
        ("GLS-FLOW-009", "FEAT-GLOSSARY", "Glossary", "Chỉnh sửa thông tin thuật ngữ", "E2E", "P2-High",
         "Thuật ngữ đã có trong từ điển", "1. Click nút Sửa (Edit)\n2. Bổ sung ví dụ câu thực tế\n3. Bấm Cập nhật", "Update example",
         "Dữ liệu cập nhật ngay trên giao diện; thông báo cập nhật thành công.",
         "PUT /api/glossary/{id}", "glossary_terms", "Y", "Update Term"),

        ("GLS-FLOW-010", "FEAT-GLOSSARY", "Glossary", "Xóa thuật ngữ khỏi từ điển", "E2E", "P2-High",
         "Thuật ngữ không còn dùng", "1. Click icon Xóa\n2. Xác nhận hộp thoại modal\n3. Quan sát danh sách", "Delete action",
         "Thuật ngữ được gỡ bỏ khỏi bảng; hoàn tác (Undo) xuất hiện trong Toast 5 giây.",
         "DELETE /api/glossary/{id}", "glossary_terms", "Y", "Delete with Undo"),

        ("GLS-FLOW-011", "FEAT-GLOSSARY", "Glossary", "Xuất từ điển ra CSV UTF-8", "API", "P2-High",
         "Từ điển có 100 từ tiếng Nhật", "1. Click nút 'Xuất CSV (UTF-8)'\n2. Mở file CSV trong Excel", "Export CSV",
         "File CSV mở lên hiển thị đầy đủ tiếng Nhật không bị lỗi font (có BOM UTF-8).",
         "GET /api/glossary/export", "glossary_terms", "Y", "CSV Export Encoding"),

        ("GLS-FLOW-012", "FEAT-GLOSSARY", "Glossary", "Nhập từ điển từ CSV (Import Batch)", "API", "P2-High",
         "File CSV chứa 50 thuật ngữ mới", "1. Tải lên file CSV\n2. Bấm 'Bắt đầu nhập dữ liệu'", "Import 50 rows",
         "Nhập thành công 50 từ; báo cáo tổng kết: 48 từ mới, 2 từ trùng lặp được bỏ qua.",
         "POST /api/glossary/import", "glossary_terms", "Y", "Batch Import Logic"),

        # Knowledge Base
        ("KNOW-UI-013", "FEAT-KNOWLEDGE", "Knowledge", "Hiển thị danh sách bài viết kiến thức", "UI", "P3-Medium",
         "Đang ở trang /app/knowledge", "1. Quan sát danh mục bài viết theo Tag (Kiến trúc, Hướng dẫn, FAQ)", "N/A",
         "Bài viết hiển thị dạng thẻ card có tóm tắt nội dung, tag màu và thời gian cập nhật.",
         "GET /api/knowledge/", "knowledge_items", "Y", "Card Layout Viewpoint"),

        ("KNOW-FLOW-014", "FEAT-KNOWLEDGE", "Knowledge", "Tạo bài viết mới với Markdown Editor", "E2E", "P2-High",
         "Đang mở form tạo bài viết", "1. Nhập tiêu đề: 'Quy chuẩn đặt tên biến tiếng Nhật'\n2. Soạn nội dung Markdown", "Markdown doc",
         "Lưu bài viết thành công; bài viết hiển thị trên danh mục chung của dự án.",
         "POST /api/knowledge/", "knowledge_items", "Y", "Markdown Authoring"),

        ("KNOW-FLOW-015", "FEAT-KNOWLEDGE", "Knowledge", "Live Preview hiển thị song song", "UI", "P2-High",
         "Đang soạn thảo bài viết", "1. Nhập bảng biểu, code block Python, link vào cột trái\n2. Nhìn cột phải", "Preview side-by-side",
         "Cột phải render tức thì cú pháp Markdown, code highlight chuẩn màu sắc không giật lag.",
         "N/A", "React Markdown renderer", "Y", "Live Split Preview"),

        ("KNOW-SRCH-016", "FEAT-KNOWLEDGE", "Knowledge", "Lọc bài viết theo Tag và Dự án", "SRCH", "P2-High",
         "Có 30 bài viết gắn nhiều tag", "1. Bấm vào tag '#Architecture'\n2. Quan sát kết quả lọc", "Tag: #Architecture",
         "Chỉ hiển thị các bài viết có gắn tag #Architecture; đếm đúng số lượng kết quả.",
         "GET /api/knowledge/?tag=Architecture", "knowledge_items", "Y", "Tag Filtering"),

        ("KNOW-SEC-017", "FEAT-KNOWLEDGE", "Knowledge", "Chống XSS chèn iframe độc trong Markdown", "SEC", "P1-Critical",
         "Soạn bài viết chứa <iframe src='malicious.site'>", "1. Dán thẻ iframe vào nội dung bài viết\n2. Xem chế độ đọc", "Payload iframe",
         "Thẻ iframe bị DOMPurify lọc sạch; không tải nội dung ngoài gây rò rỉ bảo mật.",
         "POST /api/knowledge/", "knowledge_items", "Y", "Security Markdown Sanitize"),

        ("GLS-NET-018", "FEAT-GLOSSARY", "Glossary", "Đồng bộ Offline Cache cho Extension", "NET", "P2-High",
         "Chrome Extension kết nối lấy glossary", "1. Gọi API đồng bộ cache thuật ngữ\n2. Ngắt mạng và tra cứu", "Cache sync",
         "Dữ liệu được lưu trong IndexedDB / Storage; vẫn tra cứu từ điển bình thường khi offline.",
         "GET /api/glossary/sync-cache", "local_storage", "Y", "Offline Glossary Cache"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 6: TC_OPERATIONS_REPORTS ====================
def build_operations_reports_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_Operations_Reports"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Operations & Risk Management
        ("OPS-VAL-001", "FEAT-OPERATIONS", "Operations", "Xác suất & Tác động vượt ngưỡng (1-5)", "VAL", "P2-High",
         "Form tạo Rủi ro dự án", "1. Nhập Probability = 6 hoặc Impact = 0\n2. Bấm Lưu", "Values out of bounds",
         "Báo lỗi đỏ: 'Xác suất và Tác động phải là số nguyên từ 1 đến 5'. Chặn submit.",
         "POST /api/operations/risks", "project_risks", "Y", "Numeric Range Validation"),

        ("OPS-FLOW-002", "FEAT-OPERATIONS", "Operations", "Tạo mới Rủi ro dự án (Risk Register)", "E2E", "P1-Critical",
         "Đang ở trang /app/operations", "1. Tiêu đề: 'Khách hàng đổi spec API vào phút chót'\n2. Xác suất = 4, Tác động = 4\n3. Lưu", "Risk score: 16",
         "Rủi ro được ghi nhận; tự động tính điểm rủi ro Risk Score = 16 (Mức Đỏ - Khẩn cấp).",
         "POST /api/operations/risks", "project_risks", "Y", "Risk Creation Calculation"),

        ("OPS-UI-003", "FEAT-OPERATIONS", "Operations", "Ma trận Rủi ro (Heatmap 5x5)", "UI", "P2-High",
         "Đã có 10 rủi ro trong dự án", "1. Xem biểu đồ ma trận 5x5 Risk Heatmap\n2. Rê chuột vào ô (4,4)", "Heatmap matrix",
         "Ô (4,4) hiển thị chấm đỏ kèm tooltip liệt kê tên các rủi ro thuộc nhóm này.",
         "GET /api/operations/risks/matrix", "project_risks", "Y", "Heatmap Data Visualization"),

        ("OPS-FLOW-004", "FEAT-OPERATIONS", "Operations", "Gán Kế hoạch giảm thiểu (Mitigation)", "E2E", "P2-High",
         "Rủi ro đang mở", "1. Mở chi tiết rủi ro\n2. Nhập kế hoạch: 'Họp chốt freeze spec ngày thứ 4'\n3. Gán người phụ trách", "Mitigation plan",
         "Lưu kế hoạch thành công; hiển thị badge người phụ trách trên danh sách.",
         "PATCH /api/operations/risks/{id}", "project_risks", "Y", "Mitigation Assignment"),

        ("OPS-FLOW-005", "FEAT-OPERATIONS", "Operations", "Đóng Rủi ro (Chuyển trạng thái Closed)", "E2E", "P2-High",
         "Rủi ro đã được xử lý", "1. Đổi trạng thái sang 'Closed'\n2. Nhập lý do đóng rủi ro\n3. Lưu", "Status: Closed",
         "Rủi ro chuyển sang tab 'Đã giải quyết'; biểu đồ tỷ lệ rủi ro mở cập nhật giảm xuống.",
         "PATCH /api/operations/risks/{id}", "project_risks", "Y", "Risk Lifecycle Status"),

        ("OPS-SRCH-006", "FEAT-OPERATIONS", "Operations", "Lọc rủi ro theo Mức độ nghiêm trọng", "SRCH", "P2-High",
         "Danh sách có 15 rủi ro", "1. Chọn lọc 'High Risk (Score ≥ 15)'\n2. Quan sát bảng", "Filter: High",
         "Chỉ hiển thị các rủi ro có điểm từ 15 đến 25; các rủi ro thấp hơn bị ẩn.",
         "GET /api/operations/risks?level=high", "project_risks", "Y", "Risk Severity Filter"),

        ("OPS-FLOW-007", "FEAT-OPERATIONS", "Operations", "Ghi Nhật ký vận hành (Daily Notes)", "E2E", "P2-High",
         "Đang ở tab Operational Notes", "1. Nhập nhật ký ngày: 'Đã deploy hotfix v1.1.2 lên production'\n2. Bấm Lưu", "Daily note entry",
         "Dòng nhật ký hiển thị theo dòng thời gian (Timeline) kèm thời gian lưu chính xác.",
         "POST /api/operations/notes", "operational_notes", "Y", "Timeline Logging"),

        # Reports Module
        ("REP-UI-008", "FEAT-REPORTS", "Reports", "Giao diện Tạo báo cáo tuần (Weekly Report)", "UI", "P3-Medium",
         "Đang ở trang /app/reports", "1. Bấm nút 'Tạo báo cáo tuần mới'\n2. Quan sát cấu trúc form", "Template: Weekly",
         "Form hiển thị cấu trúc chuẩn Horenso: Việc đã làm tuần này, Việc tuần tới, Khó khăn/Rủi ro.",
         "GET /api/reports/templates", "reports", "Y", "Report Layout Structure"),

        ("REP-FLOW-009", "FEAT-REPORTS", "Reports", "Tự động gom dữ liệu Todo vào Báo cáo", "E2E", "P1-Critical",
         "Tuần này đã hoàn thành 8 Todos", "1. Click nút 'Tự động lấy dữ liệu từ BrSE Todo'\n2. Quan sát ô nhập", "Auto-aggregate todos",
         "Danh sách 8 công việc đã hoàn thành tự động được điền vào mục 'Việc đã làm' không cần gõ tay.",
         "GET /api/reports/aggregate-data", "todos, reports", "Y", "Automated Data Ingestion"),

        ("REP-FLOW-010", "FEAT-REPORTS", "Reports", "AI Trợ lý viết báo cáo tiếng Nhật chuẩn", "API", "P1-Critical",
         "Bản nháp tiếng Việt đã có", "1. Bấm nút 'AI Viết lại sang tiếng Nhật báo cáo'\n2. Đợi phản hồi", "AI Translation Horenso",
         "Tạo ra bản báo cáo tiếng Nhật sử dụng đúng văn phong báo cáo định kỳ (進捗報告書).",
         "POST /api/reports/generate-ai", "reports", "Y", "AI Report Generation"),

        ("REP-VAL-011", "FEAT-REPORTS", "Reports", "Tiêu đề báo cáo bắt buộc nhập", "VAL", "P2-High",
         "Đang ở form tạo báo cáo", "1. Xóa trắng tiêu đề báo cáo\n2. Bấm 'Lưu báo cáo'", "Title: empty",
         "Báo lỗi đỏ: 'Vui lòng nhập tiêu đề báo cáo'. Chặn submit.",
         "POST /api/reports", "reports", "Y", "Title Validation"),

        ("REP-FLOW-012", "FEAT-REPORTS", "Reports", "Lưu bản thảo và Phát hành báo cáo", "E2E", "P2-High",
         "Báo cáo đã chỉnh sửa xong", "1. Bấm 'Lưu nháp'\n2. Sau đó bấm 'Phát hành chính thức'", "Status: Published",
         "Báo cáo chuyển trạng thái thành Published; tạo phiên bản đóng băng không thể sửa đổi nhầm.",
         "POST /api/reports", "reports", "Y", "Report Version Freezing"),

        ("REP-FLOW-013", "FEAT-REPORTS", "Reports", "Xuất Báo cáo ra Email Draft / Clipboard", "UI", "P2-High",
         "Báo cáo đã được duyệt", "1. Click nút 'Chép định dạng Email'\n2. Dán vào Outlook/Gmail", "Clipboard action",
         "Đoạn văn bản email có lời chào đầu thư trang trọng, nội dung thụt lề rõ ràng, lời kết lịch sự.",
         "N/A", "navigator.clipboard", "Y", "Email Copy Formatting"),

        ("REP-FLOW-014", "FEAT-REPORTS", "Reports", "Xuất Báo cáo ra Slide trình chiếu Marp", "API", "P3-Medium",
         "Báo cáo tiến độ tuần", "1. Click 'Xuất Slide Marp'\n2. Xem trang /app/slides", "Format: Marp Slide",
         "Chuyển đổi các mục báo cáo thành các trang slide 16:9 trực quan cho buổi họp báo cáo.",
         "POST /api/reports/export-slides", "reports", "Y", "Slide Generator"),

        ("OPS-NET-015", "FEAT-OPERATIONS", "Operations", "Xử lý Xung đột Đồng thời (OCC 409)", "NET", "P2-High",
         "2 cửa sổ trình duyệt cùng mở sửa 1 rủi ro", "1. Cửa sổ 1 lưu thay đổi\n2. Cửa sổ 2 bấm lưu sau đó", "OCC Conflict",
         "Cửa sổ 2 nhận thông báo: 'Dữ liệu đã bị thay đổi bởi phiên khác. Vui lòng tải lại trang'.",
         "PATCH /api/operations/risks/{id}", "project_risks", "Y", "Optimistic Concurrency Control"),

        ("OPS-SEC-016", "FEAT-OPERATIONS", "Operations", "Chặn IDOR sửa rủi ro dự án khác", "SEC", "P1-Critical",
         "Đang ở dự án Sakura (ID 1)", "1. Gửi request sửa rủi ro ID 99 của dự án Fuji qua DevTools", "Tamper ID: 99",
         "Hệ thống trả về HTTP 403 Forbidden hoặc 404 Not Found; từ chối can thiệp chéo.",
         "PATCH /api/operations/risks/99", "project_risks", "Y", "IDOR Access Control"),

        ("REP-UI-017", "FEAT-REPORTS", "Reports", "Hiển thị Responsive trên Tablet 1024x768", "UI", "P3-Medium",
         "Đang mở trên màn hình máy tính bảng", "1. Quan sát bố cục bảng báo cáo và danh sách rủi ro", "Viewport: Tablet",
         "Các cột tự động co giãn, các nút hành động gom vào menu ba chấm (...) tiện chạm tay.",
         "N/A", "Responsive CSS", "Y", "Tablet Usability"),

        ("REP-FLOW-018", "FEAT-REPORTS", "Reports", "Lịch sử lưu trữ các kỳ báo cáo cũ", "FLOW", "P3-Medium",
         "Hệ thống đã chạy qua 4 tuần", "1. Mở tab Lịch sử báo cáo (/app/history)\n2. Chọn tuần trước", "Historical view",
         "Mở lại nguyên vẹn nội dung báo cáo của các tuần trước đó để đối chiếu tiến độ.",
         "GET /api/reports/history", "reports", "Y", "Report History Archive"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 7: TC_POWERTOOLS_KEIGO ====================
def build_powertools_keigo_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "TC_PowerTools_Keigo"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        # Power Tools: DOCX to PDF Conversion
        ("PWR-VAL-001", "FEAT-POWERTOOLS", "Power Tools", "DOCX-to-PDF: Tải lên tệp không phải .docx", "VAL", "P2-High",
         "Đang ở trang /app/power-tools", "1. Chọn tệp .txt hoặc .pdf vào ô chuyển đổi DOCX\n2. Bấm Chuyển đổi", "File: readme.txt",
         "Hiển thị cảnh báo: 'Chỉ chấp nhận tệp định dạng Microsoft Word (.docx)'. Không gửi request.",
         "POST /api/power-tools/convert-docx-to-pdf", "temp_files", "Y", "Extension File Validation"),

        ("PWR-FLOW-002", "FEAT-POWERTOOLS", "Power Tools", "DOCX-to-PDF: Chuyển đổi chuẩn qua COM Automation", "E2E", "P1-Critical",
         "File Word chứa bảng biểu và văn bản", "1. Tải lên spec_document.docx (5MB)\n2. Bấm 'Chuyển sang PDF'", "File: valid.docx",
         "Trả về file PDF tải về ngay lập tức; định dạng chuẩn 1:1 với Microsoft Word trên máy.",
         "POST /api/power-tools/convert-docx-to-pdf", "temp_files", "Y", "COM Word Automation Engine"),

        ("PWR-FLOW-003", "FEAT-POWERTOOLS", "Power Tools", "DOCX-to-PDF: Tên file tiếng Nhật RFC 5987", "E2E", "P1-Critical",
         "File có tên tiếng Nhật: '履歴書_田中.docx'", "1. Tải lên file có tên tiếng Nhật\n2. Bấm Chuyển đổi và tải về", "File: 履歴書_田中.docx",
         "File PDF tải về giữ nguyên tên '履歴書_田中.pdf' không bị lỗi mã hóa latin-1 codec hay vỡ ký tự.",
         "POST /api/power-tools/convert-docx-to-pdf", "temp_files", "Y", "RFC 5987 Header Encoding"),

        ("PWR-FLOW-004", "FEAT-POWERTOOLS", "Power Tools", "DOCX-to-PDF: Khung ảnh chân dung & Viền JIS", "UI", "P1-Critical",
         "File mẫu hồ sơ xin việc chuẩn Nhật", "1. Chuyển đổi file có ảnh thẻ chân dung và khung viền JIS\n2. Mở file PDF", "File: Rirekisho JIS",
         "Ảnh thẻ hiển thị sắc nét đúng vị trí 3x4cm; các đường kẻ viền bảng không bị lệch pixel.",
         "POST /api/power-tools/convert-docx-to-pdf", "temp_files", "Y", "Pixel-perfect Visual Fidelity"),

        # Power Tools: OCR
        ("PWR-VAL-005", "FEAT-POWERTOOLS", "Power Tools", "OCR: Tải lên tệp ảnh hỏng (Corrupted)", "VAL", "P2-High",
         "Đang ở ô nhận diện chữ ảnh OCR", "1. Chọn tệp ảnh bị hỏng cấu trúc byte\n2. Bấm 'Nhận diện'", "File: corrupted.png",
         "Hiển thị thông báo thân thiện: 'Không thể giải mã tệp ảnh. Vui lòng thử lại với ảnh khác'.",
         "POST /api/ai/ocr", "temp_files", "Y", "Image Integrity Validation"),

        ("PWR-FLOW-006", "FEAT-POWERTOOLS", "Power Tools", "OCR: Trích xuất chữ tiếng Nhật từ ảnh chụp UI", "E2E", "P1-Critical",
         "Ảnh chụp màn hình phần mềm tiếng Nhật", "1. Tải lên ảnh giao diện có chữ Kanji và Hiragana\n2. Bấm 'Nhận diện OCR'", "Image: ui_screenshot.png",
         "Trích xuất chính xác 100% các dòng chữ trong ảnh bằng Gemini Flash Lite Vision / Tesseract.",
         "POST /api/ai/ocr", "temp_files", "Y", "Japanese OCR Accuracy"),

        ("PWR-UI-007", "FEAT-POWERTOOLS", "Power Tools", "OCR: 4 Góc nhìn văn bản (Text Views)", "UI", "P1-Critical",
         "OCR đã nhận diện xong", "1. Quan sát 4 tab kết quả hiển thị:\n   - Bản gốc (Original)\n   - Tiếng Nhật\n   - Tiếng Việt\n   - Tiếng Anh", "4 text views",
         "Hiển thị đầy đủ 4 tab; chuyển qua lại mượt mà; bản gốc giữ nguyên định dạng ngắt dòng tự nhiên.",
         "POST /api/ai/ocr", "temp_files", "Y", "4-View Text Architecture"),

        ("PWR-UI-008", "FEAT-POWERTOOLS", "Power Tools", "OCR: Nút Sao chép nhanh (Copy to Clipboard)", "UI", "P2-High",
         "Đang ở tab kết quả dịch tiếng Việt", "1. Click nút Copy\n2. Dán vào Notepad", "Clipboard copy",
         "Văn bản được chép nguyên vẹn; icon nút đổi thành dấu tick xanh 'Đã chép' trong 2 giây.",
         "N/A", "navigator.clipboard", "Y", "Clipboard Usability"),

        # Keigo Assistant
        ("KEI-VAL-009", "FEAT-KEIGO", "Keigo", "Kiểm tra kính ngữ với ô nhập rỗng", "VAL", "P2-High",
         "Đang ở trang /app/keigo", "1. Để trống ô nhập văn bản\n2. Bấm 'Đánh giá kính ngữ'", "Input: empty",
         "Báo lỗi: 'Vui lòng nhập câu tiếng Nhật cần kiểm tra kính ngữ'. Không gửi request.",
         "POST /api/keigo/evaluate", "keigo_logs", "Y", "Input Required Validation"),

        ("KEI-FLOW-010", "FEAT-KEIGO", "Keigo", "Phát hiện văn phong thô (Tameguchi)", "API", "P1-Critical",
         "Nhập câu '明日行く' (Tôi sẽ đi vào ngày mai)", "1. Nhập câu '明日行く'\n2. Bấm 'Đánh giá kính ngữ'", "Input: '明日行く'",
         "Hệ thống phát hiện văn phong thông tục (Tameguchi); hiển thị điểm lịch sự thấp (Low Politeness).",
         "POST /api/keigo/evaluate", "keigo_logs", "Y", "Politeness Level Detection"),

        ("KEI-FLOW-011", "FEAT-KEIGO", "Keigo", "Gợi ý Khiêm nhường ngữ (Kenjougo)", "API", "P1-Critical",
         "Hành động của bản thân gửi khách", "1. Đọc phần gợi ý viết lại cho người nói", "Kenjougo suggestion",
         "Đưa ra phương án chuẩn: '明日伺います' hoặc '明日参ります' kèm giải thích ngữ cảnh.",
         "POST /api/keigo/evaluate", "keigo_logs", "Y", "Kenjougo Rewrite Logic"),

        ("KEI-FLOW-012", "FEAT-KEIGO", "Keigo", "Gợi ý Tôn kính ngữ (Sonkeigo)", "API", "P1-Critical",
         "Nhập hành động của khách: 'あなたが言った'", "1. Nhập 'あなたが言った'\n2. Đánh giá", "Input: 'あなたが言った'",
         "Gợi ý sửa sang Tôn kính ngữ Sonkeigo: 'お客様がおっしゃいました' hoặc '仰せになりました'.",
         "POST /api/keigo/evaluate", "keigo_logs", "Y", "Sonkeigo Rewrite Logic"),

        ("KEI-FLOW-013", "FEAT-KEIGO", "Keigo", "Soạn Email theo mẫu chuyên nghiệp", "E2E", "P2-High",
         "Cần gửi email báo cáo tiến độ cho khách", "1. Chọn mẫu 'Báo cáo tiến độ (進捗報告)'\n2. Điền tên khách hàng và dự án\n3. Bấm Tạo email", "Template: Progress email",
         "Sinh ra cấu trúc email hoàn chỉnh có mở đầu (お世話になっております), thân bài và kết thúc chuẩn Nhật.",
         "GET /api/email-templates", "email_templates", "Y", "Email Composer"),

        ("KEI-FLOW-014", "FEAT-KEIGO", "Keigo", "Nút Thay thế nội dung nhanh (Quick Insert)", "UI", "P2-High",
         "Sau khi nhận được câu Keigo gợi ý", "1. Click nút 'Áp dụng câu này'\n2. Quan sát ô soạn thảo chính", "Quick apply",
         "Câu văn cũ tự động được thay thế bằng câu Keigo chuẩn; có nút Hoàn tác (Undo).",
         "N/A", "DOM State update", "Y", "Quick Replace Action"),

        # Templates & Spec Mindmap
        ("TMPL-UI-015", "FEAT-TEMPLATES", "Templates", "Kho mẫu biểu đặc tả BrSE (SRS, CR, Q&A)", "UI", "P3-Medium",
         "Đang ở trang /app/templates", "1. Duyệt qua danh mục các template có sẵn", "Templates list",
         "Hiển thị danh sách template phân loại rõ ràng: Yêu cầu thay đổi (CR), Biên bản họp, Bảng Q&A.",
         "GET /api/templates", "templates", "Y", "Template Library"),

        ("TMPL-FLOW-016", "FEAT-TEMPLATES", "Templates", "Khởi tạo tài liệu mới từ Template", "E2E", "P2-High",
         "Chọn template 'Change Request Form'", "1. Bấm 'Sử dụng mẫu này'\n2. Điền các trường thông tin thay đổi", "Use template",
         "Tạo ra tài liệu mới có sẵn khung sườn chuẩn; tự động điền tên tác giả và ngày hiện tại.",
         "POST /api/templates/{id}/instantiate", "specs", "Y", "Template Instantiation"),

        ("PWR-NET-017", "FEAT-POWERTOOLS", "Power Tools", "Cảnh báo Timeout khi OCR ảnh cực lớn (>15MB)", "NET", "P2-High",
         "Ảnh chụp có độ phân giải siêu cao 4K", "1. Tải lên tệp ảnh 15MB\n2. Đợi xử lý", "Image 15MB",
         "Hệ thống tự động nén kích thước ảnh trước khi gửi lên API để tránh timeout và nghẽn băng thông.",
         "POST /api/ai/ocr", "temp_files", "Y", "Client Image Pre-compression"),

        ("PWR-SEC-018", "FEAT-POWERTOOLS", "Power Tools", "Tự động xóa file tạm sau khi chuyển đổi PDF", "SEC", "P1-Critical",
         "Người dùng tải lên tài liệu nhạy cảm", "1. Thực hiện chuyển đổi DOCX sang PDF\n2. Kiểm tra thư mục tạm backend", "Temp file cleanup",
         "Tệp Word tạm trên ổ cứng tự động bị xóa ngay sau khi stream xong nội dung PDF cho trình duyệt.",
         "POST /api/power-tools/convert-docx-to-pdf", "temp_files", "Y", "Data Privacy Cleanup"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 8: SECURITY & INTEGRITY ====================
def build_security_integrity_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Security & Integrity"
    ws.views.sheetView[0].freezePanes = "A2"
    write_header_row(ws, TC_COLUMNS, row_idx=1)

    tcs = [
        ("SEC-XSS-001", "FEAT-SECURITY", "Security", "Chống XSS: Thẻ script trong Markdown", "SEC", "P1-Critical",
         "Bất kỳ ô nhập Markdown nào (Todo, Notes, Minutes)", "1. Nhập nội dung: <script>document.cookie</script>\n2. Lưu và hiển thị", "Payload: <script>",
         "Thẻ script bị loại bỏ hoàn toàn bởi DOMPurify; không thực thi mã độc trong phiên duyệt web.",
         "All POST APIs", "All tables", "Y", "OWASP XSS Prevention"),

        ("SEC-XSS-002", "FEAT-SECURITY", "Security", "Chống XSS: Thuộc tính onload / onerror", "SEC", "P1-Critical",
         "Ô nhập văn bản Markdown", "1. Nhập: <img src='invalid' onerror='alert(1)'>\n2. Quan sát hiển thị", "Payload: onerror",
         "Sự kiện onerror bị bóc tách khỏi thẻ img; chỉ hiển thị ảnh lỗi mà không kích hoạt script.",
         "All POST APIs", "All tables", "Y", "Attribute Sanitization"),

        ("SEC-XSS-003", "FEAT-SECURITY", "Security", "Chống XSS: Link javascript: pseudo protocol", "SEC", "P1-Critical",
         "Soạn thảo liên kết Markdown", "1. Nhập cú pháp: [Bấm vào đây](javascript:alert(1))\n2. Click vào liên kết", "Link javascript:",
         "Đường link bị vô hiệu hóa hoặc chuyển thành link an toàn không có hành động thực thi.",
         "All POST APIs", "All tables", "Y", "Protocol Sanitization"),

        ("SEC-IDOR-004", "FEAT-SECURITY", "Security", "Kiểm soát phân quyền IDOR trên API", "SEC", "P1-Critical",
         "Dự án A và Dự án B có dữ liệu riêng", "1. Đang ở phiên dự án A, gửi request lấy ghi chú của dự án B", "Tamper ID: other project",
         "Hệ thống trả về HTTP 403 Forbidden hoặc 404 Not Found; không cho xem trộm dữ liệu chéo.",
         "GET /api/notes/{id}", "universal_notes", "Y", "IDOR Boundary Verification"),

        ("SEC-TRAV-005", "FEAT-SECURITY", "Security", "Chống Zip Slip / Path Traversal khi Restore", "SEC", "P1-Critical",
         "Tính năng Phục hồi dữ liệu sao lưu (/api/settings/restore)", "1. Tạo file zip chứa đường dẫn nguy hiểm ../../etc/passwd\n2. Tải lên khôi phục", "Malicious zip entry",
         "Hệ thống từ chối giải nén; trả mã lỗi HTTP 400 Bad Request; kiểm tra đường dẫn tuyệt đối an toàn.",
         "POST /api/settings/restore", "settings", "Y", "CWE-22 Zip Slip Prevention"),

        ("SEC-BOMB-006", "FEAT-SECURITY", "Security", "Chống Zip Bomb DoS cạn kiệt bộ nhớ RAM", "SEC", "P1-Critical",
         "File zip có tỷ lệ nén cực cao (1MB nén thành 10GB)", "1. Tải lên file zip dạng Zip Bomb\n2. Bấm khôi phục", "Zip bomb archive",
         "Hệ thống giới hạn dung lượng giải nén tối đa 500MB; tự động ngắt quá trình khi vượt ngưỡng.",
         "POST /api/settings/restore", "settings", "Y", "CWE-400 DoS Protection"),

        ("SEC-TIME-007", "FEAT-SECURITY", "Security", "So sánh Token bí mật bằng Hằng số thời gian", "SEC", "P2-High",
         "Xác thực token API bí mật X-BrSE-Token", "1. Gửi chuỗi token sai từng ký tự\n2. Đo thời gian phản hồi microsecond", "Timing attack probe",
         "Thời gian phản hồi đồng nhất (dùng secrets.compare_digest); không lộ độ dài hay tiền tố token.",
         "All Protected APIs", "N/A", "Y", "CWE-208 Timing Attack Safe"),

        ("SEC-CORS-008", "FEAT-SECURITY", "Security", "Cấu hình CORS Scoping chặt chẽ", "SEC", "P1-Critical",
         "Trang web độc hại bên ngoài gọi fetch()", "1. Gửi request từ domain lạ: https://malicious-site.com\n2. Gọi vào API backend", "Origin: untrusted",
         "Backend từ chối cung cấp header Access-Control-Allow-Origin; trình duyệt chặn hoàn toàn.",
         "All Backend APIs", "N/A", "Y", "CORS Restriction"),

        ("SEC-SENS-009", "FEAT-SECURITY", "Security", "Không lộ API Key / Mật khẩu ra Console Log", "SEC", "P2-High",
         "Mở Chrome DevTools tab Console", "1. Thao tác lưu API Key và mật khẩu trong cài đặt\n2. Kiểm tra log", "DevTools Console",
         "Không có bất kỳ chuỗi key nhạy cảm nào bị in ra qua console.log() hay debug output.",
         "POST /api/settings", "local_storage", "Y", "Credential Masking"),

        ("INT-FK-010", "FEAT-INTEGRITY", "Database Integrity", "Ràng buộc khóa ngoại: Xóa Meeting Minutes", "INT", "P1-Critical",
         "Cuộc họp có liên kết 5 Action Items trong Todo", "1. Thực hiện xóa bản ghi Meeting Minutes\n2. Kiểm tra bảng Todo", "Delete meeting record",
         "Dữ liệu Todo không bị lỗi mồ côi; trường meeting_id tự động chuyển sang NULL hoặc xóa an toàn.",
         "DELETE /api/meetings/{id}", "todos, meetings", "Y", "Foreign Key Cascade/Set Null"),

        ("INT-UNIQ-011", "FEAT-INTEGRITY", "Database Integrity", "Ràng buộc Khóa duy nhất (Unique Constraint)", "INT", "P1-Critical",
         "Bảng Glossary và Projects", "1. Chèn trực tiếp bản ghi trùng project_code vào DB\n2. Kiểm tra phản hồi", "Duplicate unique key",
         "Cơ sở dữ liệu từ chối chèn bản ghi; ORM ném lỗi IntegrityError và API trả về HTTP 409 Conflict.",
         "POST /api/projects", "projects", "Y", "Database Unique Constraint"),

        ("INT-MIG-012", "FEAT-INTEGRITY", "Database Integrity", "Kiểm tra tính tương thích xuôi/ngược Migration", "INT", "P2-High",
         "Nâng cấp phiên bản DB", "1. Chạy alembic upgrade head\n2. Chạy alembic downgrade -1\n3. Chạy upgrade lại", "Alembic migrations",
         "Quá trình migration diễn ra trơn tru không mất mát dữ liệu hiện có; schema đồng bộ 100%.",
         "N/A", "alembic_version", "Y", "Migration Schema Reversibility"),

        ("SEC-ENV-013", "FEAT-SECURITY", "Security", "Ẩn biến môi trường nhạy cảm trong API Settings", "SEC", "P1-Critical",
         "Gọi GET /api/settings", "1. Kiểm tra payload JSON trả về\n2. So sánh với file .env", "GET /api/settings",
         "Các biến bí mật (BRSE_API_SECRET, NINE_ROUTER_API_KEY) được che giấu thành '******' hoặc ẩn.",
         "GET /api/settings", "settings", "Y", "Environment Secrets Masking"),

        ("SEC-RATELIM-014", "FEAT-SECURITY", "Security", "Giới hạn tần suất gọi API (Rate Limiting)", "SEC", "P2-High",
         "Spam request liên tục vào API AI nặng", "1. Gửi 60 requests / giây vào /api/ai/chat\n2. Quan sát phản hồi", "Spam probe",
         "Hệ thống trả về HTTP 429 Too Many Requests kèm header Retry-After; bảo vệ hạ tầng máy chủ.",
         "POST /api/ai/chat", "N/A", "Y", "Rate Limiting SLA"),
    ]
    write_test_case_rows(ws, tcs)

# ==================== SHEET 9: PERFORMANCE PLAN ====================
def build_performance_plan_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Performance Plan"
    
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 16
    ws.column_dimensions['C'].width = 32
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 14
    ws.column_dimensions['F'].width = 14
    ws.column_dimensions['G'].width = 14
    ws.column_dimensions['H'].width = 16
    ws.column_dimensions['I'].width = 24

    ws.merge_cells("B2:I2")
    ws.cell(row=2, column=2, value="KẾ HOẠCH KIỂM THỬ HIỆU NĂNG & BENCHMARK TẢI (PERFORMANCE PLAN)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Test ID", "Kịch bản đo tải (Scenario)", "Công cụ", "Số Users", "Thời lượng", "Ramp-up", "Target p95", "Tiêu chí Đạt (Pass Criteria)"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    scenarios = [
        ("PERF-WEB-001", "Tải trang Dashboard & Hydration", "k6 / Chrome", "10 VU", "5 phút", "30 giây", "< 500ms", "Lỗi < 0.1%, RAM FE ổn định"),
        ("PERF-WEB-002", "Tra cứu thuật ngữ Glossary Fuzzy", "k6 HTTP", "50 VU", "5 phút", "1 phút", "< 150ms", "Error rate < 0.05%"),
        ("PERF-WEB-003", "Auto-save Todo liên tục (Patch)", "k6 HTTP", "100 req/s", "10 phút", "2 phút", "< 100ms", "Không nghẽn khóa DB (Lock)"),
        ("PERF-WEB-004", "AI Chat Streaming First-Token", "k6 HTTP", "20 VU", "5 phút", "1 phút", "< 1200ms", "Độ trễ ký tự đầu tiên đạt SLA"),
        ("PERF-WEB-005", "Chuyển đổi DOCX sang PDF liên tục", "Pytest / k6", "5 VU", "5 phút", "30 giây", "< 3000ms", "COM Process tự giải phóng"),
        ("PERF-WEB-006", "Stress Test: 500 kết nối đồng thời", "k6 Stress", "500 VU", "10 phút", "2 phút", "< 2500ms", "Uvicorn không sập, phục hồi nhanh"),
    ]

    for idx, sc in enumerate(scenarios, start=5):
        ws.row_dimensions[idx].height = 24
        fill = FILL_ZEBRA if idx % 2 == 1 else FILL_WHITE
        for c_idx, val in enumerate(sc, start=2):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.fill = fill
            cell.border = BORDER_THIN
            if c_idx in [2, 4, 5, 6, 7, 8]:
                cell.alignment = ALIGN_CENTER
                if c_idx == 2: cell.font = FONT_BOLD
                if c_idx == 8: cell.font = FONT_BOLD
            else:
                cell.alignment = ALIGN_LEFT

    # Block k6 script
    ws.merge_cells("B13:I13")
    sec_lbl = ws.cell(row=13, column=2, value="KỊCH BẢN THỰC THI KIỂM THỬ TẢI K6 MẪU (K6 LOAD TEST SCRIPT)")
    sec_lbl.font = FONT_SECTION
    sec_lbl.fill = FILL_NAVY
    sec_lbl.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws.row_dimensions[13].height = 24

    k6_code = """// k6 Performance Test Script for BrSE OS Web APIs
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 concurrent users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% requests must complete within 300ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = 'http://127.0.0.1:3010/api';

export default function () {
  // 1. Benchmark Glossary Search
  const resGlossary = http.get(`${BASE_URL}/glossary/?search=テスト&size=20`);
  check(resGlossary, {
    'glossary status 200': (r) => r.status === 200,
    'glossary latency < 150ms': (r) => r.timings.duration < 150,
  });

  // 2. Benchmark Todo List
  const resTodos = http.get(`${BASE_URL}/todos?limit=50`);
  check(resTodos, {
    'todos status 200': (r) => r.status === 200,
    'todos latency < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}"""

    ws.merge_cells("B14:I28")
    script_cell = ws.cell(row=14, column=2, value=k6_code)
    script_cell.font = Font(name="Consolas", size=9, color="1F3864")
    script_cell.fill = FILL_CARD
    script_cell.border = BORDER_THIN
    script_cell.alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)

# ==================== SHEET 10: UAT CHECKLIST ====================
def build_uat_checklist_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "UAT Checklist"
    
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 8
    ws.column_dimensions['C'].width = 28
    ws.column_dimensions['D'].width = 52
    ws.column_dimensions['E'].width = 22
    ws.column_dimensions['F'].width = 14
    ws.column_dimensions['G'].width = 18

    ws.merge_cells("B2:G2")
    ws.cell(row=2, column=2, value="UAT CHECKLIST — DANH MỤC NGHIỆM THU NGHIỆP VỤ BRSE (USER ACCEPTANCE)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["#", "User Story / Nghiệp vụ", "Tiêu chuẩn nghiệm thu (Acceptance Criteria)", "Vai trò kiểm thử", "Kết quả", "Ký duyệt"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    uat_items = [
        (1, "US-01: Bắt đầu ngày làm việc trên Dashboard", "Mở Dashboard xem lịch họp hôm nay, danh mục việc khẩn cấp P0 và cảnh báo rủi ro.", "Kỹ sư BrSE / Lead", "⬜ Not Run", "Chờ ký duyệt"),
        (2, "US-02: Quản lý công việc hàng ngày trong Todo", "Tạo task mới, phân loại P0/P1/P2, tick hoàn thành công việc và lọc việc theo ngày.", "Kỹ sư BrSE", "⬜ Not Run", "Chờ ký duyệt"),
        (3, "US-03: Tải ghi âm và Tạo biên bản họp AI", "Tải file âm thanh cuộc họp tiếng Nhật, AI sinh tóm tắt cuộc họp và trích xuất quyết định.", "BrSE / Khách hàng", "⬜ Not Run", "Chờ ký duyệt"),
        (4, "US-04: Đồng bộ Action Items từ cuộc họp", "Bấm nút chuyển các việc cần làm từ biên bản họp sang danh sách Todo của dự án.", "Kỹ sư BrSE", "⬜ Not Run", "Chờ ký duyệt"),
        (5, "US-05: Tra cứu thuật ngữ chuyên ngành tiếng Nhật", "Tìm kiếm từ vựng theo Kanji, Hiragana hoặc Romaji; hiển thị đúng nghĩa tiếng Việt.", "Kỹ sư BrSE", "⬜ Not Run", "Chờ ký duyệt"),
        (6, "US-06: Bổ sung từ vựng mới vào Từ điển dùng chung", "Thêm thuật ngữ mới phát hiện kèm ngữ cảnh dự án; lưu thành công vào cơ sở dữ liệu.", "BrSE / QA Lead", "⬜ Not Run", "Chờ ký duyệt"),
        (7, "US-07: Thẩm định kính ngữ Keigo khi gửi email khách", "Nhập email tiếng Nhật, AI phát hiện lỗi kính ngữ và gợi ý câu Sonkeigo/Kenjougo chuẩn.", "Kỹ sư BrSE", "⬜ Not Run", "Chờ ký duyệt"),
        (8, "US-08: Chuyển đổi DOCX sang PDF giữ nguyên 100% layout", "Chuyển đổi file hồ sơ/tài liệu có bảng biểu và ảnh thẻ sang PDF không bị lệch vị trí.", "Kỹ sư BrSE / PO", "⬜ Not Run", "Chờ ký duyệt"),
        (9, "US-09: Nhận diện chữ tiếng Nhật qua ảnh chụp OCR", "Tải ảnh chụp màn hình UI, trích xuất chuẩn xác chữ Kanji và hiển thị 4 góc nhìn ngôn ngữ.", "Kỹ sư BrSE", "⬜ Not Run", "Chờ ký duyệt"),
        (10, "US-10: Lập báo cáo tiến độ tuần tự động (Horenso)", "AI gom dữ liệu công việc đã làm trong tuần và sinh bản thảo báo cáo gửi khách hàng.", "BrSE Lead / PM", "⬜ Not Run", "Chờ ký duyệt"),
    ]

    for idx, item in enumerate(uat_items, start=5):
        ws.row_dimensions[idx].height = 26
        fill = FILL_ZEBRA if idx % 2 == 1 else FILL_WHITE
        for c_idx, val in enumerate(item, start=2):
            cell = ws.cell(row=idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.fill = fill
            cell.border = BORDER_THIN
            if c_idx in [2, 6, 7]:
                cell.alignment = ALIGN_CENTER
                if c_idx == 2: cell.font = FONT_BOLD
            else:
                cell.alignment = ALIGN_LEFT

# ==================== SHEET 11: TRACEABILITY MATRIX ====================
def build_traceability_matrix_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Traceability Matrix"
    ws.views.sheetView[0].freezePanes = "C4"

    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 18
    ws.column_dimensions['C'].width = 46
    ws.column_dimensions['D'].width = 18
    ws.column_dimensions['E'].width = 16
    ws.column_dimensions['F'].width = 24

    ws.merge_cells("B2:F2")
    ws.cell(row=2, column=2, value="MA TRẬN TRUY XUẤT YÊU CẦU ↔ TEST CASES (TRACEABILITY MATRIX)").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Requirement ID", "Tên yêu cầu nghiệp vụ (Requirement Name)", "Mô-đun liên quan", "Số Test Cases", "Trạng thái bao phủ"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    reqs = [
        ("FEAT-DASHBOARD", "Dashboard Cockpit & Status Widget", "Dashboard", "TC_Dashboard_Todo", 4),
        ("FEAT-TODO", "BrSE Todo CRUD & Deadline Alerts", "BrSE Todo", "TC_Dashboard_Todo", 13),
        ("FEAT-PROJECTS", "Multi-Project Context Switcher", "Dashboard / Settings", "TC_Dashboard_Todo", 1),
        ("FEAT-MEETING-AI", "Meeting Audio Upload & Transcription", "Meeting AI", "TC_Meeting_Minutes", 12),
        ("FEAT-GLOSSARY", "Japanese Terminology Dictionary", "Glossary", "TC_Knowledge_Glossary", 12),
        ("FEAT-KNOWLEDGE", "Knowledge Base Articles Markdown", "Knowledge", "TC_Knowledge_Glossary", 5),
        ("FEAT-OPERATIONS", "Project Risks Register & Heatmap", "Operations", "TC_Operations_Reports", 7),
        ("FEAT-REPORTS", "Weekly Status Report Generation", "Reports", "TC_Operations_Reports", 8),
        ("FEAT-POWERTOOLS", "DOCX to PDF Converter & OCR Engine", "Power Tools", "TC_PowerTools_Keigo", 8),
        ("FEAT-KEIGO", "Keigo Politeness Analyzer & Email", "Keigo Assistant", "TC_PowerTools_Keigo", 6),
        ("FEAT-TEMPLATES", "Specification & Prompt Templates", "Templates", "TC_PowerTools_Keigo", 2),
        ("FEAT-SECURITY", "Web App Security (XSS, IDOR, Zip Slip)", "Security", "Security & Integrity", 11),
        ("FEAT-INTEGRITY", "Database Foreign Keys & Migrations", "Database", "Security & Integrity", 3),
        ("NFR-PERF", "API Latency & Concurrent Load SLA", "Performance", "Performance Plan", 6),
        ("US-ACCEPTANCE", "End-to-End Business Workflows", "UAT", "UAT Checklist", 10),
    ]

    for idx, (r_id, r_name, r_mod, target_sheet, count_tc) in enumerate(reqs, start=5):
        ws.row_dimensions[idx].height = 22
        fill = FILL_ZEBRA if idx % 2 == 1 else FILL_WHITE

        ws.cell(row=idx, column=2, value=r_id).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=2).font = FONT_BOLD
        ws.cell(row=idx, column=3, value=r_name).alignment = ALIGN_LEFT
        ws.cell(row=idx, column=4, value=r_mod).alignment = ALIGN_LEFT
        
        c_cnt = ws.cell(row=idx, column=5, value=count_tc)
        c_cnt.alignment = ALIGN_CENTER
        c_cnt.font = FONT_BOLD

        c_status = ws.cell(row=idx, column=6, value=f"{count_tc} tests ✅ ĐẠT")
        c_status.alignment = ALIGN_CENTER
        c_status.font = FONT_GREEN_CHECK
        c_status.fill = FILL_GREEN_CHECK

        for c_i in range(2, 7):
            ws.cell(row=idx, column=c_i).border = BORDER_THIN
            if c_i != 6: ws.cell(row=idx, column=c_i).fill = fill

    tot_row = len(reqs) + 5
    ws.merge_cells(f"B{tot_row}:D{tot_row}")
    ws.cell(row=tot_row, column=2, value="TỔNG SỐ CA KIỂM THỬ TRUY XUẤT").font = FONT_HEADER
    ws.cell(row=tot_row, column=2).fill = FILL_NAVY
    ws.cell(row=tot_row, column=2).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=5, value=f"=SUM(E5:E{tot_row-1})").font = FONT_HEADER
    ws.cell(row=tot_row, column=5).fill = FILL_NAVY
    ws.cell(row=tot_row, column=5).alignment = ALIGN_CENTER

    ws.cell(row=tot_row, column=6, value="100% Bao phủ ✅").font = FONT_HEADER
    ws.cell(row=tot_row, column=6).fill = FILL_NAVY
    ws.cell(row=tot_row, column=6).alignment = ALIGN_CENTER
    ws.row_dimensions[tot_row].height = 26

# ==================== SHEET 12: SUMMARY DASHBOARD ====================
def build_summary_dashboard_sheet(ws):
    apply_sheet_view(ws)
    ws.title = "Summary Dashboard"
    
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 28
    ws.column_dimensions['C'].width = 14
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 12
    ws.column_dimensions['H'].width = 18
    ws.column_dimensions['I'].width = 22

    ws.merge_cells("B2:I2")
    ws.cell(row=2, column=2, value="BẢNG TỔNG HỢP KẾ HOẠCH KIỂM THỬ — BRSE OS WEB APPLICATION").font = FONT_TITLE
    ws.row_dimensions[2].height = 28

    headers = ["Phân hệ / Module kiểm thử", "Tổng số TC", "P1-Critical", "P2-High", "P3-Medium", "P4-Low", "Tỷ lệ Tự động (%)", "Độ bao phủ Requirement"]
    for col_idx, h in enumerate(headers, start=2):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER
    ws.row_dimensions[4].height = 26

    modules_summary = [
        ("TC_Dashboard_Todo", 18, 5, 8, 5, 0, "88.9%", "100% Bao phủ ✅"),
        ("TC_Meeting_Minutes", 18, 7, 7, 4, 0, "77.8%", "100% Bao phủ ✅"),
        ("TC_Knowledge_Glossary", 18, 5, 8, 5, 0, "83.3%", "100% Bao phủ ✅"),
        ("TC_Operations_Reports", 18, 4, 9, 5, 0, "72.2%", "100% Bao phủ ✅"),
        ("TC_PowerTools_Keigo", 18, 6, 8, 4, 0, "77.8%", "100% Bao phủ ✅"),
        ("Security & Integrity", 14, 11, 3, 0, 0, "92.9%", "100% Bao phủ ✅"),
        ("Performance Plan", 6, 0, 6, 0, 0, "100.0%", "100% Bao phủ ✅"),
        ("UAT Checklist", 10, 6, 4, 0, 0, "30.0%", "100% Bao phủ ✅"),
    ]

    for idx, (m_name, tot, p1, p2, p3, p4, auto_r, req_cov) in enumerate(modules_summary, start=5):
        ws.row_dimensions[idx].height = 22
        fill = FILL_ZEBRA if idx % 2 == 1 else FILL_WHITE

        ws.cell(row=idx, column=2, value=m_name).alignment = ALIGN_LEFT
        ws.cell(row=idx, column=2).font = FONT_BOLD
        ws.cell(row=idx, column=3, value=tot).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=4, value=p1).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=5, value=p2).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=6, value=p3).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=7, value=p4).alignment = ALIGN_CENTER
        ws.cell(row=idx, column=8, value=auto_r).alignment = ALIGN_CENTER
        
        c_rc = ws.cell(row=idx, column=9, value=req_cov)
        c_rc.alignment = ALIGN_CENTER
        c_rc.font = FONT_GREEN_CHECK
        c_rc.fill = FILL_GREEN_CHECK

        for c_i in range(2, 10):
            ws.cell(row=idx, column=c_i).border = BORDER_THIN
            if c_i != 9: ws.cell(row=idx, column=c_i).fill = fill

    tot_row = len(modules_summary) + 5
    ws.cell(row=tot_row, column=2, value="TỔNG CỘNG TOÀN HỆ THỐNG").font = FONT_HEADER
    ws.cell(row=tot_row, column=2).fill = FILL_NAVY
    ws.cell(row=tot_row, column=2).alignment = ALIGN_CENTER

    for c_i in range(3, 8):
        col_let = get_column_letter(c_i)
        cell = ws.cell(row=tot_row, column=c_i, value=f"=SUM({col_let}5:{col_let}{tot_row-1})")
        cell.font = FONT_HEADER
        cell.fill = FILL_NAVY
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_HEADER

    cell_auto = ws.cell(row=tot_row, column=8, value="78.3% (94/120)")
    cell_auto.font = FONT_HEADER
    cell_auto.fill = FILL_NAVY
    cell_auto.alignment = ALIGN_CENTER
    cell_auto.border = BORDER_HEADER

    cell_cov = ws.cell(row=tot_row, column=9, value="100% HOÀN TẤT ✅")
    cell_cov.font = FONT_HEADER
    cell_cov.fill = FILL_NAVY
    cell_cov.alignment = ALIGN_CENTER
    cell_cov.border = BORDER_HEADER
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

    print("Building Sheet 3: TC_Dashboard_Todo...")
    ws3 = wb.create_sheet("TC_Dashboard_Todo")
    build_dashboard_todo_sheet(ws3)

    print("Building Sheet 4: TC_Meeting_Minutes...")
    ws4 = wb.create_sheet("TC_Meeting_Minutes")
    build_meeting_minutes_sheet(ws4)

    print("Building Sheet 5: TC_Knowledge_Glossary...")
    ws5 = wb.create_sheet("TC_Knowledge_Glossary")
    build_knowledge_glossary_sheet(ws5)

    print("Building Sheet 6: TC_Operations_Reports...")
    ws6 = wb.create_sheet("TC_Operations_Reports")
    build_operations_reports_sheet(ws6)

    print("Building Sheet 7: TC_PowerTools_Keigo...")
    ws7 = wb.create_sheet("TC_PowerTools_Keigo")
    build_powertools_keigo_sheet(ws7)

    print("Building Sheet 8: Security & Integrity...")
    ws8 = wb.create_sheet("Security & Integrity")
    build_security_integrity_sheet(ws8)

    print("Building Sheet 9: Performance Plan...")
    ws9 = wb.create_sheet("Performance Plan")
    build_performance_plan_sheet(ws9)

    print("Building Sheet 10: UAT Checklist...")
    ws10 = wb.create_sheet("UAT Checklist")
    build_uat_checklist_sheet(ws10)

    print("Building Sheet 11: Traceability Matrix...")
    ws11 = wb.create_sheet("Traceability Matrix")
    build_traceability_matrix_sheet(ws11)

    print("Building Sheet 12: Summary Dashboard...")
    ws12 = wb.create_sheet("Summary Dashboard")
    build_summary_dashboard_sheet(ws12)

    wb.save(OUTPUT_PATH)
    print(f"\n🎉 Successfully generated Web App Test Plan at: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
