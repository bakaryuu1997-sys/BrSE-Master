import sys

def search(query, lang="vi"):
    with open(f"frontend/lib/i18n/{lang}.ts", "r", encoding="utf-8") as f:
        for line in f:
            if query.lower() in line.lower():
                print(line.strip())

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "operation"
    l = sys.argv[2] if len(sys.argv) > 2 else "vi"
    search(q, l)


