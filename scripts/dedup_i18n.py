import re

def clean_file(lang):
    file_path = f"frontend/lib/i18n/{lang}.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header = []
    footer = []
    key_lines = {}
    
    in_dict = False
    pattern = re.compile(r'^\s*"([^"]+)":\s*(.*)$')
    
    for line in lines:
        if not in_dict:
            header.append(line)
            if "export const " in line and "= {" in line:
                in_dict = True
        else:
            if line.strip().startswith("} as const;"):
                footer.append(line)
                in_dict = False
            else:
                m = pattern.match(line)
                if m:
                    k = m.group(1)
                    # keep the latest value if duplicate
                    key_lines[k] = line
                else:
                    if line.strip() == "":
                        continue
                    # might be comment or other line
                    # we can ignore or preserve
    
    # Reassemble sorted
    result = []
    result.extend(header)
    for k in sorted(key_lines.keys()):
        result.append(key_lines[k])
    result.extend(footer)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(result)
        
    print(f"{lang}.ts: {len(key_lines)} unique keys written.")

for l in ["vi", "en", "ja"]:
    clean_file(l)
