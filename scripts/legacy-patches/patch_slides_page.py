import re

file_path = "frontend/app/app/slides/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add hook if missing
if "const { t } = useUiLanguage();" not in content:
    content = content.replace(
        'export default function SlideStudioPage() {',
        'export default function SlideStudioPage() {\n  const { t } = useUiLanguage();'
    )

replacements = [
    ('vi: "Một xưởng dựng deck có nhịp và chiều sâu"', 'vi: t("slides.studioIntroTitle")'),
    ('{language === "en" ? "Meeting Minutes import is ready" : language === "ja" ? "Meeting Minutes からの取り込み準備ができました" : "Bản nhập từ Meeting Minutes đã sẵn sàng"}', '{t("slides.importReadyTitle")}'),
    ('{language === "en" ? "Left thumbnails · center canvas · right inspector" : language === "ja" ? "左サムネイル · 中央キャンバス · 右インスペクター" : "Thumbnail trái · canvas giữa · inspector phải"}', '{t("slides.layoutThumbnails")}'),
    ('>Thay thế deck hiện tại<', '>{t("slides.replaceDeck")}<'),
    ('>Nối thêm slides<', '>{t("slides.appendSlides")}<'),
    ('>Bỏ qua<', '>{t("slides.dismiss")}<'),
    ('>Workspace tập trung<', '>{t("slides.workspaceFocus")}<'),
    ('>Giữ slide list bên trái, editor ở giữa, preview lớn bên phải. Các thiết lập phụ được gom vào drawer để đỡ rối.<', '>{t("slides.focusWorkspaceHint")}<'),
    ('>Nội dung slide đang chọn<', '>{t("slides.selectedSlideContent")}<'),
    ('>Tiêu đề<', '>{t("slides.fieldTitle")}<'),
    ('>Nội dung slide<', '>{t("slides.slideContent")}<'),
    ('>Tag, layout, thao tác nhanh và xuất file được gom sang drawer bên phải để khung giữa chỉ còn phần soạn nội dung.<', '>{t("slides.slideContentHint")}<'),
    ('>Cột trái<', '>{t("slides.leftColumn")}<'),
    ('>Cột phải<', '>{t("slides.rightColumn")}<'),
    ('"Đã nhập file markdown"', 't("slides.importedMarkdown")'),
    ('setStatus(`Đã thêm slide số ${num}`)', 'setStatus(t("slides.addedSlide").replace("{num}", String(num)))'),
    ('"Đã thêm trang mở đầu"', 't("slides.addedCover")'),
    ('setStatus(`Đã thêm slide chia phần ${num}`)', 'setStatus(t("slides.addedSection").replace("{num}", String(num)))'),
    ('"Đã thêm slide phụ lục"', 't("slides.addedAppendix")'),
    ('"Đã chọn toàn bộ slide"', 't("slides.selectAll")'),
    ('"Đã bỏ chọn tất cả slide"', 't("slides.clearSelection")'),
    ('setStatus(`Đã xóa ${selectedSlideIds.length} slide đã chọn`)', 'setStatus(t("slides.deletedBatch").replace("{count}", String(selectedSlideIds.length)))'),
    ('"Đã đưa nhóm slide lên"', 't("slides.movedUpBatch")'),
    ('"Đã đưa nhóm slide xuống"', 't("slides.movedDownBatch")'),
    ('setStatus(`Đã nhân đôi ${selectedSlideIds.length} slide đã chọn`)', 'setStatus(t("slides.duplicatedBatch").replace("{count}", String(selectedSlideIds.length)))'),
    ('setStatus(`Đã gán nhãn "${tag}" cho ${selectedSlideIds.length} slide`)', 'setStatus(t("slides.assignedTagBatch").replace("{tag}", tag).replace("{count}", String(selectedSlideIds.length)))'),
    ('setStatus(`Đã gán bố cục "${layout}" cho ${selectedSlideIds.length} slide`)', 'setStatus(t("slides.assignedLayoutBatch").replace("{layout}", layout).replace("{count}", String(selectedSlideIds.length)))'),
    ('"Đã tạo hoặc cập nhật slide mục lục theo phần"', 't("slides.generatedToc")'),
    ('"Đã tạo hoặc cập nhật slide chỉ mục phụ lục"', 't("slides.generatedAppendix")'),
    ('"Đã đưa slide lên"', 't("slides.movedUp")'),
    ('"Đã đưa slide xuống"', 't("slides.movedDown")'),
    ('setStatus(`Đã chèn slide mới sau slide ${num}`)', 'setStatus(t("slides.insertedAfter").replace("{num}", String(num)))'),
    ('"Đã sao chép đề cương"', 't("slides.copiedOutline")'),
    ('setStatus(`Đã kéo slide đến vị trí ${num}`)', 'setStatus(t("slides.droppedSlide").replace("{num}", String(num)))'),
    ('"Đã sao chép ghi chú thuyết trình"', 't("slides.copiedSpeakerNotes")'),
    ('"Chưa có ghi chú thuyết trình."', 't("slides.noSpeakerNotes")'),
    ('"Đã sao chép script slide hiện tại"', 't("slides.copiedCurrentNotes")'),
    ('"Slide này chưa có ghi chú thuyết trình."', 't("slides.noCurrentNotes")'),
    ('"Đã xuất deck HTML"', 't("slides.exportedHtml")'),
    ('"Đã xuất đề cương PowerPoint"', 't("slides.exportedOutline")'),
    ('"Đã xuất file .pptx thật"', 't("slides.exportedPptx")'),
    ('"Không thể xuất file .pptx"', 't("slides.exportPptxError")'),
    ('"AI đã rút gọn markdown hiện tại thành deck gọn hơn"', 't("slides.aiSummarized")'),
    ('"AI rút gọn thất bại"', 't("slides.aiSummarizeError")'),
    ('"AI đã viết lại bullet theo giọng văn đã chọn"', 't("slides.aiRewrote")'),
    ('"AI viết lại thất bại"', 't("slides.aiRewriteError")'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
