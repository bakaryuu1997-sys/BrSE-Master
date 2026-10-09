import re

def parse_keys(filepath):
    keys = {}
    pattern = re.compile(r'^\s*"([^"]+)":\s*(.*)$')
    with open(filepath, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            m = pattern.match(line)
            if m:
                k = m.group(1)
                v = m.group(2).rstrip(",\n\r")
                keys[k] = (idx, v)
    return keys

vi_keys = parse_keys("frontend/lib/i18n/vi.ts")
en_keys = parse_keys("frontend/lib/i18n/en.ts")
ja_keys = parse_keys("frontend/lib/i18n/ja.ts")

print(f"VI keys: {len(vi_keys)}")
print(f"EN keys: {len(en_keys)}")
print(f"JA keys: {len(ja_keys)}")

missing_in_en = set(vi_keys) - set(en_keys)
missing_in_ja = set(vi_keys) - set(ja_keys)
extra_in_en = set(en_keys) - set(vi_keys)
extra_in_ja = set(ja_keys) - set(vi_keys)

print(f"Missing in EN: {len(missing_in_en)}")
print(f"Missing in JA: {len(missing_in_ja)}")
print(f"Extra in EN: {len(extra_in_en)}")
print(f"Extra in JA: {len(extra_in_ja)}")
