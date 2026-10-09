import re

vn_pattern = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

for lang in ["en", "ja"]:
    print(f"=== {lang}.ts ===")
    with open(f"frontend/lib/i18n/{lang}.ts", "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            if vn_pattern.search(line):
                print(f"{idx}: {line.strip()}")
