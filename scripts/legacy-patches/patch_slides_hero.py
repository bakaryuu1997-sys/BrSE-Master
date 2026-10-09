import re

file_path = "frontend/app/app/slides/SlideStudioHero.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
if "useUiLanguage" not in content:
    content = content.replace(
        'import type { UiLanguage } from "@/lib/uiLanguage";',
        'import { useUiLanguage } from "@/components/LanguageProvider";\nimport type { UiLanguage } from "@/lib/uiLanguage";'
    )

# Add hook
if "const { t } = useUiLanguage();" not in content:
    content = content.replace(
        'export function SlideStudioHero({',
        'export function SlideStudioHero({\n  const { t } = useUiLanguage();'
    )

# Replacements
replacements = [
    ('>Markdown thành deck đi khách<', '>{t("slides.heroTitle")}<'),
    ('>Hệ sinh thái Deck<', '>{t("slides.deckOrbit")}<'),
    (' {analysis.totalSlides} slides', ' {analysis.totalSlides} {t("slides.slidesCount")}'),
    (' {analysis.bulletsCount} bullet', ' {analysis.bulletsCount} {t("slides.bullets")}'),
    (' {analysis.slidesWithNotes} slides có notes', ' {analysis.slidesWithNotes} {t("slides.notesSummary")}'),
    ('>Deck Health<', '>{t("slides.deckHealth")}<'),
    ('>Sân khấu trình diễn<', '>{t("slides.workspaceStage")}<'),
    ('{language === "ja" ? "ショートカット: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`." : language === "en" ? "Shortcuts: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`." : "Phím tắt nhanh: `Ctrl/Cmd+K`, `Ctrl/Cmd+Shift+N`, `Ctrl/Cmd+D`, `Alt+↑/↓`, `Ctrl/Cmd+1/2`."}', '{t("slides.shortcuts")}'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
