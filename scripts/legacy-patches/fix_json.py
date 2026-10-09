import re

file_path = "frontend/lib/uiLanguage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Match lines like: "key": "value",
    match = re.match(r'^(\s*"[^"]+":\s*)"(.*)",(\s*)$', line)
    if match:
        prefix = match.group(1)
        value = match.group(2)
        suffix = match.group(3)
        # First, unescape everything to be sure
        value = value.replace('\\"', '"')
        # Then escape once
        value = value.replace('"', '\\"')
        new_lines.append(f'{prefix}"{value}",{suffix}\n')
    else:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
