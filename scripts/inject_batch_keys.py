import re

new_keys = {
    # Common Pagination
    "common.prev": {
        "vi": "Trước",
        "en": "Previous",
        "ja": "前へ",
    },
    "common.next": {
        "vi": "Sau",
        "en": "Next",
        "ja": "次へ",
    },
    "common.pageIndicator": {
        "vi": "Trang {page} / {total}",
        "en": "Page {page} / {total}",
        "ja": "ページ {page} / {total}",
    },

    # Operations Briefing & Statuses
    "operations.qnaWaiting": {
        "vi": "{count} Q&A đang chờ",
        "en": "{count} Q&A pending",
        "ja": "{count}件のQ&Aが保留中",
    },
    "operations.crPendingCount": {
        "vi": "{count} CR pending",
        "en": "{count} CR pending",
        "ja": "{count}件のCRが対応待ち",
    },
    "operations.slaBreachedCount": {
        "vi": "{count} SLA vi phạm",
        "en": "{count} SLA breached",
        "ja": "{count}件のSLA違反",
    },
    "operations.topUrgentRecords": {
        "vi": "Top bản ghi khẩn cấp",
        "en": "Top urgent records",
        "ja": "最優先レコード",
    },
    "operations.statusDraftOpen": {
        "vi": "Draft / Open",
        "en": "Draft / Open",
        "ja": "下書き / 未対応",
    },
    "operations.statusSentWaiting": {
        "vi": "Sent / Waiting",
        "en": "Sent / Waiting",
        "ja": "送信済 / 回答待ち",
    },
    "operations.statusAnswered": {
        "vi": "Answered",
        "en": "Answered",
        "ja": "回答済",
    },
    "operations.statusClosed": {
        "vi": "Closed",
        "en": "Closed",
        "ja": "完了",
    },

    # Power Tools
    "tools.pushToOpsFailedCreated": {
        "vi": "{error} (đã tạo {created}/{total}).",
        "en": "{error} (created {created}/{total}).",
        "ja": "{error} （{created}/{total}件作成済）。",
    },
    "tools.heuristicEstimate": {
        "vi": "ước lượng heuristic",
        "en": "heuristic estimate",
        "ja": "ヒューリスティック推定",
    },
    "tools.heuristicScoreNote": {
        "vi": "Điểm tự tính theo công thức nội bộ (scope/timeline/stakeholder) — chỉ để tham khảo, không phải đánh giá chính thức.",
        "en": "Calculated by internal formula (scope/timeline/stakeholder) — for reference only, not official appraisal.",
        "ja": "社内算式（スコープ・期間・関係者）による自動算出値 — 参考値であり公式評価ではありません。",
    },
    "tools.qaEffortHint": {
        "vi": "Gợi ý effort test/UAT tối thiểu từ tổng effort hiện tại, dùng làm guardrail khi estimate.",
        "en": "Suggested minimum test/UAT effort from current total, used as an estimate guardrail.",
        "ja": "現在の全体工数に基づくテスト・UAT工数の目安、見積時の基準として活用。",
    },
    "tools.highRiskOpenHint": {
        "vi": "High risk đang mở. Dùng preset để tự thêm risk/mitigation thường gặp trong dự án BrSE.",
        "en": "Open high risks. Use presets to add common BrSE project risks/mitigations.",
        "ja": "未解決の高リスク項目。プリセットからBrSE案件で典型的なリスク・緩和策を追加。",
    },

    # Specs Mindmap
    "specsMindmap.unlinkQnaTitle": {
        "vi": "Gỡ liên kết Q&A",
        "en": "Unlink Q&A",
        "ja": "Q&Aの関連付けを解除",
    },
    "specsMindmap.linkQnaTitle": {
        "vi": "Liên kết Q&A làm rõ yêu cầu",
        "en": "Link Q&A for requirement clarity",
        "ja": "仕様明確化のためQ&Aを関連付け",
    },

    # Templates Details
    "templates.reopenedFromHistory": {
        "vi": "Đã mở lại email từ History để chỉnh sửa.",
        "en": "Reopened email from History for editing.",
        "ja": "編集のため履歴からメールを再読込しました。",
    },
    "templates.personalSuffix": {
        "vi": "(Cá nhân)",
        "en": "(Personal)",
        "ja": "(個人用)",
    },
    "templates.updatedPersonal": {
        "vi": "Đã cập nhật template cá nhân.",
        "en": "Updated personal template.",
        "ja": "個人テンプレートを更新しました。",
    },
    "templates.savedPersonal": {
        "vi": "Đã lưu thành template cá nhân.",
        "en": "Saved as personal template.",
        "ja": "個人テンプレートとして保存しました。",
    },
    "templates.updatePersonalBtn": {
        "vi": "Cập nhật template cá nhân",
        "en": "Update personal template",
        "ja": "個人テンプレートを更新",
    },
    "templates.saveAsPersonalBtn": {
        "vi": "Lưu thành template cá nhân",
        "en": "Save as personal template",
        "ja": "個人テンプレートとして保存",
    },

    # Live Recording Panel
    "recorder.popoutTitle": {
        "vi": "Mở cửa sổ nhỏ luôn-trên-cùng để xem song song Zoom/Teams",
        "en": "Open always-on-top mini window for Zoom/Teams side-by-side view",
        "ja": "Zoom/Teamsと並行表示するための最前面ミニウィンドウを開く",
    },
    "recorder.popoutClose": {
        "vi": "Đóng popout",
        "en": "Close popout",
        "ja": "ポップアウトを閉じる",
    },
    "recorder.popoutOpen": {
        "vi": "Pop out",
        "en": "Pop out",
        "ja": "ポップアウト",
    },

    # Knowledge
    "knowledge.loadFailed": {
        "vi": "Không tải được kho tri thức.",
        "en": "Failed to load knowledge base.",
        "ja": "ナレッジベースの読み込みに失敗しました。",
    },
    "knowledge.saveFailed": {
        "vi": "Lưu tài liệu thất bại.",
        "en": "Failed to save document.",
        "ja": "ドキュメントの保存に失敗しました。",
    },

    # Command Palette
    "commandpalette.todoCreatedFromMeeting": {
        "vi": "Đã tạo {created} Todo từ Meeting Note trong project {project}.",
        "en": "Created {created} Todo items from Meeting Note in project {project}.",
        "ja": "プロジェクト「{project}」の会議録から{created}件のTodoを作成しました。",
    },

    # Keigo Requirement Panel
    "keigo.copyJapanese": {
        "vi": "Copy tiếng Nhật",
        "en": "Copy Japanese",
        "ja": "日本語をコピー",
    },
    "keigo.pushToKeigoCheckTitle": {
        "vi": "Đẩy mẫu này sang trình chỉnh sửa Kính ngữ ở trang chủ",
        "en": "Send this template to the Keigo editor on the home page",
        "ja": "このテンプレートをホームページの敬語エディタに送信",
    },
    "keigo.pushToKeigoCheck": {
        "vi": "Đẩy sang Keigo Check",
        "en": "Send to Keigo Check",
        "ja": "敬語チェックへ送信",
    },
    "keigo.refineAiTitle": {
        "vi": "Tinh chỉnh câu hỏi bằng AI",
        "en": "Refine Questions with AI",
        "ja": "AIで質問を推敲",
    },
    "keigo.refineAiSubtitle": {
        "vi": "Tự động cấu trúc lại tài liệu Specs thô thành email hỏi đáp Keigo chỉn chu.",
        "en": "Automatically structure raw specs into polished Keigo Q&A emails.",
        "ja": "粗削りな仕様書を整理し、洗練された敬語Q&Aメールへ自動変換。",
    },
    "keigo.specContextLabel": {
        "vi": "Nội dung đặc tả yêu cầu (Spec / Requirement Context)",
        "en": "Requirement Spec Content (Spec / Context)",
        "ja": "要件定義・仕様コンテキスト",
    },
    "keigo.specContextPlaceholder": {
        "vi": "Dán tài liệu mô tả yêu cầu hoặc bản nháp Specs được sinh ở Tab 1...",
        "en": "Paste requirement specs or draft generated from Tab 1...",
        "ja": "要件記述やタブ1で生成したドラフトを貼り付け...",
    },
    "keigo.aiRefinePromptLabel": {
        "vi": "Yêu cầu AI phân tích hoặc tinh lọc",
        "en": "Prompt AI to analyze or refine",
        "ja": "AIへの分析・推敲指示",
    },
    "keigo.aiRefinePlaceholder": {
        "vi": "Ví dụ: Lập email đặt câu hỏi thông tin dạng Q&A bằng tiếng Nhật lịch sự...",
        "en": "e.g. Draft a polite Japanese Q&A email asking for clarification...",
        "ja": "例：丁寧なビジネス日本語で仕様確認を行うQ&Aメールを作成してください...",
    },
    "keigo.quickPrompts": {
        "vi": "Gợi ý câu hỏi nhanh",
        "en": "Quick prompt suggestions",
        "ja": "クイック質問プロンプト",
    },
    "keigo.aiAnalysisTitle": {
        "vi": "Phân tích từ AI Assistant",
        "en": "AI Assistant Analysis",
        "ja": "AIアシスタントの分析結果",
    },
    "keigo.copyReply": {
        "vi": "Copy câu trả lời",
        "en": "Copy Answer",
        "ja": "回答をコピー",
    },
    "keigo.operationalPlaybooks": {
        "vi": "Playbooks vận hành",
        "en": "Operational Playbooks",
        "ja": "運用プレイブック",
    },
    "keigo.spec4AxesChecker": {
        "vi": "Checker 4 Trục Spec",
        "en": "4-Axis Spec Checker",
        "ja": "仕様4軸チェッカー",
    },
}

def inject_for_lang(lang):
    file_path = f"frontend/lib/i18n/{lang}.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find where the object ends (before "} as const;")
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
