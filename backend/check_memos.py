import sqlite3
import os

print("=== Scanning all tables in brse.db ===")
conn = sqlite3.connect("brse.db")
c = conn.cursor()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
for t in tables:
    count = c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    if count > 0:
        print(f"  Table {t}: {count} rows")
conn.close()

print("\n=== Scanning backend/memos folder ===")
if os.path.exists("memos"):
    files = os.listdir("memos")
    print("Files in memos/:", len(files), files[:10])
else:
    print("memos/ does not exist")
