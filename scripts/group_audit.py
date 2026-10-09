import os
import re
from collections import defaultdict

vn_pattern = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

excluded_dirs = ["node_modules", ".next", "out", "build", "dist", ".git"]
excluded_files = ["vi.ts", "inject_translations.py", "full_i18n_audit.py", "group_audit.py"]

by_file = defaultdict(list)

for root, dirs, files in os.walk("frontend"):
    dirs[:] = [d for d in dirs if d not in excluded_dirs]
    for file in files:
        if file.endswith((".tsx", ".ts")) and file not in excluded_files:
            file_path = os.path.join(root, file).replace("\\", "/")
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_no, line in enumerate(f, 1):
                        stripped = line.strip()
                        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                            continue
                        if vn_pattern.search(line):
                            by_file[file_path].append((line_no, stripped))
            except Exception:
                pass

for f, lines in sorted(by_file.items(), key=lambda x: -len(x[1])):
    print(f"{f}: {len(lines)} lines")
