import re

# Patch remaining modals

# 1. MeetingChatModal
path1 = "frontend/components/MeetingChatModal.tsx"
with open(path1, "r", encoding="utf-8") as f: content = f.read()
if "useUiLanguage" not in content:
    content = content.replace('import { Bot, MessageSquare, X, Send, Loader2 } from "lucide-react";', 'import { Bot, MessageSquare, X, Send, Loader2 } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    content = content.replace('export function MeetingChatModal({', 'export function MeetingChatModal({\n  const { t } = useUiLanguage();')
content = content.replace('>Chat with Meeting<', '>{t("modals.chatTitle")}<')
content = content.replace('>Close<', '>{t("modals.close")}<')
with open(path1, "w", encoding="utf-8") as f: f.write(content)

# 2. MeetingMemoModal
path2 = "frontend/components/MeetingMemoModal.tsx"
with open(path2, "r", encoding="utf-8") as f: content = f.read()
if "useUiLanguage" not in content:
    content = content.replace('import { FileText, X, Save, Copy, Check, Loader2, Sparkles, Wand2, History, RotateCcw, AlertCircle, Trash2 } from "lucide-react";', 'import { FileText, X, Save, Copy, Check, Loader2, Sparkles, Wand2, History, RotateCcw, AlertCircle, Trash2 } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    content = content.replace('export function MeetingMemoModal({', 'export function MeetingMemoModal({\n  const { t } = useUiLanguage();')
content = content.replace('>Meeting Memo<', '>{t("modals.memoTitle")}<')
content = content.replace('>Lưu<', '>{t("modals.save")}<')
content = content.replace('>Hủy<', '>{t("modals.cancel")}<')
with open(path2, "w", encoding="utf-8") as f: f.write(content)

# 3. VideoTrimModal
path3 = "frontend/components/VideoTrimModal.tsx"
with open(path3, "r", encoding="utf-8") as f: content = f.read()
if "useUiLanguage" not in content:
    content = content.replace('import { Scissors, X, Play, Pause, Loader2, Save } from "lucide-react";', 'import { Scissors, X, Play, Pause, Loader2, Save } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    content = content.replace('export function VideoTrimModal({', 'export function VideoTrimModal({\n  const { t } = useUiLanguage();')
content = content.replace('>Trim Video<', '>{t("modals.trimTitle")}<')
content = content.replace('>Hủy<', '>{t("modals.cancel")}<')
with open(path3, "w", encoding="utf-8") as f: f.write(content)

# 4. GlobalCommandPalette
path4 = "frontend/components/GlobalCommandPalette.tsx"
with open(path4, "r", encoding="utf-8") as f: content = f.read()
if "useUiLanguage" not in content:
    content = content.replace('import { Command, Search, Sparkles, MessageSquare, ListTodo, Calendar, BarChart3, ChevronRight, Loader2, Bot } from "lucide-react";', 'import { Command, Search, Sparkles, MessageSquare, ListTodo, Calendar, BarChart3, ChevronRight, Loader2, Bot } from "lucide-react";\nimport { useUiLanguage } from "@/components/LanguageProvider";')
    content = content.replace('export function GlobalCommandPalette() {', 'export function GlobalCommandPalette() {\n  const { t } = useUiLanguage();')
content = content.replace('placeholder="Tìm lệnh..."', 'placeholder={t("palette.search")}')
with open(path4, "w", encoding="utf-8") as f: f.write(content)
