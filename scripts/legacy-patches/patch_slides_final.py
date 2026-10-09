import re

# Patch all Slides sub-components

# 1. SlideAudioScriptPanel
p1 = "frontend/app/app/slides/SlideAudioScriptPanel.tsx"
with open(p1, "r", encoding="utf-8") as f: c1 = f.read()
if "useUiLanguage" not in c1:
    c1 = c1.replace('import { useDeferredValue, useState } from "react";', 'import { useDeferredValue, useState } from "react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c1 = c1.replace('export function SlideAudioScriptPanel({', 'export function SlideAudioScriptPanel({\n  const { t } = useUiLanguage();')
c1 = c1.replace('{notes.length} {language === "en" ? "lines" : language === "ja" ? "行" : "dòng"}', '{notes.length} {t("slides.lines")}')
c1 = c1.replace(': "Script đọc/ghi âm, có thể đóng/mở để giao diện Slide Studio gọn hơn."}', ': t("slides.scriptDesc")}')
c1 = c1.replace('{language === "en" ? "Copy current" : language === "ja" ? "現在をコピー" : "Copy slide này"}', '{t("slides.copyCurrent")}')
c1 = c1.replace('{language === "en" ? "Copy deck script" : language === "ja" ? "全体台本をコピー" : "Copy toàn bộ script"}', '{t("slides.copyDeckScript")}')
c1 = c1.replace('{language === "en" ? "Read preview" : language === "ja" ? "読み上げプレビュー" : "Preview để đọc"}', '{t("slides.readPreview")}')
with open(p1, "w", encoding="utf-8") as f: f.write(c1)

# 2. SlideStudioHero
p2 = "frontend/app/app/slides/SlideStudioHero.tsx"
with open(p2, "r", encoding="utf-8") as f: c2 = f.read()
c2 = c2.replace('{language === "en" ? "Client-ready deck" : language === "ja" ? "顧客向けデッキ" : "Deck đi khách"}', '{t("slides.clientReady")}')
c2 = c2.replace('{language === "en" ? "Real PPTX export" : language === "ja" ? "実際のPPTX出力" : "Xuất PPTX thật"}', '{t("slides.realPptx")}')
c2 = c2.replace('{language === "en" ? "Turn Markdown into a polished slide deck" : language === "ja" ? "Markdown を見栄えの良いスライドデッキへ" : "Biến Markdown thành deck chuyên nghiệp"}', '{t("slides.turnMarkdown")}')
c2 = c2.replace(': "Giao diện này đã đồng bộ với visual dark/glass của BrSE. Mục tiêu là làm deck nhanh, dễ đọc, và đủ đẹp để đem đi khách trước khi polish cuối trong PowerPoint nếu cần."}', ': t("slides.heroDescription")}')
c2 = c2.replace('`${diagnostics.totalBullets} bullet · ${diagnostics.slidesWithNotes}/${slideCount || 1} slide có ghi chú`', '`${diagnostics.totalBullets} ${t("slides.bullets")} · ${diagnostics.slidesWithNotes}/${slideCount || 1} ${t("slides.notesSummary")}`')
c2 = c2.replace('{language === "en" ? "Built-in structure blocks: cover, divider, appendix, and quick insert buttons." : language === "ja" ? "表紙、区切り、付録の構造ブロックと、対応するクイック挿入ボタンを用意しています。" : "Đã có sẵn: `cover`, `divider`, `appendix` và các nút tạo nhanh tương ứng."}', '{t("slides.structureHint")}')
c2 = c2.replace('{language === "en" ? "There is no 3-slide limit. Add freely with `#`, `---`, or the structure buttons." : language === "ja" ? "3枚制限はありません。`#`、`---`、または構造ボタンで自由に追加できます。" : "Không giới hạn 3 slide. Bạn thêm tự do bằng `#`, `---`, hoặc các nút dựng sẵn."}', '{t("slides.unlimitedHint")}')
with open(p2, "w", encoding="utf-8") as f: f.write(c2)

# 3. SlideStudioInspector
p3 = "frontend/app/app/slides/SlideStudioInspector.tsx"
with open(p3, "r", encoding="utf-8") as f: c3 = f.read()
if "useUiLanguage" not in c3:
    c3 = c3.replace('import { Palette, Layers, Box, Sparkles, Wand2, Download, Terminal, Settings2, Trash2, Eye, EyeOff, LayoutPanelTop, CheckCircle2, AlertTriangle, Presentation } from "lucide-react";', 'import { Palette, Layers, Box, Sparkles, Wand2, Download, Terminal, Settings2, Trash2, Eye, EyeOff, LayoutPanelTop, CheckCircle2, AlertTriangle, Presentation } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c3 = c3.replace('export function SlideStudioInspector({', 'export function SlideStudioInspector({\n  const { t } = useUiLanguage();')
c3 = c3.replace(': "Cột phải tập trung vào slide đang chọn, nhận diện deck, AI và export. Theme và template đã chuyển sang cột trái để giống editor slide hơn."}', ': t("slides.inspectorDesc")}')
c3 = c3.replace('{language === "en" ? "Deck identity" : language === "ja" ? "デッキ情報" : "Nhận diện deck"}', '{t("slides.deckIdentity")}')
c3 = c3.replace('{language === "en" ? "Client name" : language === "ja" ? "顧客名" : "Tên khách hàng"}', '{t("slides.clientName")}')
c3 = c3.replace('{language === "en" ? "Report date" : language === "ja" ? "報告日" : "Ngày báo cáo"}', '{t("slides.reportDate")}')
c3 = c3.replace('{language === "en" ? "Logo mark" : language === "ja" ? "ロゴ表記" : "Ký hiệu logo"}', '{t("slides.logoMark")}')
c3 = c3.replace('{language === "en" ? "Footer" : language === "ja" ? "フッター" : "Chân trang"}', '{t("slides.footer")}')
c3 = c3.replace('{language === "en" ? "Show page numbers on preview and export" : language === "ja" ? "プレビューと書き出しでページ番号を表示" : "Hiện số trang trên preview và export"}', '{t("slides.showPageNumbers")}')
c3 = c3.replace('{language === "en" ? "Visual diagnostics" : language === "ja" ? "ビジュアル診断" : "Chẩn đoán hình ảnh"}', '{t("slides.visualDiagnostics")}')
c3 = c3.replace('{language === "en" ? "Confirm & Finish" : language === "ja" ? "インスペクターと仕上げ" : "Xác nhận & Hoàn thiện"}', '{t("slides.inspectorFinish")}')
with open(p3, "w", encoding="utf-8") as f: f.write(c3)

# 4. SlideStudioNavigator
p4 = "frontend/app/app/slides/SlideStudioNavigator.tsx"
with open(p4, "r", encoding="utf-8") as f: c4 = f.read()
if "useUiLanguage" not in c4:
    c4 = c4.replace('import { Search, Plus, Trash2, Layout, Layers, Palette, FolderPlus, GripVertical, FileCode } from "lucide-react";', 'import { Search, Plus, Trash2, Layout, Layers, Palette, FolderPlus, GripVertical, FileCode } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c4 = c4.replace('export function SlideStudioNavigator({', 'export function SlideStudioNavigator({\n  const { t } = useUiLanguage();')
c4 = c4.replace(': "Cột trái để duyệt slide, đổi theme và nạp mẫu nhanh."}', ': t("slides.navigatorDesc")}')
c4 = c4.replace('placeholder={language === "ja" ? "タイトル・内容を検索..." : language === "en" ? "Search title, content..." : "Tìm tiêu đề, nội dung..."}', 'placeholder={t("slides.searchPlaceholder")}')
c4 = c4.replace('{language === "en" ? "No slides match the filter." : language === "ja" ? "該当するスライドはありません。" : "Không có slide nào khớp bộ lọc."}', '{t("slides.noSlidesMatch")}')
c4 = c4.replace('{language === "en" ? "Select theme" : language === "ja" ? "テーマを選択" : "Chọn giao diện"}', '{t("slides.selectTheme")}')
c4 = c4.replace('{language === "en" ? "Load template" : language === "ja" ? "テンプレートを読み込む" : "Nạp mẫu có sẵn"}', '{t("slides.loadTemplate")}')
with open(p4, "w", encoding="utf-8") as f: f.write(c4)

# 5. SlideStudioRibbon
p5 = "frontend/app/app/slides/SlideStudioRibbon.tsx"
with open(p5, "r", encoding="utf-8") as f: c5 = f.read()
if "useUiLanguage" not in c5:
    c5 = c5.replace('import { Box, Plus, Trash2, Download, Sparkles, Wand2, FileCode, Presentation, Copy, FileText, Maximize2, Minimize2, ListTree, History, FolderOpen } from "lucide-react";', 'import { Box, Plus, Trash2, Download, Sparkles, Wand2, FileCode, Presentation, Copy, FileText, Maximize2, Minimize2, ListTree, History, FolderOpen } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c5 = c5.replace('export function SlideStudioRibbon({', 'export function SlideStudioRibbon({\n  const { t } = useUiLanguage();')
c5 = c5.replace('label: language === "ja" ? "挿入" : language === "en" ? "Insert" : "Chèn"', 'label: t("slides.ribbonInsert")')
c5 = c5.replace('label: language === "ja" ? "デッキ" : language === "en" ? "Deck" : "Deck"', 'label: t("slides.ribbonDeck")')
c5 = c5.replace('label: language === "ja" ? "表示" : language === "en" ? "View" : "Xem"', 'label: t("slides.ribbonView")')
c5 = c5.replace('label: language === "ja" ? "書き出し" : language === "en" ? "Export" : "Xuất"', 'label: t("slides.ribbonExport")')
c5 = c5.replace('tooltip: language === "ja" ? "自動生成" : language === "en" ? "Auto" : "Tự động"', 'tooltip: t("slides.ribbonAuto")')
c5 = c5.replace('tooltip: language === "ja" ? "現在" : language === "en" ? "Current" : "Hiện tại"', 'tooltip: t("slides.ribbonCurrent")')
c5 = c5.replace('tooltip: language === "ja" ? "アウトライン" : language === "en" ? "Outline" : "Đề cương"', 'tooltip: t("slides.ribbonOutline")')
c5 = c5.replace('tooltip: language === "ja" ? "PPTX" : language === "en" ? "PPTX" : "PPTX"', 'tooltip: t("slides.ribbonPptx")')
with open(p5, "w", encoding="utf-8") as f: f.write(c5)

# 6. slideCanvas
p6 = "frontend/app/app/slides/slideCanvas.tsx"
with open(p6, "r", encoding="utf-8") as f: c6 = f.read()
if "useUiLanguage" not in c6:
    c6 = c6.replace('import { type Slide, type SlideLayoutId, type SlideThemeId, slideLayouts } from "@/lib/slideStudio";', 'import { type Slide, type SlideLayoutId, type SlideThemeId, slideLayouts } from "@/lib/slideStudio";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c6 = c6.replace('export function SlideCanvas({', 'export function SlideCanvas({\n  const { t } = useUiLanguage();')
c6 = c6.replace(': "Sửa trực tiếp từng trường của slide và xem preview lớn ngay lập tức."}', ': t("slides.canvasDesc")}')
c6 = c6.replace('placeholder="VD: Báo cáo tuần 1"', 'placeholder={t("slides.fieldTitlePlaceholder")}')
c6 = c6.replace('placeholder="Nhập nội dung..."', 'placeholder={t("slides.fieldBodyPlaceholder")}')
c6 = c6.replace('placeholder="Phụ đề (tùy chọn)"', 'placeholder={t("slides.fieldSubtitlePlaceholder")}')
c6 = c6.replace('placeholder="Ghi chú thuyết trình..."', 'placeholder={t("slides.fieldNotesPlaceholder")}')
with open(p6, "w", encoding="utf-8") as f: f.write(c6)

# 7. SlideStudioPreview
p7 = "frontend/app/app/slides/SlideStudioPreview.tsx"
with open(p7, "r", encoding="utf-8") as f: c7 = f.read()
if "useUiLanguage" not in c7:
    c7 = c7.replace('import { Presentation, Maximize2, Minimize2, Eye, EyeOff, LayoutPanelTop, Download, Copy, FileText, ChevronLeft, ChevronRight, ScreenShare, Sparkles, MessageSquare, ListTree } from "lucide-react";', 'import { Presentation, Maximize2, Minimize2, Eye, EyeOff, LayoutPanelTop, Download, Copy, FileText, ChevronLeft, ChevronRight, ScreenShare, Sparkles, MessageSquare, ListTree } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    c7 = c7.replace('export function SlideStudioPreview({', 'export function SlideStudioPreview({\n  const { t } = useUiLanguage();')
c7 = c7.replace(': "Xem trước slide thực tế theo theme đã chọn."}', ': t("slides.previewDesc")}')
c7 = c7.replace('label: language === "ja" ? "デッキ全体レビューモード" : language === "en" ? "Full deck review mode" : "Chế độ rà toàn bộ deck"', 'label: t("slides.fullDeckReview")')
with open(p7, "w", encoding="utf-8") as f: f.write(c7)
