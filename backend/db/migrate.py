"""Tiny startup migration: add columns that were introduced after the table was first created.

Base.metadata.create_all() creates missing tables but never adds columns to existing ones.
Each entry is (table, column, SQL type). Safe to run on every startup.
"""
from sqlalchemy import inspect, text

NEW_COLUMNS = [
    ("cases", "attested_at", "TIMESTAMP"),
    ("documents", "sent_at", "TIMESTAMP"),
]


def ensure_columns(engine) -> None:
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    for table, column, ddl in NEW_COLUMNS:
        if table not in tables:
            continue
        existing = {c["name"] for c in insp.get_columns(table)}
        if column not in existing:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
