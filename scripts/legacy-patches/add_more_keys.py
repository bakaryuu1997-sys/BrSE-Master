import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = {
    "chat.welcome": ("Chào anh! Em đã sẵn sàng hỗ trợ anh về nội dung cuộc họp \"{title}\". Anh có thắc mắc gì không ạ?", "Hello! I'm ready to help you with the content of \"{title}\". Do you have any questions?", "こんにちは！「{title}」の内容についてサポートさせていただきます。ご質問はありますか？"),
    "chat.error": ("⚠️ Đã có lỗi xảy ra khi gọi trợ lý AI.", "⚠️ An error occurred while calling the AI assistant.", "⚠️ AIアシスタントの呼び出し中にエラーが発生しました。"),
    "chat.title": ("Hỏi về cuộc họp", "Ask about meeting", "会議について質問"),
    "chat.asking": ("Đang hỏi 9router... {seconds}s", "Asking 9router... {seconds}s", "9routerに問い合わせ中... {seconds}s"),
    "chat.placeholder": ("Hỏi bất cứ điều gì về cuộc họp này...", "Ask anything about this meeting...", "この会議について何でも聞いてください..."),
    "memo.loadError": ("⚠️ Không thể tải nội dung bản ghi chú.", "⚠️ Unable to load memo content.", "⚠️ メモの内容を読み込めませんでした。"),
    "memo.saveSuccess": ("Đã lưu memo.", "Memo saved.", "メモを保存しました。"),
    "memo.saveError": ("Không lưu được memo.", "Failed to save memo.", "メモの保存に失敗しました。"),
    "memo.noShortVersion": ("Chưa có bản ngắn để lưu sang Memo Notes.", "No short version available to save to Memo Notes.", "Memo Notes に保存できる短い要約がありません。"),
    "memo.saveMemoSuccess": ("Đã lưu bản ngắn sang Memo Notes và sync PostgreSQL.", "Saved short version to Memo Notes and synced to PostgreSQL.", "短い要約を Memo Notes に保存し、PostgreSQL に同期しました。"),
    "memo.saveMemoLocal": ("Đã lưu bản ngắn sang Memo Notes local cache.", "Saved short version to Memo Notes local cache.", "短い要約を Memo Notes のローカルキャッシュに保存しました。"),
    "memo.featuredSpeakers": ("Người nói nổi bật", "Featured Speakers", "主な発言者"),
    "memo.openQuestions": ("Câu hỏi mở", "Open Questions", "未解決の質問"),
    "memo.quickActionPack": ("Gói action nhanh", "Quick Action Pack", "クイックアクションパック"),
    "memo.shortVersion": ("Bản ngắn", "Short", "短い要約"),
    "memo.detailedVersion": ("Chi tiết", "Detailed", "詳細要約"),
    "memo.fullVersion": ("Bản đầy đủ", "Full", "全文"),
    "memo.increaseClarity": ("Tăng độ rõ", "Increase clarity", "鮮明度を上げる"),
    "memo.dimInMeeting": ("Làm mờ khi họp", "Dim during meeting", "会議中に暗くする"),
    "memo.expandMemo": ("Mở rộng memo", "Expand memo", "メモを広げる"),
    "memo.closeMemo": ("Đóng memo", "Close memo", "メモを閉じる"),
    "memo.loadingPlaceholder": ("Memo đang được tải hoặc chưa có nội dung.", "Memo is loading or has no content.", "メモを読み込み中、または内容がありません。"),
    "trim.invalidTime": ("Thời gian bắt đầu và kết thúc không hợp lệ.", "Invalid start or end time.", "開始時間または終了時間が無効です。"),
    "trim.started": ("Đã bắt đầu xử lý đoạn cắt mới!", "Started processing new segment!", "新しいセグメントの処理を開始しました！"),
    "trim.error": ("Lỗi khi cắt video.", "Error trimming video.", "ビデオのトリミング中にエラーが発生しました。"),
    "trim.title": ("Cắt đoạn hội thoại", "Trim Conversation", "会話セグメントの切り出し"),
    "trim.selectFrom": ("Chọn từ {time}", "Select from {time}", "{time} から選択"),
    "trim.startSec": ("Bắt đầu (giây)", "Start (sec)", "開始 (秒)"),
    "trim.endSec": ("Kết thúc (giây)", "End (sec)", "終了 (秒)"),
    "trim.noteTitle": ("Lưu ý:", "Note:", "注意:"),
    "trim.noteBody": ("Hệ thống sẽ tạo một bản ghi mới từ giây thứ {start} đến giây thứ {end} và bắt đầu tóm tắt lại đoạn đó. Bản ghi gốc sẽ không bị ảnh hưởng.", "The system will create a new record from {start}s to {end}s and re-summarize it. The original record remains unchanged.", "秒目から {start} 秒目までの新しい記録を作成し、そのセグメントを再要約します。 {end} 元の記録は変更されません。"),
    "trim.startTrim": ("Bắt đầu cắt", "Start Trim", "トリミング開始"),
    "recorder.questionsHint": ("Có câu hỏi đang mở. Nên xác nhận owner, deadline, scope trước khi trả lời chắc.", "Open questions detected. Confirm owner, deadline, and scope before answering.", "未解決の質問があります。回答前に担当者、期限、スコープを確認してください。"),
    "recorder.risksHint": ("Có dấu hiệu risk/issue. Nên đánh dấu để chuyển sang Operations Q&A/Bug/CR sau meeting.", "Risks/issues detected. Mark them to move to Operations after the meeting.", "リスクや課題の兆候があります。会議後に Operations (Q&A/バグ/CR) へ移行するためにマークしてください。"),
    "recorder.actionsHint": ("Có action item tiềm năng. Nên sync sang BrSE Todo sau khi meeting kết thúc.", "Potential action items detected. Sync to BrSE Todo after the meeting.", "潜在的なアクションアイテムがあります。会議終了後に BrSE Todo へ同期してください。"),
    "recorder.confirmScope": ("Em xin xác nhận lại scope và deadline trước khi trả lời chính thức.", "I'd like to confirm the scope and deadline before providing a formal answer.", "正式に回答する前に、スコープと期限を再確認させてください。"),
    "recorder.checkEvidence": ("Em sẽ kiểm tra evidence/source liên quan rồi phản hồi lại để tránh hiểu sai.", "I'll check the relevant evidence/source and get back to you to avoid misunderstanding.", "誤解を避けるため、関連するエビデンスやソースを確認してから回答します。"),
}

vi_additions = "\n".join([f'    "{k}": "{v[0]}",' for k, v in new_keys.items()])
en_additions = "\n".join([f'    "{k}": "{v[1]}",' for k, v in new_keys.items()])
ja_additions = "\n".join([f'    "{k}": "{v[2]}",' for k, v in new_keys.items()])

content = content.replace('    "settings.projectLanguageHint": "Ngôn ngữ giao diện chung được đổi ở thanh bên / header.",', f'    "settings.projectLanguageHint": "Ngôn ngữ giao diện chung được đổi ở thanh bên / header.",\n{vi_additions}')
content = content.replace('    "settings.projectLanguageHint": "The global UI language is changed from the sidebar or header.",', f'    "settings.projectLanguageHint": "The global UI language is changed from the sidebar or header.",\n{en_additions}')
content = content.replace('    "settings.projectLanguageHint": "全体の UI 言語はサイドバー hoặc ヘッダーから切り替えます。",', f'    "settings.projectLanguageHint": "全体の UI 言語 là サイドバー hoặc ヘッダーから切り替えます。",\n{ja_additions}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
