"""Validate the bundled glossary seed batches.

Scans every ``glossary_batch_*.json`` in the seeds directory and enforces the
invariants that keep ``app.migrate_glossary`` safe to run on a fresh database:

- each file is a JSON array of objects with the required keys
- ids are globally unique across all batch files
- (japanese, english) pairs are globally unique across all batch files
  (the DB has a UNIQUE(japanese, english) constraint, so a duplicate pair with
  a different id would make a whole batch roll back during seeding)

Optionally also checks collisions against a live database when pair/id dumps are
provided (used by check_glossary_seed.sh before a manual load).

Usage:
    python3 scripts/check_glossary_seed.py [seeds_dir]
        [--db-pairs FILE] [--db-ids FILE]

Exits non-zero if any blocking problem is found.
"""

import argparse
import glob
import json
import os

REQUIRED = ("id", "english", "japanese", "vietnamese", "category", "roles")
DEFAULT_SEEDS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "backend",
    "app",
    "seeds",
)


def _norm(value) -> str:
    return str(value or "").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seeds_dir", nargs="?", default=DEFAULT_SEEDS_DIR)
    parser.add_argument("--db-pairs", help="TSV dump: japanese<TAB>english per line")
    parser.add_argument("--db-ids", help="text dump: one existing term id per line")
    args = parser.parse_args()

    batch_files = sorted(glob.glob(os.path.join(args.seeds_dir, "glossary_batch_*.json")))
    if not batch_files:
        print(f"ERROR: no glossary_batch_*.json found in {args.seeds_dir}")
        return 1

    problems = []
    ids_seen = {}  # id -> file
    pairs_seen = {}  # (jp, en) -> file
    total = 0

    for path in batch_files:
        name = os.path.basename(path)
        try:
            with open(path, encoding="utf-8") as handle:
                terms = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            problems.append(f"{name}: cannot parse JSON ({exc})")
            continue
        if not isinstance(terms, list):
            problems.append(f"{name}: root is not a JSON array")
            continue

        for idx, term in enumerate(terms):
            total += 1
            if not isinstance(term, dict):
                problems.append(f"{name}#{idx}: entry is not an object")
                continue
            missing = [k for k in REQUIRED if not term.get(k)]
            if missing:
                problems.append(f"{name}#{idx} ({term.get('id', '?')}): missing {missing}")
            if "roles" in term and not isinstance(term["roles"], list):
                problems.append(f"{name}#{idx} ({term.get('id', '?')}): roles is not a list")

            tid = term.get("id")
            if tid in ids_seen:
                problems.append(f"duplicate id '{tid}' in {name} and {ids_seen[tid]}")
            else:
                ids_seen[tid] = name

            pair = (_norm(term.get("japanese")), _norm(term.get("english")))
            if pair[0] and pair[1]:
                if pair in pairs_seen:
                    problems.append(
                        f"duplicate (jp,en) pair {pair} in {name} and {pairs_seen[pair]}"
                    )
                else:
                    pairs_seen[pair] = name

    # Optional: collisions against a live DB dump.
    if args.db_pairs and args.db_ids:
        db_pairs = set()
        with open(args.db_pairs, encoding="utf-8") as handle:
            for line in handle:
                line = line.rstrip("\n")
                if "\t" in line:
                    jp, en = line.split("\t", 1)
                    db_pairs.add((jp.strip(), en.strip()))
        with open(args.db_ids, encoding="utf-8") as handle:
            db_ids = {line.strip() for line in handle if line.strip()}

        # A seed entry whose id is not yet in the DB is an INSERT. If its
        # (jp,en) pair already exists in the DB, that insert hits the UNIQUE
        # constraint and rolls the batch back. (An existing id is an update.)
        for path in batch_files:
            try:
                with open(path, encoding="utf-8") as handle:
                    terms = json.load(handle)
            except (OSError, json.JSONDecodeError):
                continue
            for term in terms if isinstance(terms, list) else []:
                pair = (_norm(term.get("japanese")), _norm(term.get("english")))
                tid = term.get("id")
                if pair in db_pairs and tid not in db_ids:
                    problems.append(
                        f"seed '{tid}' would INSERT pair {pair} that already exists in DB"
                    )

    print(f"scanned {len(batch_files)} batch files, {total} terms")
    if problems:
        print("BLOCKING PROBLEMS:")
        for p in problems:
            print(" -", p)
        return 1

    print("OK: required keys present, globally unique ids and (jp,en) pairs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
