import re

ui_language_path = "frontend/lib/uiLanguage.ts"

with open(ui_language_path, "r", encoding="utf-8") as f:
    ui_lang = f.read()

# Remove the duplicates that we just added
ui_lang = re.sub(r'\s*"operations\.cancelEdit": "Hủy sửa",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.edit": "Sửa",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.delete": "Xóa",', '', ui_lang)

ui_lang = re.sub(r'\s*"operations\.cancelEdit": "Cancel edit",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.edit": "Edit",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.delete": "Delete",', '', ui_lang)

ui_lang = re.sub(r'\s*"operations\.cancelEdit": "編集をキャンセル",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.edit": "編集",', '', ui_lang)
ui_lang = re.sub(r'\s*"operations\.delete": "削除",', '', ui_lang)

with open(ui_language_path, "w", encoding="utf-8") as f:
    f.write(ui_lang)
