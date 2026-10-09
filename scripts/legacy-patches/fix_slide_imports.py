import re

files = [
    "frontend/app/app/slides/SlideAudioScriptPanel.tsx",
    "frontend/app/app/slides/SlideStudioInspector.tsx",
    "frontend/app/app/slides/SlideStudioNavigator.tsx",
    "frontend/app/app/slides/SlideStudioPreview.tsx",
    "frontend/app/app/slides/SlideStudioRibbon.tsx",
    "frontend/app/app/slides/slideCanvas.tsx"
]

for f_path in files:
    with open(f_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "useUiLanguage" not in content:
        # Find the last import line
        lines = content.splitlines()
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith("import "):
                last_import_idx = i
        
        if last_import_idx != -1:
            lines.insert(last_import_idx + 1, 'import { useUiLanguage } from "@/components/LanguageProvider";')
            content = "\n".join(lines)
            with open(f_path, "w", encoding="utf-8") as f:
                f.write(content)

