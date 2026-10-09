import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = {
    "slides.aiAssist": ("AI hỗ trợ", "AI assist", "AI支援"),
    "slides.summarizeTo": ("Rút gọn thành", "Summarize to", "要約する枚数"),
    "slides.working": ("Đang xử lý...", "Working...", "処理中..."),
    "slides.summarizeMarkdown": ("Rút gọn markdown hiện tại", "Summarize current markdown", "現在のMarkdownを要約"),
    "slides.tone": ("Giọng văn", "Tone", "文体"),
    "slides.toneExecutive": ("Cho lãnh đạo", "Executive / leadership", "経営層向け"),
    "slides.toneJapanese": ("Cho khách hàng Nhật", "Japanese client", "日本のお客様向け"),
    "slides.rewriteBullets": ("Viết lại ý chính", "Rewrite bullet points", "箇条書きを書き換える"),
    "slides.export": ("Xuất file", "Export", "書き出し"),
    "slides.exporting": ("Đang xuất...", "Exporting...", "書き出し中..."),
    "slides.deckDiagnostics": ("Chẩn đoán deck", "Deck diagnostics", "デッキ診断"),
    "slides.noMajorIssues": ("Chưa phát hiện vấn đề lớn trong deck.", "No major issue detected in the deck.", "大きな問題は見つかっていません。"),
    "slides.statusLabel": ("Trạng thái", "Status", "ステータス"),
    "slides.workflowHint": ("Workflow: viết bằng Markdown, xem trước với theme, rồi xuất sang PPTX.", "Workflow: write in Markdown, preview with theme, then export to PPTX.", "Workflow: Markdownで作成し、テーマで確認してからPPTXへ出力します。"),
    "slides.shortcutsHint": ("Phím tắt: Ctrl/Cmd+K mở lệnh nhanh, Ctrl/Cmd+1/2 đổi tab, Alt+↑/↓ đổi vị trí slide.", "Shortcuts: Ctrl/Cmd+K for quick commands, Ctrl/Cmd+1/2 tabs, Alt+↑/↓ reorder slides.", "ショートカット: Ctrl/Cmd+Kでコマンド、Ctrl/Cmd+1/2でタブ、Alt+↑/↓で移動。"),
    "slides.importFromMinutes": ("Lấy markdown từ Meeting Minutes", "Import markdown from Meeting Minutes", "Meeting Minutes から Markdown を取り込む"),
    "slides.open": ("Mở", "Open", "開く"),
    "slides.collapse": ("Thu gọn", "Collapse", "折りたたむ"),
    "slides.thumbnailActions": ("Thao tác thumbnail", "Thumbnail actions", "サムネイル操作"),
    "slides.navigatorFocusHint": ("Ở chế độ tập trung, cột trái chỉ giữ danh sách slide để bạn nhìn deck và kéo đổi vị trí nhanh hơn.", "In focus mode, the left column only keeps the slide list for better visibility and reordering.", "集中モードでは、左カラムはスライド一覧のみを表示し、ドラッグでの並べ替えを容易にします。"),
    "slides.navigatorActionsHint": ("Ở chế độ tập trung, phần chèn nhanh nằm ở thanh trên còn thao tác chi tiết của slide nằm trong drawer bên phải. Cột này chỉ giữ duyệt, lọc và sắp xếp.", "In focus mode, insertion is at the top and details in the right drawer. This column is for browsing, filtering, and sorting.", "集中モードでは、挿入ボタンは上部に、詳細は右ドロワーに集約されます。このカラムは閲覧と並べ替え専用です。"),
}

parts = re.split(r'((?:vi|en|ja): \{)', content)

# parts[0]: HEAD
# parts[1]: vi: {
# parts[2]: VI CONTENT
# parts[3]: en: {
# parts[4]: EN CONTENT
# parts[5]: ja: {
# parts[6]: JA CONTENT

for i, lang in enumerate(["vi", "en", "ja"]):
    idx = i * 2 + 2
    lang_keys = "\n".join([f'    "{k}": "{v[i]}",' for k, v in new_keys.items()])
    parts[idx] = "\n" + lang_keys + parts[idx]

new_content = "".join(parts)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)
