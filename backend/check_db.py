import sqlite3
import json

try:
    conn = sqlite3.connect('brse.db')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM glossary_terms')
    count = cursor.fetchone()[0]
    print(f"Total glossary terms: {count}")
    
    cursor.execute('SELECT id, english, japanese, vietnamese, category FROM glossary_terms LIMIT 5')
    rows = cursor.fetchall()
    print("First 5 terms:")
    for r in rows:
        print(f" - ID: {r[0]}, EN: {r[1]}, JP: {r[2]}, VI: {r[3]}, Cat: {r[4]}")
    conn.close()
except Exception as e:
    print(f"Error checking database: {e}")
