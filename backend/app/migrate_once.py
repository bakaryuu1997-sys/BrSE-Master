from app.db.session import SessionLocal
from app.api.routes.universal_notes import trigger_migration
import json

db = SessionLocal()
try:
    result = trigger_migration(db)
    print(json.dumps(result, indent=2))
finally:
    db.close()
