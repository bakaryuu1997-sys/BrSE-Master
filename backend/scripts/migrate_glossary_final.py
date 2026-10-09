import os
import sqlite3
import sys

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
from app.models.glossary import GlossaryTerm
from app.migrate_glossary import seed_glossary

def migrate_and_clean():
    print(f"🔍 Using Database URL: {settings.database_url}")
    print("🚀 Starting Glossary Database Sanity Migration...")
    
    # 1. Drop existing table to apply new schema (Unique Constraints)
    # SQLite doesn't support ALTER TABLE for constraints well.
    with engine.connect() as conn:
        print("🗑️ Dropping old glossary_terms table...")
        conn.execute(text("DROP TABLE IF EXISTS glossary_terms"))
        conn.commit()
    
    # 2. Recreate table with new schema
    print("🛠️ Recreating glossary_terms table with Unique Constraints...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Re-seed from the freshly cleaned batch files
    print("🌱 Re-seeding data from cleaned batch files...")
    seed_glossary()
    
    print("✅ Glossary Migration Complete!")

if __name__ == "__main__":
    migrate_and_clean()
