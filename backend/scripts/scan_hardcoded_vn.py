import os
from pathlib import Path
import re

vn_regex = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.IGNORECASE)

frontend_dir = Path("/home/bakaryuu/Desktop/MyApp/brse/frontend")

pages_with_hardcoded_vn = []

for root, dirs, files in os.walk(frontend_dir):
    if "node_modules" in root or ".next" in root or "lib/i18n" in root:
        continue
    for file in files:
        if file.endswith(".tsx"):
            full_path = Path(root) / file
            rel_path = full_path.relative_to(frontend_dir)
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Check if it uses useUiLanguage
            uses_i18n = "useUiLanguage" in content or "LocalizedText" in content
            
            # Count Vietnamese lines in jsx or text
            lines = content.splitlines()
            vn_lines = [l.strip() for l in lines if vn_regex.search(l) and not l.strip().startswith("//") and not l.strip().startswith("/*")]
            
            if vn_lines:
                pages_with_hardcoded_vn.append({
                    "path": str(rel_path),
                    "uses_i18n": uses_i18n,
                    "vn_count": len(vn_lines),
                    "samples": vn_lines[:3]
                })

# Sort by vn_count descending
pages_with_hardcoded_vn.sort(key=lambda x: x["vn_count"], reverse=True)

print(f"Total TSX files with hardcoded Vietnamese text: {len(pages_with_hardcoded_vn)}\n")
print(f"{'Path':<50} | {'Uses i18n?':<10} | {'Hardcoded lines'}")
print("-" * 80)
for p in pages_with_hardcoded_vn[:30]:
    print(f"{p['path']:<50} | {str(p['uses_i18n']):<10} | {p['vn_count']}")
    for s in p['samples']:
        print(f"    Sample: {s[:70]}")
