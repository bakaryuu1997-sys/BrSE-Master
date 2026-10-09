import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
section = ""
seen = set()

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
    
    match = re.match(r'^(\s*)"([^"]+)":\s*"(.*)",\s*$', line)
    if match:
        indent = match.group(1)
        key = match.group(2)
        value = match.group(3)
        
        if key in seen:
            continue
        seen.add(key)
        
        value = value.replace('\\\\"', '"').replace('\\"', '"')
        value = value.replace('"', '\\"')
        
        new_lines.append(f'{indent}"{key}": "{value}",\n')
    else:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
