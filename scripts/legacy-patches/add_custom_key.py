import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('    "glossary.studyMode": "Chế độ học thực chiến",', '    "glossary.studyMode": "Chế độ học thực chiến",\n    "glossary.custom": "tùy chỉnh",')
content = content.replace('    "glossary.studyMode": "Practical Study Mode",', '    "glossary.studyMode": "Practical Study Mode",\n    "glossary.custom": "custom",')
content = content.replace('    "glossary.studyMode": "実践学習モード",', '    "glossary.studyMode": "実践学習モード",\n    "glossary.custom": "カスタム",')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
