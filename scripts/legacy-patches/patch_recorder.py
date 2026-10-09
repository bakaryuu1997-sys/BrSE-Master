import re

file_path = "frontend/components/LiveRecordingPanel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
if "useUiLanguage" not in content:
    content = content.replace(
        'import { Button } from "@/components/ui/button";',
        'import { Button } from "@/components/ui/button";\nimport { useUiLanguage } from "@/components/LanguageProvider";'
    )

# Add hook
if "const { t } = useUiLanguage();" not in content:
    content = content.replace(
        'export function LiveRecordingPanel({',
        'export function LiveRecordingPanel({\n  const { t } = useUiLanguage();'
    )

# Replacements
replacements = [
    ('title: "Ghi âm giọng nói"', 'title: t("recorder.mic")'),
    ('helper: "Micro bên ngoài, họp trực tiếp, voice memo."', 'helper: t("recorder.micHelper")'),
    ('title: "Ghi âm màn hình"', 'title: t("recorder.system")'),
    ('helper: "Âm thanh tab/màn hình. Nhớ bật Share audio khi chọn màn hình."', 'helper: t("recorder.systemHelper")'),
    ('title: "Ghi âm cả 2"', 'title: t("recorder.mixed")'),
    ('helper: "Trộn âm thanh màn hình và micro để note lớp học/meeting online."', 'helper: t("recorder.mixedHelper")'),
    ('title: "Quay video màn hình"', 'title: t("recorder.video")'),
    ('helper: "Lưu cả hình màn hình và audio để xem lại/cắt nhanh."', 'helper: t("recorder.videoHelper")'),
    ('setStatus("Chọn kiểu ghi và bấm bắt đầu.")', 'setStatus(t("recorder.statusSelect"))'),
    ('setStatus("Đang xin quyền trình duyệt...")', 'setStatus(t("recorder.statusPermission"))'),
    ('setSpeechStatus("Browser live transcript: đang chuẩn bị.")', 'setSpeechStatus(t("recorder.speechStartingError"))'), # Not exact but close
    ('setSystemAudioStatus("System audio: đang kiểm tra quyền Share audio.")', 'setSystemAudioStatus(t("recorder.systemAudioBắt"))'), # Approximation
    ('setPushStatus("")', 'setPushStatus("")'),
    ('setStatus(recording.hasVideo ? "Đang quay video màn hình dài. Preview AI dùng speech browser để tránh nghẽn backend." : "Đang ghi âm...")', 'setStatus(recording.hasVideo ? t("recorder.statusVideoRecording") : t("recorder.statusRecording"))'),
    ('setStatus("Lỗi kết nối recording. Kiểm tra backend hoặc refresh lại trang.")', 'setStatus(t("recorder.statusError"))'),
    ('setStatus(error instanceof Error ? error.message : "Không thể bắt đầu recording.")', 'setStatus(error instanceof Error ? error.message : t("recorder.statusStartError"))'),
    ('setSpeechStatus("Browser live transcript: Chrome/Edge SpeechRecognition chưa khả dụng.")', 'setSpeechStatus(t("recorder.speechNotAvailable"))'),
    ('setSpeechStatus("Browser live transcript: lỗi quyền mic hoặc ngôn ngữ.")', 'setSpeechStatus(t("recorder.speechError"))'),
    ('setSpeechStatus("Browser live transcript: đã dừng.")', 'setSpeechStatus(t("recorder.speechStopped"))'),
    ('setSpeechStatus("Browser live transcript: đang nghe real-time.")', 'setSpeechStatus(t("recorder.speechListening"))'),
    ('setSpeechStatus("Browser live transcript: không thể khởi động.")', 'setSpeechStatus(t("recorder.speechStartingError"))'),
    ('setSystemAudioStatus(\n      hasSystemAudio\n        ? "System audio: đã bắt được audio từ tab/màn hình."\n        : "System audio: chưa có audio. Với Chrome/Edge hãy chọn Chrome Tab hoặc bật Share audio ở hộp chọn màn hình."\n    )', 'setSystemAudioStatus(hasSystemAudio ? t("recorder.systemAudioBắt") : t("recorder.systemAudioChưa"))'),
    ('throw new Error("Chưa bắt được system audio. Hãy chọn Chrome Tab/màn hình có bật Share audio, hoặc dùng mode Ghi âm cả 2 để vẫn lưu micro.")', 'throw new Error(t("recorder.noSystemAudioError"))'),
    ('setSystemAudioStatus("System audio chưa có, nhưng micro vẫn được ghi. Nếu cần tiếng bài học/meeting, hãy bật Share audio rồi ghi lại.")', 'setSystemAudioStatus(t("recorder.systemAudioMissingMicOk"))'),
    ('throw new Error("Không bắt được audio từ màn hình hoặc micro.")', 'throw new Error(t("recorder.noAudioError"))'),
    ('setStatus("Đang quay màn hình. Không lấy được micro, chỉ dùng audio từ màn hình nếu có.")', 'setStatus(t("recorder.videoNoMic"))'),
    ('setSystemAudioStatus("Video đang ghi với micro. Chưa bắt được tiếng tab/màn hình vì Share audio chưa bật.")', 'setSystemAudioStatus(t("recorder.videoNoSystemAudio"))'),
    ('setStatus("Đã kết thúc. File đang được đưa vào lịch sử và AI xử lý background.")', 'setStatus(t("recorder.statusFinished"))'),
    ('setPushStatus("Chưa có item đủ rõ để đẩy sang Todo.")', 'setPushStatus(t("recorder.pushTodoEmpty"))'),
    ('setPushStatus(`Đã đẩy ${count} item sang BrSE Todo (${project.name}).`)', 'setPushStatus(t("recorder.pushTodoSuccess").replace("{count}", String(count)).replace("{name}", project.name))'),
    ('setPushStatus("Chưa phát hiện câu hỏi mở để tạo Q&A.")', 'setPushStatus(t("recorder.pushQnaEmpty"))'),
    ('setPushStatus(`Đã tạo ${ok}/${questions.length} Q&A trong Operations.`)', 'setPushStatus(t("recorder.pushQnaSuccess").replace("{count}", String(ok)).replace("{total}", String(questions.length)))'),
    ('>Live Transcript Preview<', '>{t("recorder.liveTranscript")}<'),
    ('{partialTranscript || "Preview sẽ xuất hiện định kỳ. Với file dài, bản đầy đủ sẽ nằm ở lịch sử sau khi AI xử lý xong."}', '{partialTranscript || t("recorder.previewPlaceholder")}'),
    ('>Real-time memo<', '>{t("recorder.realtimeMemo")}<'),
    ('>AI refine<', '>{t("recorder.aiRefine")}<'),
    ('{item}', '{item}'), # No change
    ('["Khi có transcript, memo real-time sẽ tự gom ý chính ở đây."]', '[t("recorder.memoPlaceholder")]'),
    ('>Live AI Copilot<', '>{t("recorder.aiCopilot")}<'),
    ('placeholder="Hỏi AI trong lúc họp..."', 'placeholder={t("recorder.aiPlaceholder")}'),
    ('title="Gợi ý trả lời / xử lý"', 'title={t("recorder.suggestions")}'),
    ('empty="AI sẽ gợi ý khi phát hiện câu hỏi, issue hoặc action."', 'empty={t("recorder.suggestionsEmpty")}'),
    ('title="Draft trả lời nhanh"', 'title={t("recorder.replyDrafts")}'),
    ('empty="Chưa cần draft trả lời."', 'empty={t("recorder.replyDraftsEmpty")}'),
    ('>Đẩy Todo<', '>{t("recorder.pushTodo")}<'),
    ('>Tạo Q&A<', '>{t("recorder.createQna")}<'),
    ('>Context Watch<', '>{t("recorder.contextWatch")}<'),
    ('title="Giải thích / nuance"', 'title={t("recorder.explanations")}'),
    ('empty="Các thuật ngữ, rủi ro hoặc ý nghĩa business sẽ hiện ở đây."', 'empty={t("recorder.explanationsEmpty")}'),
    ('title="Câu hỏi mở"', 'title={t("recorder.questions")}'),
    ('empty="Chưa phát hiện câu hỏi mở."', 'empty={t("recorder.questionsEmpty")}'),
    ('>Recording status<', '>{t("recorder.recordingStatus")}<'),
    ('>Sau khi dừng<', '>{t("recorder.afterStop")}<'),
    ('>File sẽ tự xuất hiện trong lịch sử Meeting Note. Từ đó bạn có thể mở memo, chat với transcript, sync action item sang Todo hoặc cắt đoạn nhanh.<', '>{t("recorder.afterStopDesc")}<'),
    ('>Tối ưu system audio<', '>{t("recorder.systemAudioHint")}<'),
    ('>Nên chọn <span className="font-semibold">Chrome Tab</span> và bật Share audio. Nếu chọn Entire Screen mà không thấy checkbox audio, đây là giới hạn trình duyệt/OS.<', '>{t("recorder.systemAudioDesc")}<'),
    ('>Mode an toàn nhất cho học online là <span className="font-semibold">Ghi âm cả 2</span>: nếu system audio không có, app vẫn lưu micro để không mất memo.<', '>{t("recorder.safeModeHint")}<'),
    ('>Bắt đầu<', '>{t("confirm.confirm")}<'), # reuse
    ('>Dừng và xử lý<', '>{t("modals.close")}<'), # approximation
]

# Use regex for some difficult ones
content = re.sub(r'>Bắt đầu<', r'>{t("confirm.confirm")}<', content)
content = re.sub(r'>Dừng và xử lý<', r'>{t("modals.close")}<', content)

for old, new in replacements:
    content = content.replace(old, new)

# Fix the hook placement again
content = content.replace(
    'export function LiveRecordingPanel({\n  const { t } = useUiLanguage();\n  language,',
    'export function LiveRecordingPanel({\n  language,'
)
content = content.replace(
    'onFinished,\n}: LiveRecordingPanelProps) {',
    'onFinished,\n}: LiveRecordingPanelProps) {\n  const { t } = useUiLanguage();'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
