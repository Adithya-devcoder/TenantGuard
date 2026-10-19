"""
backend/app/db/session.py
SQLAlchemy engine and session factory.

The DATABASE_URL is read from the environment (or .env file).
Tests can override it by setting the env var before importing this module,
or by calling override_engine() directly from a conftest fixture.
"""
from __future__ import annotations

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────

def _build_engine(url: str):
    """Create an SQLAlchemy engine from the given URL."""
    connect_args: dict = {}

    if url.startswith("sqlite"):
        # SQLite: needed for in-memory test databases
        connect_args["check_same_thread"] = False

    return create_engine(
        url,
        pool_pre_ping=True,       # check connection health before use
        echo=False,               # set True for SQL debug logging
        connect_args=connect_args,
    )


_engine = _build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


def override_engine(url: str) -> None:
    """
    Replace the module-level engine and session factory.
    Called by test fixtures to redirect to an in-memory SQLite database
    without touching the real PostgreSQL instance.
    """
    global _engine, SessionLocal
    _engine = _build_engine(url)
    SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


def get_engine():
    """Return the current SQLAlchemy engine (useful for create_all in tests)."""
    return _engine


# ── Base declarative class ────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """All ORM models inherit from this base class."""
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db():
    """
    FastAPI dependency that yields a database session and guarantees cleanup.

    Usage in route:
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Health check helper ───────────────────────────────────────────────────────

def ping_db() -> bool:
    """Return True when the database is reachable. Never raises."""
    try:
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
