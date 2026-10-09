import os
import re

vn_pattern = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

matches = {}
for root_dir in ["frontend/app", "frontend/components", "frontend/features"]:
    for root, dirs, files in os.walk(root_dir):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
        for f in files:
            if f.endswith((".tsx", ".ts")):
                p = os.path.join(root, f)
                with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                    for idx, line in enumerate(fp, 1):
                        stripped = line.strip()
                        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                            continue
                        if vn_pattern.search(line):
                            matches.setdefault(p, []).append((idx, stripped))

for p, lines in sorted(matches.items()):
    print(f"{p} ({len(lines)} lines)")
