import json
import logging
import os
import sys

# Add backend to sys.path so the module can also be run directly as a script
# (`python app/migrate_glossary.py`) without installing the package.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine
from app.db.base_class import Base
from app.models.glossary import GlossaryTerm

logger = logging.getLogger(__name__)

SEEDS_DIR = os.path.join(os.path.dirname(__file__), "seeds")


def iter_seed_batches():
    """Yield (filename, terms) for each glossary_batch_*.json seed file in order."""
    if not os.path.exists(SEEDS_DIR):
        logger.warning("Glossary seeds directory not found: %s", SEEDS_DIR)
        return

    batch_files = sorted(
        f
        for f in os.listdir(SEEDS_DIR)
        if f.startswith("glossary_batch_") and f.endswith(".json")
    )
    if not batch_files:
        logger.warning("No glossary batch files found in %s", SEEDS_DIR)
        return

    for batch_file in batch_files:
        path = os.path.join(SEEDS_DIR, batch_file)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            logger.error("Failed to read glossary seed %s: %s", batch_file, exc)
            continue
        if isinstance(data, list):
            yield batch_file, data


def _apply_term(db, data) -> bool:
    """Upsert one seed term by id. Returns True when a new row was added."""
    existing = db.query(GlossaryTerm).filter(GlossaryTerm.id == data["id"]).first()
    if existing:
        existing.english = data["english"]
        existing.japanese = data["japanese"]
        existing.kana = data.get("kana")
        existing.vietnamese = data["vietnamese"]
        existing.roles = data["roles"]
        existing.category = data["category"]
        existing.note = data.get("note")
        existing.example = data.get("example")
        return False

    db.add(
        GlossaryTerm(
            id=data["id"],
            english=data["english"],
            japanese=data["japanese"],
            kana=data.get("kana"),
            vietnamese=data["vietnamese"],
            roles=data["roles"],
            category=data["category"],
            note=data.get("note"),
            example=data.get("example"),
        )
    )
    return True


def seed_glossary(db=None) -> int:
    """Idempotent upsert of all bundled glossary seed terms.

    Existing terms (matched by id) are refreshed; missing ones are inserted.
    Each batch commits independently so one bad batch cannot lose the rest.
    Returns the number of newly added terms.
    """
    Base.metadata.create_all(bind=engine)

    owns_session = db is None
    if owns_session:
        db = SessionLocal()

    total_added = 0
    try:
        for batch_file, terms_data in iter_seed_batches():
            try:
                for data in terms_data:
                    if _apply_term(db, data):
                        total_added += 1
                db.commit()
            except Exception as exc:  # pragma: no cover - per-batch resilience
                logger.error("Error processing %s: %s", batch_file, exc)
                db.rollback()
    finally:
        if owns_session:
            db.close()

    logger.info("Glossary seed completed. Added %s new terms.", total_added)
    return total_added


def seed_glossary_if_empty(db=None) -> int:
    """Seed the glossary only when the table is empty.

    This is the startup guard: after a DB volume reset the table is empty and we
    restore the bundled terms, but on an established DB we leave it alone so we
    never resurrect terms the user deliberately deleted, and startup stays cheap.
    Returns the number of terms added (0 when the table already has data).
    """
    Base.metadata.create_all(bind=engine)

    owns_session = db is None
    if owns_session:
        db = SessionLocal()

    try:
        existing_count = db.query(GlossaryTerm).count()
        if existing_count > 0:
            logger.info(
                "Glossary already has %s terms; skipping startup seed.",
                existing_count,
            )
            return 0
        logger.info("Glossary table is empty; seeding bundled terms...")
        return seed_glossary(db=db)
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_glossary()
