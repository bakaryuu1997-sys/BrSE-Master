import os
import sqlite3
import subprocess
import sys


def test_todo_evidences_json_migration_adds_missing_column(tmp_path):
    db_path = tmp_path / "todo_old.db"
    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            "CREATE TABLE brse_todo_items ("
            "id VARCHAR(160) PRIMARY KEY, "
            "title VARCHAR(320) NOT NULL"
            ")"
        )
        connection.commit()
    finally:
        connection.close()

    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{db_path}",
    }
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "stamp", "20260531_0001"],
        check=True,
        env=env,
    )
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        check=True,
        env=env,
    )

    connection = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(brse_todo_items)")}
    finally:
        connection.close()

    assert "evidences_json" in columns


def test_project_settings_migration_adds_profile_columns(tmp_path):
    db_path = tmp_path / "project_old.db"
    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            "CREATE TABLE project_setting_records ("
            "id VARCHAR(36) PRIMARY KEY, "
            "name VARCHAR(160) NOT NULL"
            ")"
        )
        connection.commit()
    finally:
        connection.close()

    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{db_path}",
    }
    # Run from base (no stamp): the baseline create_all builds every other table
    # while the pre-existing legacy project_setting_records is left untouched, so
    # migration 0004 is what backfills the profile columns. This mirrors the
    # real "legacy un-stamped database" startup path.
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        check=True,
        env=env,
    )

    connection = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(project_setting_records)")}
    finally:
        connection.close()

    assert {
        "current_phase",
        "health_status",
        "next_milestone_date",
        "stakeholders_json",
        "integrations_json",
    } <= columns
