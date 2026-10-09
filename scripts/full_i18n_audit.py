import os
import re

vn_pattern = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

excluded_dirs = ["node_modules", ".next", "out", "build", "dist", ".git"]
excluded_files = ["vi.ts"] # vi.ts is the Vietnamese dictionary itself

results = []

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
                            results.append((file_path, line_no, stripped))
            except Exception as e:
                pass

print(f"Total untranslated occurrences found: {len(results)}")
for file_path, line_no, text in results:
    print(f"{file_path}:{line_no}: {text}")
