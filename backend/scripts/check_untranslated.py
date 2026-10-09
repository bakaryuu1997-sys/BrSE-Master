import re

def check_untranslated():
    with open("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/ja.ts", "r", encoding="utf-8") as f:
        ja_content = f.read()
    with open("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/en.ts", "r", encoding="utf-8") as f:
        en_content = f.read()
    with open("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/vi.ts", "r", encoding="utf-8") as f:
        vi_content = f.read()

    vn_regex = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.IGNORECASE)

    ja_lines = ja_content.splitlines()
    en_lines = en_content.splitlines()

    ja_vn_count = 0
    en_vn_count = 0

    ja_vn_samples = []
    en_vn_samples = []

    for idx, line in enumerate(ja_lines, start=1):
        if vn_regex.search(line):
            ja_vn_count += 1
            if len(ja_vn_samples) < 10:
                ja_vn_samples.append((idx, line.strip()))

    for idx, line in enumerate(en_lines, start=1):
        if vn_regex.search(line):
            en_vn_count += 1
            if len(en_vn_samples) < 10:
                en_vn_samples.append((idx, line.strip()))

    print(f"Lines in ja.ts with Vietnamese characters: {ja_vn_count}")
    for idx, l in ja_vn_samples:
        print(f"  ja line {idx}: {l}")

    print(f"\nLines in en.ts with Vietnamese characters: {en_vn_count}")
    for idx, l in en_vn_samples:
        print(f"  en line {idx}: {l}")

check_untranslated()
