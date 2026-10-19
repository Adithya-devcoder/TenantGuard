"""
backend/tests/conftest.py
Shared pytest fixtures.

DATABASE STRATEGY
-----------------
All tests here use an in-memory SQLite database. This is an explicit design
decision so tests can run without a PostgreSQL instance.

Tests that specifically exercise PostgreSQL behaviour (RLS, server-side
defaults, etc.) would be marked with @pytest.mark.requires_postgres.
No such tests exist yet — all current tests run against SQLite.
"""
from __future__ import annotations

import os
import sys

# ── Path setup — must happen before any app import ────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND_DIR)
for _p in [BACKEND_DIR, REPO_ROOT]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Override config env vars before pydantic-settings reads them
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only-x32"  # 36 bytes
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["TENANT_A_DEMO_PASSWORD"] = "TestPassA!99"
os.environ["TENANT_B_DEMO_PASSWORD"] = "TestPassB!99"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

import pytest
from sqlalchemy import StaticPool, create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db import session as db_session
from app.db.session import Base
# Import all models so they register with Base.metadata
from app.models.invoice import Invoice  # noqa: F401
from app.models.scan_report import ScanReport  # noqa: F401
from app.models.tenant import Tenant  # noqa: F401
from app.models.user import User  # noqa: F401


# ── Create a single shared in-memory SQLite engine for the whole session ──────

_TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,   # single shared connection — keeps :memory: alive
    echo=False,
)

@event.listens_for(_TEST_ENGINE, "connect")
def _set_sqlite_pragma(dbapi_conn, _record):
    """Enable FK enforcement in SQLite."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

_TestSessionLocal = sessionmaker(bind=_TEST_ENGINE, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Create all tables once for the session, then point the app at this engine.
    Using autouse=True guarantees this runs before any other fixture.
    """
    # Redirect the module-level engine used by the app
    db_session._engine = _TEST_ENGINE
    db_session.SessionLocal = _TestSessionLocal

    Base.metadata.create_all(bind=_TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=_TEST_ENGINE)


@pytest.fixture(scope="session")
def seed_db(setup_test_db):
    """Insert demo tenants, users, and invoices once for the whole session."""
    db = _TestSessionLocal()
    try:
        tenant_a = Tenant(name="Tenant Alpha")
        tenant_b = Tenant(name="Tenant Beta")
        db.add_all([tenant_a, tenant_b])
        db.flush()

        user_a = User(
            tenant_id=tenant_a.id,
            username="tenant_a_user",
            hashed_password=hash_password("TestPassA!99"),
        )
        user_b = User(
            tenant_id=tenant_b.id,
            username="tenant_b_user",
            hashed_password=hash_password("TestPassB!99"),
        )
        db.add_all([user_a, user_b])
        db.flush()

        db.add_all([
            Invoice(id=101, tenant_id=tenant_a.id, description="Invoice A Q4",       amount=1500.00),
            Invoice(id=102, tenant_id=tenant_a.id, description="Invoice A Support",  amount=750.00),
            Invoice(id=202, tenant_id=tenant_b.id, description="Invoice B Q4",       amount=3200.00),
            Invoice(id=203, tenant_id=tenant_b.id, description="Invoice B Consult",  amount=1100.00),
        ])
        db.commit()

        yield {
            "tenant_a_id": tenant_a.id,
            "tenant_b_id": tenant_b.id,
            "user_a_id": user_a.id,
            "user_b_id": user_b.id,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@pytest.fixture(scope="session")
def test_client(seed_db):
    """
    FastAPI TestClient wired to the same in-memory SQLite database.
    The app's get_db() uses db_session.SessionLocal, which we redirected
    to _TestSessionLocal above.
    """
    from app.main import app
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client


@pytest.fixture(scope="session")
def token_a(test_client):
    resp = test_client.post(
        "/auth/login",
        json={"username": "tenant_a_user", "password": "TestPassA!99"},
    )
    assert resp.status_code == 200, f"Login A failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def token_b(test_client):
    resp = test_client.post(
        "/auth/login",
        json={"username": "tenant_b_user", "password": "TestPassB!99"},
    )
    assert resp.status_code == 200, f"Login B failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers_a(token_a):
    return {"Authorization": f"Bearer {token_a}"}


@pytest.fixture
def auth_headers_b(token_b):
    return {"Authorization": f"Bearer {token_b}"}
