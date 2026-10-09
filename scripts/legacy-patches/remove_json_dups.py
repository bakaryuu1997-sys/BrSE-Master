import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

seen = set()
new_lines = []

section = ""
for line in lines:
    if "vi: {" in line:
        section = "vi"
        seen = set()
    elif "en: {" in line:
        section = "en"
        seen = set()
    elif "ja: {" in line:
        section = "ja"
        seen = set()
    
    match = re.match(r'^\s*"([^"]+)":', line)
    if match:
        key = match.group(1)
        if key in seen:
            continue
        seen.add(key)
    
    new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
