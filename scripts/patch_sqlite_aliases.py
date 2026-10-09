import sqlite3
import json

db_path = '/home/bakaryuu/.9router/db/data.sqlite'
print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Insert or replace model aliases
    cursor.execute(
        "INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)", 
        ('qwen2.5-coder:7b-instruct', '"ollama-local/qwen2.5-coder:7b-instruct"')
    )
    cursor.execute(
        "INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)", 
        ('qwen3.5:9b', '"ollama-local/qwen3.5:9b"')
    )
    
    conn.commit()
    conn.close()
    print("Successfully added SQLite model aliases!")
except Exception as e:
    print(f"Error patching SQLite database: {e}")
