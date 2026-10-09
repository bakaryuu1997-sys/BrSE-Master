import re

# 1. MeetingChatModal
p1 = "frontend/components/MeetingChatModal.tsx"
with open(p1, "r", encoding="utf-8") as f: c1 = f.read()
c1 = c1.replace('{ role: "assistant", content: `Chào anh! Em đã sẵn sàng hỗ trợ anh về nội dung cuộc họp "${title}". Anh có thắc mắc gì không ạ?` }', '{ role: "assistant", content: t("chat.welcome").replace("{title}", title) }')
c1 = c1.replace('"⚠️ Đã có lỗi xảy ra khi gọi trợ lý AI."', 't("chat.error")')
c1 = c1.replace('>Hỏi về cuộc họp<', '>{t("chat.title")}<')
c1 = c1.replace('Đang hỏi 9router... {elapsedSeconds}s', '{t("chat.asking").replace("{seconds}", String(elapsedSeconds))}')
c1 = c1.replace('placeholder="Hỏi bất cứ điều gì về cuộc họp này..."', 'placeholder={t("chat.placeholder")}')
c1 = c1.replace('>Gửi<', '>{t("aichat.send")}<') # reuse
with open(p1, "w", encoding="utf-8") as f: f.write(c1)

# 2. MeetingMemoModal
p2 = "frontend/components/MeetingMemoModal.tsx"
with open(p2, "r", encoding="utf-8") as f: c2 = f.read()
c2 = c2.replace('"⚠️ Không thể tải nội dung bản ghi chú."', 't("memo.loadError")')
c2 = c2.replace('"Đã lưu memo."', 't("memo.saveSuccess")')
c2 = c2.replace('"Không lưu được memo."', 't("memo.saveError")')
c2 = c2.replace('"Chưa có bản ngắn để lưu sang Memo Notes."', 't("memo.noShortVersion")')
c2 = c2.replace('"Đã lưu bản ngắn sang Memo Notes và sync PostgreSQL."', 't("memo.saveMemoSuccess")')
c2 = c2.replace('"Đã lưu bản ngắn sang Memo Notes local cache."', 't("memo.saveMemoLocal")')
c2 = c2.replace('"Người nói nổi bật"', 't("memo.featuredSpeakers")')
c2 = c2.replace('"Câu hỏi mở"', 't("memo.openQuestions")')
c2 = c2.replace('"Gói action nhanh"', 't("memo.quickActionPack")')
c2 = c2.replace('short: language === "ja" ? "短い要約" : language === "en" ? "Short" : "Bản ngắn"', 'short: t("memo.shortVersion")')
c2 = c2.replace('detailed: language === "ja" ? "詳細要約" : language === "en" ? "Detailed" : "Chi tiết"', 'detailed: t("memo.detailedVersion")')
c2 = c2.replace('title={isDimmed ? "Tăng độ rõ" : "Làm mờ khi họp"}', 'title={isDimmed ? t("memo.increaseClarity") : t("memo.dimInMeeting")}')
c2 = c2.replace('title="Mở rộng memo"', 'title={t("memo.expandMemo")}')
c2 = c2.replace('title="Đóng memo"', 'title={t("memo.closeMemo")}')
c2 = c2.replace('"Memo đang được tải hoặc chưa có nội dung."', 't("memo.loadingPlaceholder")')
with open(p2, "w", encoding="utf-8") as f: f.write(c2)

# 3. VideoTrimModal
p3 = "frontend/components/VideoTrimModal.tsx"
with open(p3, "r", encoding="utf-8") as f: c3 = f.read()
c3 = c3.replace('"Thời gian bắt đầu và kết thúc không hợp lệ."', 't("trim.invalidTime")')
c3 = c3.replace('"Đã bắt đầu xử lý đoạn cắt mới!"', 't("trim.started")')
c3 = c3.replace('"Lỗi khi cắt video."', 't("trim.error")')
c3 = c3.replace('>Cắt đoạn hội thoại<', '>{t("trim.title")}<')
c3 = c3.replace('title={`Chọn từ ${formatTime(mark)}`}', 'title={t("trim.selectFrom").replace("{time}", formatTime(mark))}')
c3 = c3.replace('>Bắt đầu (giây)<', '>{t("trim.startSec")}<')
c3 = c3.replace('>Kết thúc (giây)<', '>{t("trim.endSec")}<')
c3 = c3.replace('>Lưu ý:<', '>{t("trim.noteTitle")}<')
c3 = c3.replace('Hệ thống sẽ tạo một bản ghi mới từ giây thứ {startTime} đến giây thứ {endTime} và bắt đầu tóm tắt lại đoạn đó. Bản ghi gốc sẽ không bị ảnh hưởng.', '{t("trim.noteBody").replace("{start}", String(startTime)).replace("{end}", String(endTime))}')
c3 = c3.replace('>Bắt đầu cắt<', '>{t("trim.startTrim")}<')
with open(p3, "w", encoding="utf-8") as f: f.write(c3)

# 4. LiveRecordingPanel
p4 = "frontend/components/LiveRecordingPanel.tsx"
with open(p4, "r", encoding="utf-8") as f: c4 = f.read()
c4 = c4.replace('["Có câu hỏi đang mở. Nên xác nhận owner, deadline, scope trước khi trả lời chắc."]', '[t("recorder.questionsHint")]')
c4 = c4.replace('["Có dấu hiệu risk/issue. Nên đánh dấu để chuyển sang Operations Q&A/Bug/CR sau meeting."]', '[t("recorder.risksHint")]')
c4 = c4.replace('["Có action item tiềm năng. Nên sync sang BrSE Todo sau khi meeting kết thúc."]', '[t("recorder.actionsHint")]')
c4 = c4.replace('"Em xin xác nhận lại scope và deadline trước khi trả lời chính thức."', 't("recorder.confirmScope")')
c4 = c4.replace('"Em sẽ kiểm tra evidence/source liên quan rồi phản hồi lại để tránh hiểu sai."', 't("recorder.checkEvidence")')
c4 = c4.replace('>Đẩy Todo<', '>{t("recorder.pushTodo")}<')
c4 = c4.replace('>Tạo Q&A<', '>{t("recorder.createQna")}<')
c4 = c4.replace('Sau khi dừng', '{t("recorder.afterStop")}')
with open(p4, "w", encoding="utf-8") as f: f.write(c4)
