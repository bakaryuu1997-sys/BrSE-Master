import sys
import re

vn_pattern = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

file_paths = sys.argv[1:] if len(sys.argv) > 1 else [
    "frontend/features/reports/ReportsDailyBuilder.tsx",
    "frontend/features/operations/OperationsWorkSurface.tsx",
    "frontend/components/meeting/MeetingHistory.tsx",
    "frontend/components/specs-mindmap/NodeEditModal.tsx",
]

for p in file_paths:
    print(f"=== {p} ===")
    try:
        with open(p, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f, 1):
                s = line.strip()
                if s.startswith("//") or s.startswith("/*") or s.startswith("*"):
                    continue
                if vn_pattern.search(line):
                    print(f"  L{idx:4d}: {s}")
    except Exception as e:
        print(f"Error reading {p}: {e}")
