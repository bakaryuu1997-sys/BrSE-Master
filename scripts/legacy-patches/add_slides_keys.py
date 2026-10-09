import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = {
    "slides.lines": ("dòng", "lines", "行"),
    "slides.scriptDesc": ("Script đọc/ghi âm, có thể đóng/mở để giao diện Slide Studio gọn hơn.", "Speech/recording script, can be toggled to simplify the workspace.", "読み上げ・録音用スクリプト。ワークスペースを簡素化するために開閉可能です。"),
    "slides.copyCurrent": ("Copy slide này", "Copy current", "現在をコピー"),
    "slides.copyDeckScript": ("Copy toàn bộ script", "Copy deck script", "全体台本をコピー"),
    "slides.readPreview": ("Preview để đọc", "Read preview", "読み上げプレビュー"),
    "slides.clientReady": ("Deck đi khách", "Client-ready deck", "顧客向けデッキ"),
    "slides.realPptx": ("Xuất PPTX thật", "Real PPTX export", "実際のPPTX出力"),
    "slides.turnMarkdown": ("Biến Markdown thành deck chuyên nghiệp", "Turn Markdown into a polished slide deck", "Markdown を見栄えの良いスライドデッキへ"),
    "slides.structureHint": ("Đã có sẵn: `cover`, `divider`, `appendix` và các nút tạo nhanh tương ứng.", "Built-in structure blocks: cover, divider, appendix, and quick insert buttons.", "表紙、区切り、付録の構造ブロックと、対応するクイック挿入ボタンを用意しています。"),
    "slides.unlimitedHint": ("Không giới hạn 3 slide. Bạn thêm tự do bằng `#`, `---`, hoặc các nút dựng sẵn.", "There is no 3-slide limit. Add freely with `#`, `---`, or the structure buttons.", "3枚制限はありません。`#`、`---`、または構造ボタンで自由に追加できます。"),
    "slides.inspectorDesc": ("Cột phải tập trung vào slide đang chọn, nhận diện deck, AI và export. Theme và template đã chuyển sang cột trái để giống editor slide hơn.", "The right column focuses on the selected slide, deck identity, AI, and export. Themes/Templates moved left for a natural slide editor feel.", "右カラムは選択中スライド、デッキ情報、AI、書き出しに特化しています。テーマとテンプレートは左へ移動しました。"),
    "slides.deckIdentity": ("Nhận diện deck", "Deck identity", "デッキ情報"),
    "slides.clientName": ("Tên khách hàng", "Client name", "顧客名"),
    "slides.reportDate": ("Ngày báo cáo", "Report date", "報告日"),
    "slides.logoMark": ("Ký hiệu logo", "Logo mark", "ロゴ表記"),
    "slides.footer": ("Chân trang", "Footer", "フッター"),
    "slides.showPageNumbers": ("Hiện số trang trên preview và export", "Show page numbers on preview and export", "プレビューと書き出しでページ番号を表示"),
    "slides.visualDiagnostics": ("Chẩn đoán hình ảnh", "Visual diagnostics", "ビジュアル診断"),
    "slides.inspectorFinish": ("Xác nhận & Hoàn thiện", "Confirm & Finish", "インスペクターと仕上げ"),
    "slides.navigatorDesc": ("Cột trái để duyệt slide, đổi theme và nạp mẫu nhanh.", "The left rail is for browsing slides, changing themes, and loading templates.", "左レールでスライドの閲覧、テーマ変更、テンプレートの読み込みが行えます。"),
    "slides.searchPlaceholder": ("Tìm tiêu đề, nội dung...", "Search title, content...", "タイトル・内容を検索..."),
    "slides.noSlidesMatch": ("Không có slide nào khớp bộ lọc.", "No slides match the filter.", "該当するスライドはありません。"),
    "slides.selectTheme": ("Chọn giao diện", "Select theme", "テーマを選択"),
    "slides.loadTemplate": ("Nạp mẫu có sẵn", "Load template", "テンプレートを読み込む"),
    "slides.ribbonInsert": ("Chèn", "Insert", "挿入"),
    "slides.ribbonDeck": ("Deck", "Deck", "デッキ"),
    "slides.ribbonView": ("Xem", "View", "表示"),
    "slides.ribbonExport": ("Xuất", "Export", "書き出し"),
    "slides.ribbonAuto": ("Tự động", "Auto", "自動生成"),
    "slides.ribbonCurrent": ("Hiện tại", "Current", "現在"),
    "slides.ribbonOutline": ("Đề cương", "Outline", "アウトライン"),
    "slides.ribbonPptx": ("PPTX", "PPTX", "PPTX"),
    "slides.canvasDesc": ("Sửa trực tiếp từng trường của slide và xem preview lớn ngay lập tức.", "Directly edit slide fields and see the large preview instantly.", "スライドの各フィールドを直接編集し、大きなプレビューですぐに確認できます。"),
    "slides.fieldTitlePlaceholder": ("VD: Báo cáo tuần 1", "e.g., Weekly Report W1", "例：週次報告 W1"),
    "slides.fieldBodyPlaceholder": ("Nhập nội dung...", "Enter content...", "内容を入力..."),
    "slides.fieldSubtitlePlaceholder": ("Phụ đề (tùy chọn)", "Subtitle (optional)", "サブタイトル（任意）"),
    "slides.fieldNotesPlaceholder": ("Ghi chú thuyết trình...", "Speaker notes...", "発表メモ..."),
    "slides.previewDesc": ("Xem trước slide thực tế theo theme đã chọn.", "Live slide preview with the selected theme.", "選択したテーマでのスライドプレビュー。"),
    "slides.fullDeckReview": ("Chế độ rà toàn bộ deck", "Full deck review mode", "デッキ全体レビューモード"),
}

vi_additions = "\n".join([f'    "{k}": "{v[0]}",' for k, v in new_keys.items()])
en_additions = "\n".join([f'    "{k}": "{v[1]}",' for k, v in new_keys.items()])
ja_additions = "\n".join([f'    "{k}": "{v[2]}",' for k, v in new_keys.items()])

content = content.replace('    "settings.projectLanguageHint": "Ngôn ngữ giao diện chung được đổi ở thanh bên / header.",', f'    "settings.projectLanguageHint": "Ngôn ngữ giao diện chung được đổi ở thanh bên / header.",\n{vi_additions}')
content = content.replace('    "settings.projectLanguageHint": "The global UI language is changed from the sidebar or header.",', f'    "settings.projectLanguageHint": "The global UI language is changed from the sidebar or header.",\n{en_additions}')
content = content.replace('    "settings.projectLanguageHint": "全体の UI 言語 là サイドバー hoặc ヘッダーから切り替えます。",', f'    "settings.projectLanguageHint": "全体の UI 言語 là サイドバー hoặc ヘッダーから切り替えます。",\n{ja_additions}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
