import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = {
    "slides.tagBatchPlaceholder": ("Gán nhãn cho nhóm slide", "Apply one tag to selected slides", "選択中のスライドへ共通タグを適用"),
    "slides.assignTag": ("Gán nhãn", "Assign tag", "タグを適用"),
    "slides.assignLayout": ("Gán bố cục", "Assign layout", "レイアウトを適用"),
    "slides.selectSlide": ("Chọn slide", "Select slide", "スライドを選択"),
    "slides.sectionLabel": ("Phần {num}", "Section {num}", "セクション {num}"),
    "slides.duplicateSlide": ("Nhân đôi slide", "Duplicate slide", "スライドを複製"),
    "slides.deleteSlide": ("Xóa slide", "Delete slide", "スライドを削除"),
    "slides.notesCount": ("{count} ghi chú", "{count} notes", "{count}件のメモ"),
    "slides.themesDesc": ("Tất cả theme nằm trong một cột riêng để bạn cuộn, so sánh và đổi nhanh giống panel theme của editor slide.", "All themes are in one column for quick scrolling, comparison, and switching.", "すべてのテーマが一つのカラムにまとまっており、素早く比較・切り替えが可能です。"),
    "slides.recommendedForTemplate": ("Gợi ý theo template", "Recommended for template", "テンプレート向けおすすめ"),
    "slides.markAsFavorite": ("Đánh dấu yêu thích", "Mark as favorite", "お気に入りに追加"),
    "slides.slidePreview": ("Xem trước slide", "Slide preview", "スライド プレビュー"),
    "slides.focusMode": ("Chế độ tập trung", "Focus mode", "集中モード"),
    "slides.fullDeckMode": ("Chế độ xem toàn deck", "Full deck mode", "全体ビューモード"),
    "slides.ribbonDesc": ("Các lệnh chèn và thao tác slide đã được gom lên ribbon phía trên. Khung này chỉ giữ phần duyệt, lọc và sắp xếp.", "Insertion and slide commands are moved to the top ribbon. This area is for browsing, filtering, and sorting.", "挿入ボタンや各種コマンドは上部のリボンへ移動しました。ここは閲覧、フィルタ、並べ替え専用です。"),
}

parts = re.split(r'((?:vi|en|ja): \{)', content)

for i, lang in enumerate(["vi", "en", "ja"]):
    idx = i * 2 + 2
    lang_keys = "\n".join([f'    "{k}": "{v[i]}",' for k, v in new_keys.items()])
    parts[idx] = "\n" + lang_keys + parts[idx]

new_content = "".join(parts)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)
