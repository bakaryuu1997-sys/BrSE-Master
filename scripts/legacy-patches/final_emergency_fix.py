with open("frontend/lib/uiLanguage.ts", "rb") as f:
    data = f.read()

# Replace literal backslash (0x5c) followed by double quote (0x22) with just double quote
fixed_data = data.replace(b"\\\"", b"\"")

with open("frontend/lib/uiLanguage.ts", "wb") as f:
    f.write(fixed_data)
