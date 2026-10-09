import re
import json

def extract_keys(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Match "key.name": or 'key.name':
    keys = {}
    matches = re.findall(r'^\s*["\']([^"\']+)["\']\s*:\s*(["\'].*?["\']|[^\n,]+)', content, re.MULTILINE)
    for k, v in matches:
        keys[k] = v.strip()
    return keys

vi_keys = extract_keys("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/vi.ts")
en_keys = extract_keys("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/en.ts")
ja_keys = extract_keys("/home/bakaryuu/Desktop/MyApp/brse/frontend/lib/i18n/ja.ts")

print(f"Total keys in vi.ts: {len(vi_keys)}")
print(f"Total keys in en.ts: {len(en_keys)}")
print(f"Total keys in ja.ts: {len(ja_keys)}")

all_keys = set(vi_keys.keys()) | set(en_keys.keys()) | set(ja_keys.keys())
print(f"Total unique keys across all 3: {len(all_keys)}")

missing_in_vi = all_keys - set(vi_keys.keys())
missing_in_en = all_keys - set(en_keys.keys())
missing_in_ja = all_keys - set(ja_keys.keys())

print(f"\nMissing in vi: {len(missing_in_vi)}")
if missing_in_vi:
    print("Sample missing in vi:", list(missing_in_vi)[:15])

print(f"\nMissing in en: {len(missing_in_en)}")
if missing_in_en:
    print("Sample missing in en:", list(missing_in_en)[:15])

print(f"\nMissing in ja: {len(missing_in_ja)}")
if missing_in_ja:
    print("Sample missing in ja:", list(missing_in_ja)[:15])
