# BrSE OS Database Migration Blueprint

This document defines the schema migration policy and technical transition plan for the BrSE OS FastAPI backend, moving from startup DDL patching toward a robust, explicit migration model.

---

## 1. Context & Motivation

### The Current State
Currently, database schema initialization and updates are handled inside `backend/app/main.py` using helper functions `ensure_project_settings_schema()` and `ensure_todo_items_schema()` which execute raw SQL `ALTER TABLE` commands on startup:
* **Risks**:
  * Diff checks are run on every HTTP app startup, adding overhead.
  * Structural alterations (DDL) bypass transaction isolation in SQLite.
  * No version history, rollback tracking, or multi-environment baseline synchronization exists.
  * Bypasses traditional staging verification gates.

---

## 2. Canonical Migration Engine: Alembic

We select **Alembic** as the canonical database migration engine for BrSE OS. Alembic is the standard choice for FastAPI/SQLAlchemy stacks, supporting auto-generation of migrations by diffing current declarative SQLAlchemy models against the target database schema.

---

## 3. Transition & Implementation Roadmap

### Step 1: Install & Baseline Packages
Add Alembic dependencies to the backend environment by updating `backend/requirements.txt`:
```text
alembic==1.13.1
```

### Step 2: Initialize Alembic Structure
Run the initialization command from the `backend/` directory:
```bash
alembic init migrations
```
This generates the following files:
* `alembic.ini`: Configuration file containing database URL and logger setups.
* `migrations/env.py`: Python script run whenever Alembic is invoked.

### Step 3: Configure `migrations/env.py`
To support auto-generation, update `migrations/env.py` to import SQLAlchemy base metadata:
```python
from app.db.base_class import Base
# Import all database models to register them on metadata
from app.models.operation import OperationRecord
from app.models.report import ReportRecord
from app.models.todo import BrseTodoItemRecord, BrseTodoProjectRecord
# Set target metadata
target_metadata = Base.metadata
```

Dynamically configure the database URL inside `env.py` by pulling settings from our core config:
```python
from app.core.config import settings

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    if configuration:
        configuration["sqlalchemy.url"] = settings.database_url
    ...
```

### Step 4: Establish the Baseline
Before generating new migrations, establish a **baseline revision** corresponding to the schema current at the time of migration setup:
```bash
alembic revision --autogenerate -m "baseline_schema"
```
This baseline is applied to existing production/local SQLite files without executing destructive operations by marking it as completed:
```bash
alembic stamp head
```

### Step 5: Deprecate Inline main.py DDL Checks — DONE (2026-06-11)
Both manual startup patches (`ensure_todo_items_schema`, then
`ensure_project_settings_schema`) have been removed from `backend/app/main.py`.
The project_settings column patch now lives in migration
`20260531_0004_project_settings_profile_columns.py` (guarded/idempotent).

Runtime bootstrap is now: `init_db()` runs `alembic upgrade head`
programmatically (built without `alembic.ini` so it does not clobber the app
loggers), then `Base.metadata.create_all` as a safety net for brand-new model
tables that do not yet have a dedicated migration. `create_all` only creates
missing tables and never alters them, so it does not reintroduce hidden DDL
patching. Covered by `tests/test_migrations.py`.

---

## 4. Operational Best Practices

### Creating a New Migration
When making changes to SQLAlchemy models (e.g., adding a new field in `BrseTodoItemRecord`):
1. **Auto-generate migration**:
   ```bash
   alembic revision --autogenerate -m "add_new_todo_field"
   ```
2. **Review the script**: Inspect the generated file under `migrations/versions/` to verify it maps correctly.
3. **Apply the change**:
   ```bash
   alembic upgrade head
   ```

### Rolling Back Changes
If a migration fails or causes regression, roll back to the previous revision:
```bash
alembic downgrade -1
```

### Verification Gate
Integrate the Alembic check into local verification pipelines to prevent unmigrated schema drifts from slipping into master:
```bash
alembic check
```
If models and database are out of sync, the gate will fail, instructing the developer to generate a new migration revision first.
