import re

# 1. SlideStudioHero
p1 = "frontend/app/app/slides/SlideStudioHero.tsx"
with open(p1, "r", encoding="utf-8") as f: c1 = f.read()
c1 = c1.replace('{language === "en" ? "Shortcuts: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`." : language === "ja" ? " ショートカット: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`." : "Phím tắt nhanh: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`."}', '{t("slides.shortcuts")}')
with open(p1, "w", encoding="utf-8") as f: f.write(c1)

# 2. SlideStudioInspector
p2 = "frontend/app/app/slides/SlideStudioInspector.tsx"
with open(p2, "r", encoding="utf-8") as f: c2 = f.read()
c2 = c2.replace('{language === "en" ? "AI assist" : language === "ja" ? "AI支援" : "AI hỗ trợ"}', '{t("slides.aiAssist")}')
c2 = c2.replace('{language === "en" ? "Summarize to" : language === "ja" ? "要約する枚数" : "Rút gọn thành"}', '{t("slides.summarizeTo")}')
c2 = c2.replace('{isAiWorking ? (language === "en" ? "Working..." : language === "ja" ? "処理中..." : "Đang xử lý...") : language === "en" ? "Summarize current markdown" : language === "ja" ? "現在のMarkdownを要約" : "Rút gọn markdown hiện tại"}', 'isAiWorking ? t("slides.working") : t("slides.summarizeMarkdown")')
c2 = c2.replace('{language === "en" ? "Tone" : language === "ja" ? "文体" : "Giọng văn"}', '{t("slides.tone")}')
c2 = c2.replace('{language === "en" ? "Executive / leadership" : language === "ja" ? "経営層向け" : "Cho lãnh đạo"}', '{t("slides.toneExecutive")}')
c2 = c2.replace('{language === "en" ? "Japanese client" : language === "ja" ? "日本のお客様向け" : "Cho khách hàng Nhật"}', '{t("slides.toneJapanese")}')
c2 = c2.replace('{isAiWorking ? (language === "en" ? "Working..." : language === "ja" ? "処理中..." : "Đang xử lý...") : language === "en" ? "Rewrite bullet points" : language === "ja" ? "箇条書きを書き換える" : "Viết lại ý chính"}', 'isAiWorking ? t("slides.working") : t("slides.rewriteBullets")')
c2 = c2.replace('{language === "en" ? "Export" : language === "ja" ? "書き出し" : "Xuất file"}', '{t("slides.export")}')
c2 = c2.replace('{isExportingPptx ? (language === "en" ? "Exporting..." : language === "ja" ? "書き出し中..." : "Đang xuất...") : ui.exportPptx}', 'isExportingPptx ? t("slides.exporting") : ui.exportPptx')
c2 = c2.replace('{language === "en" ? "Deck diagnostics" : language === "ja" ? "デッキ診断" : "Chẩn đoán deck"}', '{t("slides.deckDiagnostics")}')
c2 = c2.replace('{language === "en" ? "No major issue detected in the deck." : language === "ja" ? "大きな問題は見つかっていません。" : "Chưa phát hiện vấn đề lớn trong deck."}', '{t("slides.noMajorIssues")}')
c2 = c2.replace('{language === "en" ? "Status" : language === "ja" ? "ステータス" : "Trạng thái"}', '{t("slides.statusLabel")}')
c2 = c2.replace(': "Workflow: viết bằng Markdown, xem trước với theme, rồi xuất sang PPTX."}', ': t("slides.workflowHint")}')
c2 = c2.replace(': "Phím tắt: Ctrl/Cmd+K mở lệnh nhanh, Ctrl/Cmd+1/2 đổi tab, Alt+↑/↓ đổi vị trí slide."}', ': t("slides.shortcutsHint")}')
c2 = c2.replace('{language === "en" ? "Import markdown from Meeting Minutes" : language === "ja" ? "Meeting Minutes から Markdown を取り込む" : "Lấy markdown từ Meeting Minutes"}', '{t("slides.importFromMinutes")}')
with open(p2, "w", encoding="utf-8") as f: f.write(c2)

# 3. SlideStudioNavigator
p3 = "frontend/app/app/slides/SlideStudioNavigator.tsx"
with open(p3, "r", encoding="utf-8") as f: c3 = f.read()
c3 = c3.replace('{navigatorCollapsed ? (language === "en" ? "Open" : language === "ja" ? "開く" : "Mở") : (language === "en" ? "Collapse" : language === "ja" ? "折りたたむ" : "Thu gọn")}', 'navigatorCollapsed ? t("slides.open") : t("slides.collapse")')
c3 = c3.replace('vi: "Ở chế độ tập trung, cột trái chỉ giữ danh sách slide để bạn nhìn deck và kéo đổi vị trí nhanh hơn."', 'vi: t("slides.navigatorFocusHint")')
c3 = c3.replace('{language === "en" ? "Thumbnail actions" : language === "ja" ? " サムネイル操作" : "Thao tác thumbnail"}', '{t("slides.thumbnailActions")}')
c3 = c3.replace('vi: "Ở chế độ tập trung, phần chèn nhanh nằm ở thanh trên còn thao tác chi tiết của slide nằm trong drawer bên phải. Cột này chỉ giữ duyệt, lọc và sắp xếp."', 'vi: t("slides.navigatorActionsHint")')
with open(p3, "w", encoding="utf-8") as f: f.write(c3)
