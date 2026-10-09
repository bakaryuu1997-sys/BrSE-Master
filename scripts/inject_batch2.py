import re

new_keys = {
    # ReportsDailyBuilder
    "reports.autoUpdateNote": {
        "vi": "Tự cập nhật khi bạn sửa nội dung.",
        "en": "Auto-updates as you edit content.",
        "ja": "内容編集時に自動更新されます。",
    },
    "reports.createdDailyFor": {
        "vi": "Tạo Daily Report cho {day}.",
        "en": "Create Daily Report for {day}.",
        "ja": "{day}の日次報告を作成。",
    },

    # OperationsWorkSurface
    "operations.listView": {
        "vi": "Xem danh sách (List View)",
        "en": "List View",
        "ja": "リスト表示",
    },
    "operations.kanbanView": {
        "vi": "Xem bảng Kanban (Kanban View)",
        "en": "Kanban View",
        "ja": "カンバン表示",
    },
    "operations.ageDays": {
        "vi": "ngày",
        "en": "days",
        "ja": "日",
    },

    # MeetingHistory
    "meeting.memoNeedRecover": {
        "vi": "{count} memo cần recover",
        "en": "{count} memos need recovery",
        "ja": "{count}件の要復旧メモ",
    },
    "meeting.historyStatusSummary": {
        "vi": "{activeAiCount} đang AI · {uploadResumeCount} cần resume upload",
        "en": "{activeAiCount} AI running · {uploadResumeCount} need upload resume",
        "ja": "AI処理中: {activeAiCount}件 · アップロード再開待ち: {uploadResumeCount}件",
    },

    # NodeEditModal
    "specsMindmap.updateNodeStatus": {
        "vi": "Cập nhật trạng thái Node",
        "en": "Update Node Status",
        "ja": "ノード状態を更新",
    },
    "specsMindmap.selectStatus": {
        "vi": "Chọn trạng thái",
        "en": "Select Status",
        "ja": "ステータス選択",
    },
    "specsMindmap.qnaQuestionForClient": {
        "vi": "Câu hỏi Q&A gửi khách hàng",
        "en": "Q&A Question for Client",
        "ja": "顧客向けQ&A質問",
    },
    "specsMindmap.qnaQuestionPlaceholder": {
        "vi": "Nhập nội dung cần xác nhận / hỏi khách hàng bằng tiếng Nhật hoặc tiếng Việt...",
        "en": "Enter clarification question for client in Japanese or English...",
        "ja": "顧客への確認・質問事項を入力...",
    },
    "specsMindmap.saveStatusBtn": {
        "vi": "Lưu trạng thái",
        "en": "Save Status",
        "ja": "ステータスを保存",
    },
}

def inject_for_lang(lang):
    file_path = f"frontend/lib/i18n/{lang}.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"(\n\}\s*as\s+const\s*;)"
    match = re.search(pattern, content)
    if not match:
        raise Exception(f"Could not find ending in {file_path}")

    insertion_pos = match.start()
    
    lines_to_add = []
    for k, trans in sorted(new_keys.items()):
        val = trans[lang].replace('"', '\\"')
        lines_to_add.append(f'  "{k}": "{val}",\n')

    new_content = content[:insertion_pos] + "".join(lines_to_add) + content[insertion_pos:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Injected {len(new_keys)} keys into {file_path}")

for l in ["vi", "en", "ja"]:
    inject_for_lang(l)
